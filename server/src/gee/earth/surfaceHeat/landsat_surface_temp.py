import sys
import json
import os
import ee
import datetime
import traceback
from google.oauth2 import service_account

GCP_PROJECT_ID = 'certain-acre-482416-b7'

# Look back 16 days (Landsat revisit cycle is 16 days)
RECENT_PERIOD_DAYS = 16
DEFAULT_TEMP_THRESHOLD = 40.0  # Celsius
DEFAULT_BUFFER = 5000

def initialize_gee(credentials_path_arg):
    try:
        credentials_path = credentials_path_arg
        if not credentials_path or not os.path.exists(credentials_path):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        
        ee.Initialize(
            credentials=scoped_credentials, 
            project=GCP_PROJECT_ID, 
            opt_url='https://earthengine-highvolume.googleapis.com'
        )
        return True
    except Exception as e:
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def get_heatmap_url(image, region_geometry, vis_params):
    try:
        return image.getThumbURL({
            'min': vis_params['min'], 
            'max': vis_params['max'], 
            'palette': vis_params['palette'],
            'dimensions': 600,
            'region': region_geometry, 
            'format': 'png'
        })
    except Exception as e:
        print(f"WARNING: Thumbnail generation failed: {e}", file=sys.stderr)
        return None
    

def check_heat_islands(region_geometry, threshold, recentDays):
    try:
        # 1. Define Time Window
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date = ee.Date(now)
        start_date = end_date.advance(-recentDays, 'day')

        # 2. Priority Switching Logic
        satellite_priority = [
            {"name": "Landsat 9", "id": "LANDSAT/LC09/C02/T1_L2"},
            {"name": "Landsat 8", "id": "LANDSAT/LC08/C02/T1_L2"}
        ]

        latest_image = None
        used_sat_name = None

        for sat in satellite_priority:
            print(f"UrbanFlow: Checking {sat['name']} ({sat['id']})...", file=sys.stderr)
            
            collection = (ee.ImageCollection(sat['id'])
                       .filterBounds(region_geometry)
                       .filterDate(start_date, end_date)
                       .filter(ee.Filter.lt('CLOUD_COVER', 100)) 
                       .select('ST_B10')) 

            count = collection.size().getInfo()
            
            if count > 0:
                latest_image = collection.sort('system:time_start', False).first()
                used_sat_name = sat['name']
                print(f"UrbanFlow: Found {count} images in {sat['name']}. Using latest.", file=sys.stderr)
                break
            else:
                print(f"UrbanFlow: No recent data found in {sat['name']}. Switching to next...", file=sys.stderr)

        if latest_image is None:
            return {
                "status": "success", 
                "message": f"No clear thermal data found.",
                "data_found": False,
                "heatmap_url": None
            }

        # 4. Get Metadata
        latest_info = latest_image.getInfo()
        latest_id = latest_info['id']
        latest_timestamp = latest_info['properties']['system:time_start']
        date_str = datetime.datetime.fromtimestamp(latest_timestamp / 1000.0, datetime.timezone.utc).strftime('%Y-%m-%d')
        
        # 5. Process Temperature (Kelvin -> Celsius)
        temp_celsius = latest_image.multiply(0.00341802).add(149.0).subtract(273.15)

        # 6. Statistics
        stats = temp_celsius.reduceRegion(
            reducer=ee.Reducer.max()
                .combine(reducer2=ee.Reducer.mean(), sharedInputs=True)
                .combine(reducer2=ee.Reducer.min(), sharedInputs=True),
            geometry=region_geometry,
            scale=30, 
            bestEffort=True,
            maxPixels=1e9
        )

        max_temp = stats.get('ST_B10_max').getInfo()
        mean_temp = stats.get('ST_B10_mean').getInfo()
        min_temp = stats.get('ST_B10_min').getInfo()

        if max_temp is None: 
            return {
                "status": "success", 
                "message": "Data exists but pixels masked.", 
                "data_found": True,
                "value_valid": False
            }
        
        print(f"UrbanFlow Result: Min={min_temp:.2f}, Mean={mean_temp:.2f}, Max={max_temp:.2f}", file=sys.stderr)

        # 7. Alert Logic
        alert_triggered = False
        status_label = "Normal"
        if max_temp > 48.0:
            status_label = "Extreme Heat Danger"
            alert_triggered  = True
        elif max_temp > threshold:
            status_label = "High Heat Warning"
            alert_triggered = True

        # 8. Visualization - ### UPDATED RANGE (-20 to 50) ###
        
        vis_params = {
            'min': -20,  # Coldest Reference
            'max': 50,   # Hottest Reference
            'palette': [
                '0000FF', # -20C (Deep Blue - Freezing)
                '00FFFF', # -2.5C (Cyan - Cold)
                '00FF00', # 15C (Green - Mild)
                'FFFF00', # 32.5C (Yellow - Warm)
                'FF0000'  # 50C (Red - Hot)
            ]
        }
        
        heatmap_url = get_heatmap_url(temp_celsius, region_geometry, vis_params)

        return {
            "status": "success",
            "data_found": True,
            "value_valid": True,
            "alert_triggered": alert_triggered,
            "heat_status": status_label,
            "max_temp_celsius": round(max_temp, 2),
            "mean_temp_celsius": round(mean_temp, 2),
            "min_temp_celsius": round(min_temp, 2),
            "threshold": threshold,
            "image_date": date_str,
            "satellite_source": used_sat_name,
            "latest_image_id": latest_id,
            "heatmap_url": heatmap_url,
            "dates": {
                "scan_window_start": start_date.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date.format('YYYY-MM-dd').getInfo()
            }
        }

    except Exception as e:
        print(f"ERROR: Logic Error: {e}", file=sys.stderr)
        return {"status": "error", "message": str(e)}

# --- MAIN EXECUTION BLOCK ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geojson = params['geometry']
        region_id = params.get('region_id', 'unknown')
        threshold = float(params.get('threshold', DEFAULT_TEMP_THRESHOLD))
        buffer_radius = int(params.get('buffer_meters', DEFAULT_BUFFER))
        recentDays = int(params.get('recentDays', RECENT_PERIOD_DAYS))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Input Parsing Error: {e}"}))
        sys.exit(1)

    if not initialize_gee(credentials_path):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    try:
        g_type = geojson.get('type')
        coords = geojson.get('coordinates')
        if g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(buffer_radius)
        elif g_type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        else: raise ValueError(f"Unknown Geometry: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting UrbanFlow Heat Check for {region_id}...", file=sys.stderr)
    result = check_heat_islands(ee_geom, threshold, recentDays)
    result['region_id'] = region_id
    print(json.dumps(result))