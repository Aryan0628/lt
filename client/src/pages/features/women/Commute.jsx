import React, { useState, useEffect, useRef } from "react";
import { saveRouteToDatabase } from "./addingdata";
import { Map, Plus, Navigation, Bike, PersonStanding, Bus, Car, Edit2, ArrowRight } from "lucide-react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; 

const getConfiguration = (userLocation) => ({
  defaultTravelMode: "DRIVING", distanceMeasurementType: "METRIC",
  mapOptions: {
    center: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : { lat: 25.4529334, lng: 81.8348882 },
    fullscreenControl: false, mapTypeControl: false, streetViewControl: false, zoom: 14, zoomControl: true, maxZoom: 20,
    styles: [
        { elementType: "geometry", stylers: [{ color: "#212121" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
        { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
    ]
  },
});

const MARKER_ICON_COLORS = { active: { fill: "#dc2626", stroke: "#991b1b", label: "#FFF" }, inactive: { fill: "#3f3f46", stroke: "#27272a", label: "#a1a1aa" } };
const STROKE_COLORS = { active: { innerStroke: "#3b82f6", outerStroke: "#1e40af" }, inactive: { innerStroke: "#71717a", outerStroke: "#3f3f46" } };
const TravelMode = { DRIVING: "DRIVING", TRANSIT: "TRANSIT", BICYCLING: "BICYCLING", WALKING: "WALKING" };

const TravelModeIcon = ({ mode, className }) => {
  switch (mode) { case TravelMode.DRIVING: return <Car className={className} />; case TravelMode.TRANSIT: return <Bus className={className} />; case TravelMode.BICYCLING: return <Bike className={className} />; case TravelMode.WALKING: return <PersonStanding className={className} />; default: return <Car className={className} />; }
};

const Commutes = ({ onComplete, userLocation, user }) => { 
  const CONFIGURATION = getConfiguration(userLocation);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [activeDestinationIndex, setActiveDestinationIndex] = useState(null);
  
  // NOTE: selectedRouteData is technically redundant now with the fix below, but kept for compatibility
  const [selectedRouteData, setSelectedRouteData] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('ADD'); 
  const [modalError, setModalError] = useState('');
  const [destinationToAdd, setDestinationToAdd] = useState(null); 
  const [selectedTravelMode, setSelectedTravelMode] = useState(CONFIGURATION.defaultTravelMode);
  const [inputValue, setInputValue] = useState('');
  const mapRef = useRef(null); const mapInstanceRef = useRef(null); const bikeLayerRef = useRef(null); const transitLayerRef = useRef(null); const placesServiceRef = useRef(null); const directionsServiceRef = useRef(null); const autocompleteRef = useRef(null); const inputRef = useRef(null); const mapObjectsRef = useRef([]); 

  useEffect(() => {
    if (window.google) { setIsMapLoaded(true); return; }
    const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`; script.async = true; script.defer = true; script.onload = () => setIsMapLoaded(true); document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || mapInstanceRef.current) return;
    try {
      const map = new window.google.maps.Map(mapRef.current, CONFIGURATION.mapOptions); mapInstanceRef.current = map; bikeLayerRef.current = new window.google.maps.BicyclingLayer(); transitLayerRef.current = new window.google.maps.TransitLayer(); placesServiceRef.current = new window.google.maps.places.PlacesService(map); directionsServiceRef.current = new window.google.maps.DirectionsService(); createMarker(CONFIGURATION.mapOptions.center, undefined);
    } catch (error) { console.error("Map init error:", error); }
  }, [isMapLoaded]);

  const getNextMarkerLabel = () => '•'; 

  const createMarker = (location, label) => {
    if (!mapInstanceRef.current) return null;
    const isOrigin = label === undefined;
    if (isOrigin) {
      class UserPinOverlay extends window.google.maps.OverlayView {
        constructor(position, image) { super(); this.position = position; this.image = image; this.div = null; }
        onAdd() { this.div = document.createElement("div"); this.div.style.position = "absolute"; this.div.style.cursor = "pointer"; this.div.innerHTML = `<div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;"><img src="${this.image}" style="width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); object-fit: cover;" /><div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid white; margin-top: -2px;"></div></div>`; this.getPanes().overlayMouseTarget.appendChild(this.div); }
        draw() { const projection = this.getProjection(); if (!projection || !this.position) return; const point = projection.fromLatLngToDivPixel(this.position); if (this.div) { this.div.style.left = point.x + "px"; this.div.style.top = point.y + "px"; } }
        onRemove() { if (this.div) { this.div.parentNode.removeChild(this.div); this.div = null; } }
      }
      const userPhotoUrl = user?.profileurl || user?.picture || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
      const overlay = new UserPinOverlay(location, userPhotoUrl); overlay.setMap(mapInstanceRef.current); return overlay;
    } 
    let markerOptions = { position: location, map: mapInstanceRef.current };
    markerOptions.label = { text: label, fontFamily: 'Arial, sans-serif', color: MARKER_ICON_COLORS.active.label, fontSize: '24px', fontWeight: 'bold' };
    markerOptions.icon = { path: 'M10 27c-.2 0-.2 0-.5-1-.3-.8-.7-2-1.6-3.5-1-1.5-2-2.7-3-3.8-2.2-2.8-3.9-5-3.9-8.8C1 4.9 5 1 10 1s9 4 9 8.9c0 3.9-1.8 6-4 8.8-1 1.2-1.9 2.4-2.8 3.8-1 1.5-1.4 2.7-1.6 3.5-.3 1-.4 1-.6 1Z', fillOpacity: 1, strokeWeight: 1, anchor: new window.google.maps.Point(15, 29), scale: 1.2, labelOrigin: new window.google.maps.Point(10, 9), fillColor: MARKER_ICON_COLORS.active.fill, strokeColor: MARKER_ICON_COLORS.active.stroke };
    return new window.google.maps.Marker(markerOptions);
  };

  const setTravelModeLayer = (mode) => { if (!mapInstanceRef.current) return; bikeLayerRef.current.setMap(mode === TravelMode.BICYCLING ? mapInstanceRef.current : null); transitLayerRef.current.setMap(mode === TravelMode.TRANSIT ? mapInstanceRef.current : null); };

  const handleAddDestination = async (place, mode) => {
    if (!place || !place.geometry) { setModalError("Invalid place"); return; }
    const label = getNextMarkerLabel(destinations.length);
    
    const request = { origin: CONFIGURATION.mapOptions.center, destination: { placeId: place.place_id }, travelMode: mode, unitSystem: window.google.maps.UnitSystem.METRIC };
    try {
      const response = await directionsServiceRef.current.route(request); 
      const leg = response.routes[0].legs[0]; 
      
      // 1. Prepare Route Payload (Added end_address to fix Firebase error)
      const fullRouteData = { 
          destination_name: place.name, 
          destination_place_id: place.place_id, 
          end_address: leg.end_address || place.formatted_address || "Unknown Address", // FIX: Fallback added
          travel_mode: mode, 
          start_coords: { lat: leg.start_location.lat(), lng: leg.start_location.lng() }, 
          end_coords: { lat: leg.end_location.lat(), lng: leg.end_location.lng() }, 
          polyline: response.routes[0].overview_polyline, 
          created_at: new Date().toISOString() 
      };

      // 2. Store payload INSIDE destination config
      const destConfig = { 
          name: place.name, 
          place_id: place.place_id, 
          label, 
          travelModeEnum: mode,
          distance: leg.distance.text, 
          duration: leg.duration.text,
          routePayload: fullRouteData // FIX: Attached payload to this specific destination
      };

      const path = response.routes[0].overview_path; 
      const innerStroke = new window.google.maps.Polyline({ path, strokeColor: STROKE_COLORS.inactive.innerStroke, zIndex: 10, map: mapInstanceRef.current, strokeWeight: 3 }); 
      const outerStroke = new window.google.maps.Polyline({ path, strokeColor: STROKE_COLORS.inactive.outerStroke, zIndex: 1, map: mapInstanceRef.current, strokeWeight: 6 }); 
      const marker = createMarker(leg.end_location, label);
      
      const mapObj = { marker, polylines: { innerStroke, outerStroke }, bounds: response.routes[0].bounds }; 
      const idx = destinations.length; 
      [marker, innerStroke, outerStroke].forEach(obj => obj.addListener('click', () => handleRouteClick(idx)));
      
      mapObjectsRef.current.push(mapObj); 
      const newDestinations = [...destinations, destConfig]; 
      setDestinations(newDestinations); 
      
      // Update global state just in case, but rely on local
      setSelectedRouteData(fullRouteData); 
      handleRouteClick(idx, newDestinations, mapObj);

    } catch (e) { setModalError(`Directions failed: ${e.message}`); }
  };

  const handleRouteClick = (index, currentDestinations = destinations, specificMapObj = null) => {
    const mapObjs = mapObjectsRef.current;
    if (activeDestinationIndex !== null && activeDestinationIndex < mapObjs.length) { const prev = mapObjs[activeDestinationIndex]; if(prev) { prev.polylines.innerStroke.setOptions({ strokeColor: STROKE_COLORS.inactive.innerStroke, zIndex: 2 }); prev.polylines.outerStroke.setOptions({ strokeColor: STROKE_COLORS.inactive.outerStroke, zIndex: 1 }); prev.marker.setIcon({ ...prev.marker.getIcon(), strokeColor: MARKER_ICON_COLORS.inactive.stroke, fillColor: MARKER_ICON_COLORS.inactive.fill }); } }
    setActiveDestinationIndex(index); const target = specificMapObj || mapObjs[index]; const dest = currentDestinations[index];
    if (target && dest) { setTravelModeLayer(dest.travelModeEnum); target.polylines.innerStroke.setOptions({ strokeColor: STROKE_COLORS.active.innerStroke, zIndex: 101 }); target.polylines.outerStroke.setOptions({ strokeColor: STROKE_COLORS.active.outerStroke, zIndex: 99 }); target.marker.setIcon({ ...target.marker.getIcon(), strokeColor: MARKER_ICON_COLORS.active.stroke, fillColor: MARKER_ICON_COLORS.active.fill }); mapInstanceRef.current.fitBounds(target.bounds); }
  };

  const handleRemoveDestination = () => { if (activeDestinationIndex === null) return; const mapObj = mapObjectsRef.current[activeDestinationIndex]; mapObj.marker.setMap(null); mapObj.polylines.innerStroke.setMap(null); mapObj.polylines.outerStroke.setMap(null); mapObjectsRef.current.splice(activeDestinationIndex, 1); const newDestinations = [...destinations]; newDestinations.splice(activeDestinationIndex, 1); setDestinations(newDestinations); setActiveDestinationIndex(null); closeModal(); if (newDestinations.length === 0) { mapInstanceRef.current.panTo(CONFIGURATION.mapOptions.center); mapInstanceRef.current.setZoom(14); } };
  const openModal = (mode) => { setModalMode(mode); setDestinationToAdd(null); setModalError(''); setIsModalOpen(true); setTimeout(() => { if (inputRef.current && window.google) { const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, { bounds: mapInstanceRef.current.getBounds(), fields: ['place_id', 'geometry', 'name', 'formatted_address'] }); autocomplete.addListener('place_changed', () => { const place = autocomplete.getPlace(); if (!place.geometry) { setModalError('Place not found'); return; } setDestinationToAdd(place); setInputValue(place.name); setModalError(''); }); autocompleteRef.current = autocomplete; } if (mode === 'EDIT' && activeDestinationIndex !== null) { const current = destinations[activeDestinationIndex]; setInputValue(current.name); setSelectedTravelMode(current.travelModeEnum); } else { setInputValue(''); setSelectedTravelMode(CONFIGURATION.defaultTravelMode); } if(inputRef.current) inputRef.current.focus(); }, 100); };
  const closeModal = () => { setIsModalOpen(false); setInputValue(''); };
  const handleModalSubmit = () => { if (modalMode === 'ADD') { if (!destinationToAdd) { setModalError('Select a place'); return; } handleAddDestination(destinationToAdd, selectedTravelMode); closeModal(); } else { if(destinationToAdd) { handleRemoveDestination(); setTimeout(() => handleAddDestination(destinationToAdd, selectedTravelMode), 50); } else { closeModal(); } } };

  return (
    <div className="flex flex-col w-full h-full font-sans text-zinc-100 bg-zinc-950 overflow-hidden">
      <div className="flex-1 relative w-full overflow-hidden rounded-lg border border-zinc-800 shadow-xl"><div ref={mapRef} className="absolute top-0 left-0 w-full h-full bg-zinc-900" />{!isMapLoaded && (<div className="absolute inset-0 flex items-center justify-center bg-black/60 z-40 backdrop-blur-sm"><div className="text-white text-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div><p className="text-zinc-400 text-sm">Loading urban data...</p></div></div>)}</div>
      <div className="flex-shrink-0 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 p-4 z-20 shadow-[0_-5px_30px_rgba(0,0,0,0.5)]">
        {destinations.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-zinc-700/50 rounded-xl bg-zinc-900/50">
            <div className="flex items-center gap-4"><div className="h-14 w-14 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-600/20"><Map className="h-7 w-7 text-blue-500" /></div><div><h3 className="text-lg font-bold text-white">Plan Route</h3><p className="text-sm text-zinc-400">Set a destination to monitor safety.</p></div></div>
            <button onClick={() => openModal('ADD')} className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg px-6 py-3 flex items-center font-semibold shadow-lg backdrop-blur-md transition-all hover:scale-[1.02]"><Plus className="h-5 w-5 mr-2" /> Add Destination</button>
          </div>
        ) : (
          <div className="space-y-3">
              {destinations.map((dest, idx) => (
                <div key={idx} onClick={() => handleRouteClick(idx)} className={`w-full flex flex-row gap-3 items-center p-3 rounded-lg border transition-all cursor-pointer ${activeDestinationIndex === idx ? 'bg-white/5 border-white/20 ring-1 ring-white/10' : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'}`}>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1"><TravelModeIcon mode={dest.travelModeEnum} className="w-4 h-4"/><span>{dest.distance}</span><ArrowRight className="h-3 w-3" /><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 aspect-square ${activeDestinationIndex === idx ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-300'}`}>{dest.label}</span></div>
                     <div className="text-sm font-medium text-zinc-200 truncate" title={dest.name}>{dest.name}</div><div className="text-lg font-bold text-white mt-1">{dest.duration}</div>
                   </div>
                   <div className="flex flex-col gap-1 p-2 bg-gradient-to-br from-red-900/30 to-zinc-900/50 border border-red-900/50 rounded-lg min-w-[100px] flex-shrink-0 text-center">
                     <p className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">SAFETY</p><div className="flex items-baseline justify-center gap-0.5"><span className="text-lg font-bold text-green-500">10</span><span className="text-[10px] text-zinc-500">/10</span></div>
                     <div className="w-full h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-green-600 w-[85%]" /></div>
                   </div>
                   <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {activeDestinationIndex === idx && (<button onClick={(e) => { e.stopPropagation(); openModal('EDIT'); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shrink-0 aspect-square"><Edit2 className="h-4 w-4" /></button>)}
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // FIX: Use the payload attached to THIS card, not the global state
                            if (dest.routePayload) { 
                                saveRouteToDatabase(dest.routePayload); 
                            } 
                            onComplete(); 
                        }} 
                        className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-lg backdrop-blur-md transition-all hover:scale-105"
                      >
                        Join Safety Room
                      </button>
                   </div>
                </div>
              ))}
          </div>
        )}
      </div>
      {isModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}><div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl w-[90%] max-w-md shadow-2xl p-6"><h2 className="text-xl font-bold text-white mb-6">{modalMode === 'ADD' ? 'New Destination' : 'Edit Route'}</h2><form onSubmit={(e) => { e.preventDefault(); handleModalSubmit(); }} className="space-y-6"><div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Location</label><input ref={inputRef} type="text" className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-white/50 outline-none placeholder-zinc-600" placeholder="Search places..." value={inputValue} onChange={(e) => { setInputValue(e.target.value); setModalError(''); }} autoComplete="off" />{modalError && <p className="text-red-500 text-xs">{modalError}</p>}</div><div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Travel Mode</label><div className="flex bg-black/30 rounded-lg p-1 border border-zinc-800">{[TravelMode.DRIVING, TravelMode.TRANSIT, TravelMode.BICYCLING, TravelMode.WALKING].map((mode) => (<button key={mode} type="button" onClick={() => setSelectedTravelMode(mode)} className={`flex-1 py-2 rounded-md flex items-center justify-center transition-all ${selectedTravelMode === mode ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><TravelModeIcon mode={mode} className="w-5 h-5" /></button>))}</div></div><div className="flex justify-end gap-3 pt-2">{modalMode === 'EDIT' && (<button type="button" onClick={handleRemoveDestination} className="px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg text-sm font-semibold">Delete</button>)}<button type="button" onClick={closeModal} className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg text-sm font-semibold">Cancel</button><button type="submit" className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg text-sm font-bold shadow-lg backdrop-blur-md">{modalMode === 'ADD' ? 'Add Stop' : 'Save Changes'}</button></div></form></div></div>)}
    </div>
  );
};
export default Commutes;