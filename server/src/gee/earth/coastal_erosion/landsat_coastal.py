import sys
import json
import os
import ee
import traceback

gcp_project_id = 'certain-acre-482416-b7'

def initialize_gee(credentials_path_arg):
    global gcp_project_id
    try:
        credentials_path = credentials_path_arg
        if not credentials_path or not os.path.exists(credentials_path):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        credentials = ee.ServiceAccountCredentials(None, key_file=credentials_path)
        ee.Initialize(credentials=credentials, project=gcp_project_id, opt_url='https://earthengine-highvolume.googleapis.com')
        return True
    except Exception as e:
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def get_image_url(image, region, vis_params, label):
    try:
        return image.getThumbURL({
            'min': vis_params.get('min', 0), 
            'max': vis_params.get('max', 1), 
            'palette': vis_params.get('palette', None), # Added palette support
            'dimensions': 512, 
            'region': region, 
            'format': 'png'
        })
    except Exception as e:
        print(f"WARNING: Thumbnail failed for {label}: {e}", file=sys.stderr)
        return None

# --- DYNAMIC SATELLITE SELECTION ---
def get_collection_info(year):
    if year >= 2013:
        return {
            'id': 'LANDSAT/LC08/C02/T1_L2',
            'green': 'SR_B3',
            'swir': 'SR_B6',
            'cloud_filter_max': 20
        }
    else:
        return {
            'id': 'LANDSAT/LE07/C02/T1_L2',
            'green': 'SR_B2',
            'swir': 'SR_B5',
            'cloud_filter_max': 20
        }

def calculate_mndwi(image, bands):
    mndwi = image.normalizedDifference([bands['green'], bands['swir']]).rename('mndwi')
    return image.addBands(mndwi)

def get_yearly_composite(year, region_geometry):
    config = get_collection_info(year)
    start_date = f'{year}-01-01'
    end_date = f'{year}-12-31'
    
    col = ee.ImageCollection(config['id']) \
        .filterBounds(region_geometry) \
        .filterDate(start_date, end_date) \
        .filter(ee.Filter.lt('CLOUD_COVER', config['cloud_filter_max']))
    
    if col.size().getInfo() == 0:
        return None
        
    processed = col.map(lambda img: calculate_mndwi(img, config))
    return processed.select('mndwi').median().clip(region_geometry)

def analyze_erosion(region_geometry, historic_year, current_year):
    try:
        hist_img = get_yearly_composite(historic_year, region_geometry)
        curr_img = get_yearly_composite(current_year, region_geometry)

        if hist_img is None:
            return {"status": "error", "message": f"No clear satellite data found for historic year {historic_year}"}
        
        if curr_img is None:
            return {"status": "error", "message": f"No clear satellite data found for current year {current_year}"}

        WATER_THRESHOLD = 0.1
        # Create binary masks (1=Water, 0=Land)
        hist_water = hist_img.gt(WATER_THRESHOLD).unmask(0)
        curr_water = curr_img.gt(WATER_THRESHOLD).unmask(0)

        # 4. CALCULATE EROSION (Area Difference)
        def get_water_area(water_binary_img):
            stats = water_binary_img.multiply(ee.Image.pixelArea()).reduceRegion(
                reducer=ee.Reducer.sum(), 
                geometry=region_geometry, 
                scale=30,
                maxPixels=1e9
            )
            return stats.get('mndwi').getInfo()

        area_hist_sqm = get_water_area(hist_water)
        area_curr_sqm = get_water_area(curr_water)
        
        if area_hist_sqm is None: area_hist_sqm = 0
        if area_curr_sqm is None: area_curr_sqm = 0

        water_increase_sqm = area_curr_sqm - area_hist_sqm
        land_change_hectares = (water_increase_sqm / 10000.0) * -1 # Negative = Loss

        status_msg = "Stable"
        if land_change_hectares < -2: status_msg = "Severe Erosion"
        elif land_change_hectares > 2: status_msg = "Accretion (New Land)"

        print(f"UrbanFlow Coastal Check: Change = {land_change_hectares:.2f} Ha ({historic_year}-{current_year})", file=sys.stderr)

        # --- MODIFIED VISUALIZATION LOGIC ---
        # We classify pixels into 4 distinct categories using math:
        # Formula: Class = Current + (Historic * 2)
        
        # 0 + (0 * 2) = 0: Stable Land   (Land Then, Land Now)
        # 1 + (0 * 2) = 1: Erosion       (Land Then, Water Now)
        # 0 + (1 * 2) = 2: Accretion     (Water Then, Land Now)
        # 1 + (1 * 2) = 3: Stable Water  (Water Then, Water Now)

        classified_img = curr_water.add(hist_water.multiply(2))

        # Define Palette corresponding to indices [0, 1, 2, 3]
        vis_params = {
            'min': 0,
            'max': 3,
            'palette': [
                '#E0E0E0',  # 0: Stable Land (Light Gray - Context)
                '#FF0000',  # 1: Erosion (Red - Danger)
                '#00FF00',  # 2: Accretion (Green - New Land)
                '#004b8d'   # 3: Stable Water (Deep Blue - Clarity)
            ]
        }

        vis_url = get_image_url(classified_img, region_geometry, vis_params, "change_map")
        # --- END MODIFICATION ---

        return {
            "status": "success",
            "message": status_msg,
            "net_land_change_hectares": round(land_change_hectares, 2),
            "erosion_detected": land_change_hectares < -1.0, 
            "comparison_years": f"{historic_year} vs {current_year}",
            "visualization_url": vis_url
        }

    except Exception as e:
        print(f"ERROR: Script Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geom = params['geometry']
        region_id = params.get('region_id', 'unknown')
        h_year = params.get('historic_year', 2000)
        c_year = params.get('current_year', 2024)
    except:
        print(json.dumps({"status": "error", "message": "Invalid Input JSON"}))
        sys.exit(1)

    if not initialize_gee(credentials):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    try:
        coords = geom['coordinates']
        type = geom['type']
        if type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        else: ee_geom = ee.Geometry.Point(coords).buffer(3000) 
    except:
        print(json.dumps({"status": "error", "message": "Geometry Error"}))
        sys.exit(1)

    result = analyze_erosion(ee_geom, h_year, c_year)
    result['region_id'] = region_id
    print(json.dumps(result))