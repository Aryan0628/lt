import sys
import json
import os
import ee
import datetime
from google.oauth2 import service_account

# --- CONFIGURATION ---
DEFAULT_DAYS_BACK = 5
DEFAULT_BUFFER = 5000
GCP_PROJECT_ID = 'certain-acre-482416-b7'

FIRE_COLLECTION = 'FIRMS'  
LST_COLLECTION = 'MODIS/061/MOD11A1' 
LANDCOVER_COLLECTION = 'ESA/WorldCover/v100/2020'

def initialize_gee(credentials_path_arg):
    try:
        if not credentials_path_arg or not os.path.exists(credentials_path_arg):
            return False
        credentials = service_account.Credentials.from_service_account_file(credentials_path_arg)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        ee.Initialize(credentials=scoped_credentials, project=GCP_PROJECT_ID, opt_url='https://earthengine-highvolume.googleapis.com')
        return True
    except Exception:
        return False

def get_image_url(image, region, params):
    try:
        return image.getThumbURL({
            'min': params.get('min', 0),
            'max': params.get('max', 1),
            'palette': params.get('palette', ['black', 'white']),
            'dimensions': 512,
            'region': region,
            'format': 'png'
        })
    except Exception:
        return None

def detect_active_fires(region_geometry, days_back):
    
    end_date = ee.Date(datetime.datetime.now(datetime.timezone.utc))
    start_date = end_date.advance(-days_back, 'day')
    
    date_info = {
        "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
        "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
    }

    try:
        dataset = ee.ImageCollection(FIRE_COLLECTION) \
            .filterDate(start_date, end_date) \
            .filterBounds(region_geometry)

        temp_max = dataset.select('T21').max().clip(region_geometry).unmask(0)
        conf_max = dataset.select('confidence').max().clip(region_geometry).unmask(0)

        wc = ee.Image(LANDCOVER_COLLECTION).select('Map')
        industrial_mask = wc.neq(50)  # Class 50 = Built-up

        valid_fire_mask = conf_max.gt(90).Or(
            conf_max.gt(40).And(temp_max.gt(330.0))
        )
        final_mask = valid_fire_mask.And(industrial_mask)
        fire_clean = temp_max.updateMask(final_mask)

        stats = fire_clean.gt(0).reduceRegion(
            reducer=ee.Reducer.count(),
            geometry=region_geometry,
            scale=1000, 
            maxPixels=1e9
        )
        pixel_count = stats.get('T21').getInfo() or 0 # Default to 0 if None
        
        # --- MODIFIED COLOUR GRADING START ---
        
        # 1. Fire Palette (Incandescent Style): 
        # Deep Red (Smoldering) -> Red -> Orange -> Yellow -> White (Intense Flaming)
        vis_fire = {
            "min": 330, 
            "max": 400, 
            "palette": ['500000', 'ff0000', 'ff8000', 'ffff00', 'ffffff']
        }
        
        # 2. Safe/Background Palette (Deep Thermal Blue):
        # Black (Cold Ground) -> Navy -> Blue -> Cyan -> White (Hot Surface/Concrete)
        # Wider range (280-325K) ensures we see texture in the ground instead of flat blue.
        vis_safe = {
            "min": 280, 
            "max": 325, 
            "palette": ['000000', '000040', '0000ff', '0080ff', '00ffff', 'ffffff']
        }
        # --- MODIFIED COLOUR GRADING END ---

        hist_start = start_date.advance(-1, 'year')
        hist_end = end_date.advance(-1, 'year')
        hist_lst = ee.ImageCollection(LST_COLLECTION) \
            .filterDate(hist_start, hist_end) \
            .filterBounds(region_geometry) \
            .select('LST_Day_1km') \
            .mean() \
            .clip(region_geometry) \
            .multiply(0.02) 
        
        start_url = get_image_url(hist_lst, region_geometry, vis_safe)

        if pixel_count > 0:
            # If fire exists, show the fire layer on top (masked)
            end_url = get_image_url(fire_clean, region_geometry, vis_fire)
        else:
            # If no fire, show the current Land Surface Temperature with the detailed Blue gradient
            curr_lst = ee.ImageCollection(LST_COLLECTION) \
                .filterDate(start_date.advance(-10, 'day'), end_date) \
                .filterBounds(region_geometry) \
                .select('LST_Day_1km') \
                .mean() \
                .clip(region_geometry) \
                .multiply(0.02)
            end_url = get_image_url(curr_lst, region_geometry, vis_safe)

        fires_list = []
        if pixel_count > 0:
            vectors = fire_clean.addBands(temp_max).reduceToVectors(
                geometry=region_geometry,
                scale=1000,
                maxPixels=1e8,
                reducer=ee.Reducer.max(), 
                bestEffort=True
            )
            
            features = vectors.getInfo()['features']
            for feat in features[:50]: 
                props = feat['properties']
                temp_k = props.get('max', 0) 
                
                geom = ee.Geometry(feat['geometry']).centroid().coordinates().getInfo()
                
                intensity = "Moderate"
                if temp_k > 350: intensity = "Severe"
                elif temp_k < 330: intensity = "Smoldering"

                fires_list.append({
                    "temp_c": round(temp_k - 273.15, 1),
                    "intensity": intensity,
                    "lat": geom[1],
                    "lng": geom[0]
                })

        return {
            "status": "success",
            "message": "Fire scan complete",
            "alert_triggered": pixel_count > 0, 
            "active_fire_count": pixel_count,
            "fires": fires_list,
            "start_image_url": start_url,
            "end_image_url": end_url,
            "dates": date_info,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "alert_triggered": False,
            "dates": date_info
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2: raise ValueError("Missing credentials")
        credentials_path = sys.argv[1]
        
        input_data = json.loads(sys.stdin.read())

        days = int(input_data.get('previousDays', DEFAULT_DAYS_BACK))
        buffer = int(input_data.get('buffermeters', DEFAULT_BUFFER))
        
        region_geo = input_data.get('regionGeoJson', input_data.get('geometry')) 
        region_id = input_data.get('region_id')
        
        if not initialize_gee(credentials_path):
            print(json.dumps({"status": "error", "message": "GEE Auth Failed"}))
            sys.exit(1)
            
        coords = region_geo.get('coordinates')
        g_type = region_geo.get('type')
        
        if g_type == 'Point':
            ee_geom = ee.Geometry.Point(coords).buffer(buffer)
        elif g_type == 'Polygon':
            ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon':
            ee_geom = ee.Geometry.MultiPolygon(coords)
        else:
            raise ValueError(f"Unknown Geometry: {g_type}")
            
        result = detect_active_fires(ee_geom, days)
        result['region_id'] = region_id
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e),"region_id": "unknown" }))
        sys.exit(1)