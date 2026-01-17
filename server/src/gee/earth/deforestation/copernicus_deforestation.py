import sys
import json
import os
import ee
import datetime
from google.oauth2 import service_account

# --- CONFIGURATION ---
GCP_PROJECT_ID = 'certain-acre-482416-b7' 
DEFAULT_RECENT_LOOKBACK = 6      
DEFAULT_BASELINE_WINDOW = 90   
DEFAULT_NDVI_DROP_THRESHOLD = -0.15 
DEFAULT_POINT_BUFFER = 1000
REDUCTION_SCALE = 20
SATELLITE_COLLECTION = 'COPERNICUS/S2_SR_HARMONIZED'

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

def get_clean_s2_composite(region, start_date, end_date):
    def add_ndvi_and_mask(img):
        scl = img.select('SCL')
        mask = scl.remap([3, 8, 9, 10, 11], [0, 0, 0, 0, 0], defaultValue=1)
        ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return img.updateMask(mask).addBands(ndvi)

    collection = ee.ImageCollection(SATELLITE_COLLECTION) \
        .filterBounds(region) \
        .filterDate(start_date, end_date) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60)) \
        .map(add_ndvi_and_mask) \
        .select('NDVI')

    return collection.max().clip(region)

def get_thumbnail_url(image, region, params):
    try:
        return image.getThumbURL({
            'min': params.get('min', 0),
            'max': params.get('max', 0.8),
            'palette': params.get('palette', ['red', 'yellow', 'green']),
            'dimensions': 512,
            'region': region,
            'format': 'png'
        })
    except Exception:
        return None

def check_deforestation(region_geometry, threshold, lookback_days):

    end_date_recent = ee.Date(datetime.datetime.now(datetime.timezone.utc))
    start_date_recent = end_date_recent.advance(-lookback_days, 'day')
    end_date_baseline = start_date_recent
    start_date_baseline = end_date_baseline.advance(-DEFAULT_BASELINE_WINDOW, 'day')

    date_info = {
        "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
        "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo()
    }

    try:
        recent_ndvi = get_clean_s2_composite(region_geometry, start_date_recent, end_date_recent)
        
        baseline_ndvi = ee.ImageCollection(SATELLITE_COLLECTION) \
            .filterBounds(region_geometry) \
            .filterDate(start_date_baseline, end_date_baseline) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60)) \
            .map(lambda img: img.updateMask(img.select('SCL').remap([3, 8, 9, 10, 11], [0, 0, 0, 0, 0], 1))) \
            .map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI')) \
            .select('NDVI') \
            .median() \
            .clip(region_geometry)

        # --- CALCULATE ---
        ndvi_diff = recent_ndvi.subtract(baseline_ndvi)
        
        stats = ndvi_diff.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region_geometry,
            scale=REDUCTION_SCALE,
            maxPixels=1e9,
            bestEffort=True
        )
        
        mean_change = stats.get('NDVI').getInfo()

        
        if mean_change is None:
             return {
                 "status": "success", 
                 "message": f"Area obscured by clouds or no pass in last {lookback_days} days.", 
                 "alert_triggered": False,
                 "mean_ndvi_change": 0.0,     
                 "threshold": threshold,
                 "start_image_url": None,     
                 "end_image_url": None,       
                 "change_image_url": None,     
                 "dates": date_info            
             }

        
        alert_triggered = mean_change < threshold

        vis_ndvi = {'min': 0, 'max': 0.8, 'palette': ['#d7191c', '#ffffbf', '#1a9641']}
        
        # --- MODIFIED SECTION: SHORT RANGE GRADIENT ---
        vis_loss = {
            'min': -0.6, 
            'max': threshold, 
            'palette': ['300000', '8b0000', 'ff0000', 'ff8c00'] # Dark Red -> Red -> Orange
        }

        start_url = get_thumbnail_url(baseline_ndvi, region_geometry, vis_ndvi)
        end_url = get_thumbnail_url(recent_ndvi, region_geometry, vis_ndvi)
        
        # Use updated mask logic to show gradient instead of flat binary mask
        severity_layer = ndvi_diff.updateMask(ndvi_diff.lt(threshold))
        change_url = get_thumbnail_url(severity_layer, region_geometry, vis_loss)
        # --- END MODIFIED SECTION ---

        return {
            "status": "success",
            "message": "Analysis successful",  
            "alert_triggered": alert_triggered,
            "mean_ndvi_change": round(mean_change, 4),
            "threshold": threshold,
            "start_image_url": start_url,
            "end_image_url": end_url,
            "change_image_url": change_url,
            "dates": date_info
        }

    except ee.EEException as e:
        
        return {
            "status": "error", 
            "message": f"GEE Error: {str(e)}",
            "alert_triggered": False,
            "mean_ndvi_change": 0.0,
            "threshold": threshold,
            "start_image_url": None,
            "end_image_url": None,
            "change_image_url": None,
            "dates": date_info
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": str(e),
            "alert_triggered": False,
            "mean_ndvi_change": 0.0,
            "threshold": threshold,
            "start_image_url": None,
            "end_image_url": None,
            "change_image_url": None,
            "dates": date_info
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2: raise ValueError("Missing Credentials Path")
        credentials_path = sys.argv[1]
        
        input_data = json.loads(sys.stdin.read())
        
        region_geo = input_data.get('geometry', {})
        region_id = input_data.get('region_id', 'unknown')
        threshold = float(input_data.get('threshold', DEFAULT_NDVI_DROP_THRESHOLD))
        lookback = int(input_data.get('previous_days', DEFAULT_RECENT_LOOKBACK))
        buffer = int(input_data.get('buffer_meters', DEFAULT_POINT_BUFFER))

        if not initialize_gee(credentials_path):
            print(json.dumps({"status": "error", "message": "GEE Authentication Failed"}))
            sys.exit(1)

        g_type = region_geo.get('type')
        coords = region_geo.get('coordinates')
        
        if g_type == 'Point':
            ee_geom = ee.Geometry.Point(coords).buffer(buffer)
        elif g_type == 'Polygon':
            ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon':
            ee_geom = ee.Geometry.MultiPolygon(coords)
        else:
            raise ValueError(f"Unsupported geometry: {g_type}")

        result = check_deforestation(ee_geom, threshold, lookback)
        result['region_id'] = region_id
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "status": "error", 
            "message": str(e),
            "region_id": "unknown"
        }))
        sys.exit(1)