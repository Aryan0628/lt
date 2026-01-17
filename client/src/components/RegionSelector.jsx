import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DrawingManager } from '@react-google-maps/api';
import { Trash2, Loader2 } from 'lucide-react';

const LIBRARIES = ['drawing', 'places'];

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

// 1. DEFINE MAP STYLES TO HIDE PLACES/LABELS
const mapStyles = [
  {
    featureType: "poi", // Points of Interest (Businesses, attractions, etc.)
    elementType: "labels",
    stylers: [{ visibility: "off" }], // Hide them
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  // Optional: If you want to hide road labels too for a cleaner satellite look
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  }
];

export default function RegionSelector({ onRegionSelect }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [drawingMode, setDrawingMode] = useState(null);
  const [polygonPath, setPolygonPath] = useState([]);
  const polygonRef = useRef(null);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
    setDrawingMode('polygon');
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const onPolygonComplete = (polygon) => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    polygonRef.current = polygon;

    const path = polygon.getPath();
    const coordinates = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({ lat: point.lat(), lng: point.lng() });
    }

    setPolygonPath(coordinates);
    setDrawingMode(null);
    
    if (onRegionSelect) {
      onRegionSelect(coordinates);
    }
  };

  const handleClear = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    setPolygonPath([]);
    setDrawingMode('polygon');
    if (onRegionSelect) onRegionSelect(null);
  };

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-[2rem]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeId: 'hybrid', // 'hybrid' gives you satellite + borders (better context than pure satellite)
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: mapStyles, // <--- THIS REMOVES THE PLACES
        }}
      >
        <DrawingManager
          onPolygonComplete={onPolygonComplete}
          drawingMode={drawingMode}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: window.google.maps.ControlPosition.TOP_CENTER,
              drawingModes: ['polygon'],
            },
            polygonOptions: {
              fillColor: '#10b981',
              fillOpacity: 0.4,
              strokeWeight: 2,
              strokeColor: '#10b981',
              clickable: false,
              editable: true,
              zIndex: 1,
            },
          }}
        />
      </GoogleMap>

      {/* Floating Control Panel */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Selected Region Stats
        </h4>
        
        {polygonPath.length > 0 ? (
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-800">Area Selected</span>
             </div>
             <p className="text-xs text-slate-500">
               {polygonPath.length} coordinate points captured
             </p>
             <button 
                onClick={handleClear}
                className="flex items-center gap-2 text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors"
             >
                <Trash2 className="w-3 h-3" />
                Clear Selection
             </button>
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic">
            Use the tool above to draw a shape...
          </div>
        )}
      </div>
    </div>
  );
}
