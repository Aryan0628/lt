import { useState, useCallback, memo, useEffect, useMemo } from "react"
import { GoogleMap, Marker, useJsApiLoader, OverlayView, DirectionsRenderer } from "@react-google-maps/api"
import { Loader2, MapPin, AlertCircle, ShieldAlert, User, AlertTriangle } from "lucide-react"

const mapContainerStyle = { width: "100%", height: "100%" }
const defaultCenter = { lat: 28.6139, lng: 77.209 }

const mapOptions = {
  disableDefaultUI: false, zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  ],
}

// 1. Current User Marker
const CurrentUserMarker = memo(({ currentUserLocation, userImage, isMySos }) => {
  if (!currentUserLocation) return null;
  return (
    <OverlayView position={currentUserLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div className="relative flex flex-col items-center justify-center z-[1000] -translate-y-full">
        {isMySos && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="w-24 h-24 bg-red-500/30 rounded-full animate-ping shrink-0 aspect-square" />
          </div>
        )}
        <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center overflow-hidden bg-zinc-800 transition-all duration-300 shrink-0 aspect-square ${isMySos ? "border-[3px] border-red-600 shadow-[0_0_25px_rgba(220,38,38,1)] scale-110" : "border-[3px] border-white shadow-lg ring-2 ring-blue-500/30"}`}>
          {userImage ? (
            <img src={userImage} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-blue-600 flex items-center justify-center"><User className="w-6 h-6 text-white" /></div>
          )}
        </div>
        <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] ${isMySos ? "border-t-red-600" : "border-t-white"} -mt-1`}></div>
        {isMySos && <div className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center bg-red-600 animate-bounce shrink-0 aspect-square"><ShieldAlert className="w-3 h-3 text-white" /></div>}
      </div>
    </OverlayView>
  )
})
CurrentUserMarker.displayName = "CurrentUserMarker"

// 2. UPDATED OtherUsersMarkers
const OtherUsersMarkers = memo(({ otherUsers, sosTriggerCount, activeSosUsers, currentUserId }) => {
  const visibleUsers = useMemo(() => {
    if (!sosTriggerCount || !activeSosUsers || activeSosUsers.length === 0) return [];
    
    return otherUsers.filter(u => 
        activeSosUsers.includes(String(u.userId)) && 
        String(u.userId) !== String(currentUserId)
    );
  }, [otherUsers, sosTriggerCount, activeSosUsers, currentUserId]);

  return (
    <>
      {visibleUsers.map((member) => {
        const memberImage = member.userImage || member.photoURL || member.picture; 
        return (
          <OverlayView key={member.userId} position={{ lat: member.current_lat, lng: member.current_lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="relative flex items-center justify-center z-[500] -translate-y-1/2">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-28 h-28 bg-red-600/40 rounded-full animate-ping shrink-0 aspect-square" />
              </div>
              <div className="relative z-10 w-14 h-14 rounded-full border-[3px] border-red-500 bg-zinc-900 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,1)] shrink-0 aspect-square overflow-hidden">
                {memberImage ? (
                    <img src={memberImage} alt="SOS User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <div className="w-full h-full bg-red-800 flex items-center justify-center"><AlertCircle className="w-6 h-6 text-white animate-pulse" /></div>
                )}
              </div>
              <div className="absolute -bottom-6 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg border border-red-400 uppercase tracking-widest whitespace-nowrap z-20">
                SOS
              </div>
            </div>
          </OverlayView>
        );
      })}
    </>
  )
})
OtherUsersMarkers.displayName = "OtherUsersMarkers"

// 3. NEW: Nearby Threat Markers (For Cross-Route Proximity Alerts)
const NearbyThreatMarkers = memo(({ threats }) => {
  if (!threats || threats.length === 0) return null;

  return (
    <>
      {threats.map((t) => (
        <OverlayView key={t.id} position={{ lat: t.lat, lng: t.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div className="relative flex flex-col items-center justify-center z-[600] -translate-y-1/2">
            
            {/* Ping Animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-32 h-32 bg-red-600/30 rounded-full animate-ping shrink-0 aspect-square duration-1000" />
            </div>

            {/* Icon */}
            <div className="relative z-10 w-10 h-10 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
                <AlertTriangle className="w-5 h-5 text-white fill-white" />
            </div>

            {/* Label */}
            <div className="absolute -bottom-8 bg-black/80 text-red-500 border border-red-500/50 text-[9px] font-bold px-2 py-1 rounded backdrop-blur whitespace-nowrap z-20">
                NEARBY THREAT ({t.distance}m)
            </div>
          </div>
        </OverlayView>
      ))}
    </>
  );
});
NearbyThreatMarkers.displayName = "NearbyThreatMarkers";


function GoogleMapComponent({ selectedFeature, isLoadingLocation, routeStart, routeEnd, currentUserLocation, currentUser, otherUsers = [], sosTriggerCount, activeSosUsers = [], nearbyThreats = [] }) {
  const [map, setMap] = useState(null)
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY })
  
  const userImage = currentUser?.picture || currentUser?.photoURL || currentUser?.profileurl;
  const currentUserId = currentUser?.sub;

  const isMySos = sosTriggerCount > 0 && activeSosUsers.includes(String(currentUserId));

  useEffect(() => {
    if (isLoaded && routeStart && routeEnd) {
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route({
            origin: routeStart, destination: routeEnd, travelMode: window.google.maps.TravelMode.DRIVING, 
        }, (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) setDirectionsResponse(result);
        });
    }
  }, [isLoaded, routeStart, routeEnd]);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance)
    if (routeStart && routeEnd && mapInstance) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(new window.google.maps.LatLng(routeStart.lat, routeStart.lng))
      bounds.extend(new window.google.maps.LatLng(routeEnd.lat, routeEnd.lng))
      mapInstance.fitBounds(bounds, 100)
    }
  }, [routeStart, routeEnd])

  const onUnmount = useCallback(() => { setMap(null) }, [])

  // Auto-pan to show threats if they appear close by
  useEffect(() => {
    if (map && nearbyThreats.length > 0) {
        // Optional: Extend bounds to include nearby threats so user definitely sees them
        // const bounds = new window.google.maps.LatLngBounds();
        // bounds.extend(map.getCenter()); // Keep user in view
        // nearbyThreats.forEach(t => bounds.extend({ lat: t.lat, lng: t.lng }));
        // map.fitBounds(bounds, 50); 
        // NOTE: Commented out to prevent jarring auto-zoom, but user requested visibility.
        // For now, markers will just appear.
    }
  }, [map, nearbyThreats]);

  useEffect(() => {
    if (map && routeStart && routeEnd) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(new window.google.maps.LatLng(routeStart.lat, routeStart.lng))
      bounds.extend(new window.google.maps.LatLng(routeEnd.lat, routeEnd.lng))
      map.fitBounds(bounds, 100)
    }
  }, [map, routeStart, routeEnd])

  useEffect(() => {
    if (map && currentUserLocation) map.panTo({ lat: currentUserLocation.lat, lng: currentUserLocation.lng })
  }, [map, currentUserLocation])

  if (loadError || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-white"><AlertCircle className="h-12 w-12 text-yellow-500" /></div>
  if (!isLoaded) return <div className="absolute inset-0 flex items-center justify-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>

  return (
    <>
      {isLoadingLocation && <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}
      <GoogleMap mapContainerStyle={mapContainerStyle} center={currentUserLocation || routeStart || defaultCenter} defaultZoom={15} onLoad={onLoad} onUnmount={onUnmount} options={mapOptions}>
        
        {directionsResponse && <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 5 } }} />}
        
        {routeStart && <Marker position={routeStart} icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png" />}
        {routeEnd && <Marker position={routeEnd} icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png" />}
        
        <CurrentUserMarker currentUserLocation={currentUserLocation} userImage={userImage} isMySos={isMySos} />
        
        <OtherUsersMarkers 
            otherUsers={otherUsers} 
            sosTriggerCount={sosTriggerCount} 
            activeSosUsers={activeSosUsers} 
            currentUserId={currentUserId} 
        />

        {/* 4. RENDER NEARBY THREATS */}
        <NearbyThreatMarkers threats={nearbyThreats} />

      </GoogleMap>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className={`px-4 py-2 rounded-xl shadow-xl backdrop-blur border transition-all duration-500 ${sosTriggerCount > 0 ? "bg-red-900/90 border-red-500 animate-pulse" : "bg-zinc-900/90 border-zinc-800"}`}>
          <p className={`text-[10px] uppercase font-bold tracking-widest ${sosTriggerCount > 0 ? "text-red-100" : "text-zinc-400"}`}>{sosTriggerCount > 0 ? "Emergency Mode Active" : "Secure Route Monitoring"}</p>
        </div>
      </div>
    </>
  )
}
export default memo(GoogleMapComponent)