import sys
import json
import os
import ee
import datetime
import traceback
from google.oauth2 import service_account

GCP_PROJECT_ID = 'certain-acre-482416-b7'

# Defaults
DEFAULT_FLOOD_ALERT_THRESHOLD_PERCENT = 5.0
DEFAULT_RECENT_FLOOD_PERIOD_DAYS = 10 
BASELINE_PERIOD_OFFSET_YEARS = 1
BASELINE_PERIOD_DURATION_DAYS = 30

S1_COLLECTION = 'COPERNICUS/S1_GRD'
S1_POLARIZATION = 'VV' 
S1_INSTRUMENT_MODE = 'IW'
WATER_THRESHOLD_DB = -16 
REDUCTION_SCALE_S1 = 20
DEFAULT_POINT_BUFFER = 1000

def initialize_gee(credentials_path_arg):
    try:
        if not credentials_path_arg or not os.path.exists(credentials_path_arg):
            print(f"ERROR: Credentials file not found.", file=sys.stderr)
            return False
        
        credentials = service_account.Credentials.from_service_account_file(credentials_path_arg)
        scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/earthengine'])
        ee.Initialize(credentials=scoped_credentials, project=GCP_PROJECT_ID, opt_url='https://earthengine-highvolume.googleapis.com')
        return True
    except Exception as e:
        print(f"ERROR: GEE Init Failed: {e}", file=sys.stderr)
        return False

def smooth_radar(image):
    return image.focal_median(50, 'circle', 'meters')

def apply_water_threshold(image):
    smoothed = smooth_radar(image)
    water = smoothed.select(S1_POLARIZATION).lt(WATER_THRESHOLD_DB).rename('water')
    return water.copyProperties(image, ['system:time_start'])

def get_flood_image_url(image, region_geometry, vis_params, label):
    try:
        # UPDATED: Only apply min/max/palette if they are provided. 
        # This allows passing pre-visualized RGB images (composites) without error.
        params = {
            'dimensions': 512,
            'region': region_geometry,
            'format': 'png'
        }
        if vis_params:
            if 'min' in vis_params: params['min'] = vis_params['min']
            if 'max' in vis_params: params['max'] = vis_params['max']
            if 'palette' in vis_params: params['palette'] = vis_params['palette']

        return image.getThumbURL(params)
    except Exception as e:
        print(f"WARNING: Thumbnail failed for {label}: {e}", file=sys.stderr)
        return None

def check_flooding(region_geometry, threshold_percent, buffer_radius_meters, recent_days):
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        end_date_recent = ee.Date(now)
        start_date_recent = end_date_recent.advance(-recent_days, 'day')

        end_date_baseline = end_date_recent.advance(-BASELINE_PERIOD_OFFSET_YEARS, 'year')
        start_date_baseline = end_date_baseline.advance(-BASELINE_PERIOD_DURATION_DAYS, 'day')

        s1_collection = ee.ImageCollection(S1_COLLECTION) \
            .filter(ee.Filter.eq('instrumentMode', S1_INSTRUMENT_MODE)) \
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', S1_POLARIZATION)) \
            .filterBounds(region_geometry) \
            .select(S1_POLARIZATION)

        recent_s1 = s1_collection.filterDate(start_date_recent, end_date_recent)
        baseline_s1 = s1_collection.filterDate(start_date_baseline, end_date_baseline)

        count = recent_s1.size().getInfo()
        if count == 0:
            return {
                "status": "success", 
                "message": f"No Sentinel-1 pass in last {recent_days} days.", 
                "alert_triggered": False,
                "flooded_area_sqkm": 0,
                "flooded_percentage": 0,
                "total_area_sqkm": 0,
                "threshold_percent":threshold_percent,
                "start_image_url":None, 
                "end_image_url": None,      
                "dates": {
                    "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
                    "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo(),
                }
            }
        
        # Calculate Water Masks
        recent_water = recent_s1.map(apply_water_threshold).median().gt(0.5).clip(region_geometry)
        baseline_water = baseline_s1.map(apply_water_threshold).median().gt(0.5).clip(region_geometry)
        flood_mask = recent_water.subtract(baseline_water).gt(0).rename('flood_water').selfMask()

        # Stats Calculation
        pixel_area = ee.Image.pixelArea().divide(1e6) 
        flood_stats = flood_mask.multiply(pixel_area).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region_geometry,
            scale=REDUCTION_SCALE_S1,
            maxPixels=1e9,
            bestEffort=True
        )
        total_stats = pixel_area.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region_geometry,
            scale=REDUCTION_SCALE_S1,
            maxPixels=1e9,
            bestEffort=True
        )

        flooded_sqkm = flood_stats.get('flood_water').getInfo()
        total_sqkm = total_stats.get('area').getInfo()

        if flooded_sqkm is None: flooded_sqkm = 0.0
        if total_sqkm is None: total_sqkm = 0.0

        flooded_percentage = (flooded_sqkm / total_sqkm * 100) if total_sqkm > 0 else 0
        alert_triggered = flooded_percentage > threshold_percent

        print(f"UrbanFlow Flood Check: {flooded_sqkm:.4f} km2 detected ({flooded_percentage:.2f}%)", file=sys.stderr)

        # --- IMPROVED VISUALIZATION START ---
        
        # 1. Baseline Image (Radar Only)
        # Use Black->White palette for Radar Intensity (dB).
        # Dark pixels = Smooth surfaces (Water/Roads). Bright pixels = Rough surfaces (Urban/Veg).
        baseline_radar_img = baseline_s1.median().clip(region_geometry)
        baseline_url = get_flood_image_url(
            baseline_radar_img, 
            region_geometry, 
            {'min': -25, 'max': 0, 'palette': ['000000', 'ffffff']}, 
            "radar_base"
        )

        # 2. Flood Map (Radar Context + Cyan Overlay)
        # Background: Recent Radar (Greyscale)
        recent_radar_img = recent_s1.median().clip(region_geometry)
        bg_layer = recent_radar_img.visualize(min=-25, max=0, palette=['000000', 'ffffff'])
        
        # Foreground: Flood Water (Neon Cyan)
        fg_layer = flood_mask.visualize(palette=['00ffff'])
        
        # Composite: Blend Cyan Flood on top of Greyscale Land
        composite_flood_img = bg_layer.blend(fg_layer)
        
        flood_url = get_flood_image_url(composite_flood_img, region_geometry, {}, "flood_map")
        
        # --- IMPROVED VISUALIZATION END ---

        return {
            "status": "success",
            "alert_triggered": alert_triggered,
            "flooded_area_sqkm": round(flooded_sqkm, 3),
            "flooded_percentage": round(flooded_percentage, 2),
            "total_area_sqkm": round(total_sqkm, 3),
            "threshold_percent": threshold_percent,
            "start_image_url": baseline_url, 
            "end_image_url": flood_url,      
            "dates": {
               "scan_window_start": start_date_recent.format('YYYY-MM-dd').getInfo(),
                "scan_window_end": end_date_recent.format('YYYY-MM-dd').getInfo(),
            }
        }

    except ee.EEException as e:
        print(f"ERROR: GEE Error: {e}", file=sys.stderr)
        return {"status": "error", "message": f"GEE Error: {str(e)}"}
    except Exception as e:
        print(f"ERROR: Script Error: {e}", file=sys.stderr)
        return {"status": "error", "message": f"Script Error: {str(e)}"}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing credentials arg"}))
        sys.exit(1)
    
    credentials_path = sys.argv[1]
    input_str = sys.stdin.read()
    
    try:
        params = json.loads(input_str)
        geojson = params['geometry']
        threshold = float(params.get('threshold_percent', DEFAULT_FLOOD_ALERT_THRESHOLD_PERCENT))
        region_id = params.get('region_id', 'unknown')
        buffer_radius = int(params.get('buffer_meters', DEFAULT_POINT_BUFFER))
        recent_days = int(params.get('recent_days', DEFAULT_RECENT_FLOOD_PERIOD_DAYS))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Input Error: {e}"}))
        sys.exit(1)

    if not initialize_gee(credentials_path):
        print(json.dumps({"status": "error", "message": "GEE Init Failed"}))
        sys.exit(1)

    try:
        g_type = geojson.get('type')
        coords = geojson.get('coordinates')
        if g_type == 'Polygon': ee_geom = ee.Geometry.Polygon(coords)
        elif g_type == 'MultiPolygon': ee_geom = ee.Geometry.MultiPolygon(coords)
        elif g_type == 'Point': ee_geom = ee.Geometry.Point(coords).buffer(buffer_radius)
        else: raise ValueError(f"Unknown Type: {g_type}")
    except Exception as e:
         print(json.dumps({"status": "error", "message": f"Geometry Error: {e}"}))
         sys.exit(1)

    print(f"Starting UrbanFlow Flood Analysis for {region_id} (Lookback: {recent_days} days)...", file=sys.stderr)
    
    result = check_flooding(ee_geom, threshold, buffer_radius, recent_days)
    
    result['region_id'] = region_id
    print(json.dumps(result))