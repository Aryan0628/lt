import React, { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ref, onValue, off, query as rQuery, orderByChild, equalTo } from "firebase/database" 
import { db } from "../../../firebase/firebase" 
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { GoogleMap, Marker, useJsApiLoader, OverlayView, DirectionsRenderer } from "@react-google-maps/api"
import { 
  ArrowLeft, MapPin, Users, AlertTriangle, 
  ShieldAlert, ShieldCheck, Bell, MessageSquare, 
  Navigation, Loader2, User, AlertCircle, ChevronDown, ChevronUp, Radio,
  Mic, Play, CheckCircle
} from "lucide-react"
import { api } from "../../../lib/api";
const firestore = getFirestore();
const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1.5rem" }
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
const getAddressFromCoords = async (lat, lng) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results[0]) {
        return data.results[0].formatted_address;
      }
    } catch (error) {
      console.error("Geocoding error", error);
    }
    return "Location info unavailable";
};
const getCoords = (user) => {
    if (user.current && user.current.lat && user.current.lng) {
        return { lat: Number(user.current.lat), lng: Number(user.current.lng) };
    }
    if (user.current_lat && user.current_lng) {
        return { lat: Number(user.current_lat), lng: Number(user.current_lng) };
    }
    if (user.lat && user.lng) {
        return { lat: Number(user.lat), lng: Number(user.lng) };
    }
    return null;
};
const AlertCard = ({ alert, userInfo, roomId }) => {
    const isCritical = alert.type === "CRITICAL"; 
    
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState("Locating...");
    const [backendData, setBackendData] = useState(null);

    useEffect(() => {
        const coords = userInfo ? getCoords(userInfo) : null;
        if (coords) {
            getAddressFromCoords(coords.lat, coords.lng).then(addr => setAddress(addr));
        } else {
            setAddress("Location info unavailable");
        }
    }, [userInfo]);

    const handleExpand = async () => {
        if (expanded) { setExpanded(false); return; }
        setExpanded(true);
        
        if (alert.aiAnalysis && alert.score) {
            setBackendData({
                found: true,
                aiAnalysis: alert.aiAnalysis,
                score: alert.score,
                source: "AI Watchdog"
            });
            return;
        }

        if (backendData) return;

        setLoading(true);
        try {
            // --- CHANGE START: Fixed Axios Syntax ---
            // Removed headers/body/JSON.stringify. Passed object directly.
            const response = await api.post(`/api/room/get-alert-details`, {
                userId: alert.userId,
                roomId: roomId,
                timestamp: alert.timestamp 
            });
            
            // Axios returns data in response.data, no need for .json()
            const data = response.data;
            // --- CHANGE END ---

            setBackendData(data);
        } catch (e) {
            console.error("Failed to fetch details", e);
            setBackendData({ error: "Connection failed" });
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (score) => {
        if (score === "HIGH") return "text-red-600"; 
        if (!isNaN(score) && Number(score) < 4.1) return "text-red-600"; 
        return "text-amber-600"; 
    };

    return (
      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden mb-3
          ${isCritical ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'}`}>
          
          <div className="p-4 cursor-pointer" onClick={handleExpand}>
              <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                      <span className={`flex h-2 w-2 rounded-full ${isCritical ? 'bg-red-600 animate-ping' : 'bg-amber-500'}`}></span>
                      <span className={`text-xs font-black uppercase tracking-wider ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                          {isCritical ? "SOS TRIGGERED" : "SUSPICIOUS ACTIVITY"}
                      </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                      {userInfo?.userImage ? (
                          <img src={userInfo.userImage} alt="User" className="h-full w-full object-cover" />
                      ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400"><User size={16} /></div>
                      )}
                  </div>
                  <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                          {userInfo?.userName || "Unknown User"}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">
                          ID: {alert.userId}
                      </p>
                  </div>
              </div>

              <div className="flex gap-2 items-start text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-100/50">
                  <MapPin className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className="leading-snug line-clamp-2">{address}</span>
              </div>

              <div className="flex justify-center mt-2">
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
          </div>

          {expanded && (
              <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                  <div className="border-t border-slate-200/60 pt-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                          INTELLIGENCE REPORT
                      </p>
                      
                      {loading ? (
                          <div className="py-6 flex flex-col items-center justify-center text-slate-400">
                              <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
                              <span className="text-xs">Fetching Firestore Logs...</span>
                          </div>
                      ) : backendData && backendData.found ? (
                          <div className="space-y-3">
                              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                      <Radio className="w-3 h-3 text-indigo-500" />
                                      <span className="text-[10px] font-bold text-indigo-600 uppercase">
                                          {backendData.source === "User Throttle" ? "Throttle Context" : "AI Analysis"}
                                      </span>
                                  </div>
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                      {backendData.aiAnalysis}
                                  </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <span className="text-[9px] font-bold text-slate-400 block">SAFETY SCORE</span>
                                      <span className={`text-sm font-black ${getRiskColor(backendData.score)}`}>
                                          {backendData.score}
                                      </span>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <span className="text-[9px] font-bold text-slate-400 block">TRIGGER SOURCE</span>
                                      <span className="text-xs font-bold text-slate-700">
                                          {backendData.source}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-center text-xs text-red-400 py-2">
                              {backendData?.error || "Log not found in database."}
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    )
}

// --- NEW COMPONENT: VOICE LOG CARD ---
const VoiceLogCard = ({ log, onMarkListened }) => {
    return (
        <div className={`p-4 rounded-xl border mb-3 transition-all ${
            log.isListened ? "bg-slate-50 border-slate-100 opacity-70" : "bg-red-50 border-red-200 shadow-sm"
        }`}>
            {/* Header: User Info */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${log.isListened ? 'bg-slate-200 border-slate-300' : 'bg-white border-red-200'}`}>
                        <User className={`w-5 h-5 ${log.isListened ? 'text-slate-500' : 'text-red-600'}`} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-800">{log.userName || "Unknown User"}</p>
                        <p className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded w-fit">ID: {log.userId?.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">
                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {!log.isListened && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                            <span className="text-[9px] font-bold text-red-600 uppercase">New Audio</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Audio Player */}
            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-inner mb-2">
                <audio 
                    controls 
                    src={log.audioUrl} 
                    className="w-full h-8"
                    onPlay={() => !log.isListened && onMarkListened(log.id)} 
                />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <MapPin className="w-3 h-3" />
                    <span>{log.location?.lat?.toFixed(4)}, {log.location?.lng?.toFixed(4)}</span>
                </div>
                {log.isListened ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Reviewed
                    </div>
                ) : (
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Action Required</span>
                )}
            </div>
        </div>
    );
};
// --- MISSING COMPONENT: CHAT BUBBLE ---
const ChatBubble = ({ msg }) => {
  return (
    <div className="mb-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-bold text-slate-700">{msg.userName || msg.sender || "User"}</span>
        <span className="text-[10px] font-mono text-slate-400">
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
        </span>
      </div>
      <p className="text-xs text-slate-600 font-medium leading-relaxed">
        {msg.text || msg.message}
      </p>
    </div>
  )
}

// --- COMPONENT: ADMIN USER MARKER ---
const AdminUserMarker = ({ user, status, context }) => {
    const isSos = status === 'CRITICAL';
    const isSuspicious = status === 'SUSPICIOUS';

    const coords = getCoords(user);
    if (!coords) return null; 

    let ringColor = "border-blue-500";
    let shadowColor = "shadow-blue-500/30";
    let scale = "";

    if (isSos) {
      ringColor = "border-red-600";
      shadowColor = "shadow-[0_0_40px_rgba(220,38,38,1)]";
      scale = "scale-110";
    } 
    else if (isSuspicious) {
      ringColor = "border-amber-500";
      shadowColor = "shadow-[0_0_30px_rgba(245,158,11,0.6)]";
      scale = "scale-105"; 
    }
  
    return (
      <OverlayView 
        position={coords} 
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div className="relative flex flex-col items-center justify-center z-[500] -translate-y-full">
          
          {(isSos || isSuspicious) && (
               <div className="absolute -top-16 bg-white/95 backdrop-blur text-slate-900 px-3 py-2 rounded-xl shadow-xl border border-slate-200 flex flex-col items-center whitespace-nowrap z-[1000] animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                       {isSos ? <ShieldAlert className="w-3 h-3 text-red-600" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                       <span className={isSos ? "text-red-700" : "text-amber-700"}>
                           {isSos ? "SOS TRIGGERED" : "SUSPICIOUS"}
                       </span>
                   </div>
                   <span className="text-[10px] font-medium text-slate-600 max-w-[150px] truncate">
                      {context || "Anomaly Detected"}
                   </span>
                   <div className="absolute -bottom-1.5 w-3 h-3 bg-white rotate-45 border-b border-r border-slate-200"></div>
               </div>
          )}

          {isSos && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-24 h-24 bg-red-600/40 rounded-full animate-ping shrink-0 aspect-square" />
            </div>
          )}

          <div className={`relative z-10 w-12 h-12 rounded-full border-[3px] bg-white flex items-center justify-center overflow-hidden shrink-0 aspect-square transition-all duration-300 ${ringColor} ${shadowColor} ${scale}`}>
            {user.userImage ? (
              <img src={user.userImage} alt={user.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                 <User className="w-5 h-5 text-zinc-400" />
              </div>
            )}
          </div>

          {(isSos || isSuspicious) && (
              <div className={`absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shrink-0 aspect-square ${isSos ? 'bg-red-600 animate-bounce' : 'bg-amber-500'}`}>
                  {isSos ? <ShieldAlert className="w-3 h-3 text-white" /> : <AlertTriangle className="w-3 h-3 text-white" />}
              </div>
          )}

          <div className="mt-1 bg-black/60 backdrop-blur text-white text-[9px] px-2 py-0.5 rounded-md font-medium shadow-sm whitespace-nowrap">
              {user.userName?.split(' ')[0] || "User"}
          </div>
        </div>
      </OverlayView>
    )
}
  
// --- COMPONENT: ADMIN ROUTE MAP ---
const AdminRouteMap = ({ routeData, users, alerts }) => {
    const [map, setMap] = useState(null)
    const [directionsResponse, setDirectionsResponse] = useState(null)
    const { isLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY })
  
    useEffect(() => {
      if (isLoaded && routeData?.start && routeData?.end) {
          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route({
              origin: { lat: routeData.start.start_lat, lng: routeData.start.start_lng },
              destination: { lat: routeData.end.end_lat, lng: routeData.end.end_lng },
              travelMode: window.google.maps.TravelMode.DRIVING,
          }, (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK) setDirectionsResponse(result);
          });
      }
    }, [isLoaded, routeData]);
    const getUserStatus = (userId) => {
        const sosAlert = alerts.find(a => a.userId === userId && a.type === "CRITICAL");
        if (sosAlert) return { status: 'CRITICAL', context: sosAlert.reason };

        const suspAlert = alerts.find(a => a.userId === userId && a.type === "SUSPICIOUS");
        if (suspAlert) return { status: 'SUSPICIOUS', context: suspAlert.reason || suspAlert.aiAnalysis };

        return { status: 'SAFE', context: null };
    };
  
    const onLoad = useCallback((mapInstance) => {
        setMap(mapInstance);
        if (routeData) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend({ lat: routeData.start.start_lat, lng: routeData.start.start_lng });
            bounds.extend({ lat: routeData.end.end_lat, lng: routeData.end.end_lng });
            mapInstance.fitBounds(bounds, 100);
        }
        console.log(routeData);
    }, [routeData]);
  
    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  
    return (
      <GoogleMap 
          mapContainerStyle={mapContainerStyle} 
          center={defaultCenter} 
          zoom={13} 
          onLoad={onLoad} 
          options={mapOptions}
      >
          {directionsResponse && (
              <DirectionsRenderer 
                  directions={directionsResponse} 
                  options={{ 
                      suppressMarkers: true, 
                      polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 6, strokeOpacity: 0.8 } 
                  }} 
              />
          )}
          {routeData?.start && (
              <Marker 
                  position={{ lat: routeData.start.start_lat, lng: routeData.start.start_lng }}
                  icon={"http://maps.google.com/mapfiles/ms/icons/red-dot.png"}
              />
          )}
          {routeData?.end && (
              <Marker 
                  position={{ lat: routeData.end.end_lat, lng: routeData.end.end_lng }}
                  icon={"http://maps.google.com/mapfiles/ms/icons/green-dot.png"}
              />
          )}
          
          {users.map(user => {
              const { status, context } = getUserStatus(user.userId);
              const coords = getCoords(user);
              if (!coords) return null;

              return (
                  <AdminUserMarker 
                      key={user.userId} 
                      user={user} 
                      status={status} 
                      context={context} 
                  />
              )
          })}
      </GoogleMap>
    )
}

// --- MAIN PAGE ---
export default function WomenSafetyRoomDetail() {
  const { roomId, geohashId } = useParams()
  const navigate = useNavigate()
  
  const [routeData, setRouteData] = useState(null)
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [sosAlerts, setSosAlerts] = useState([]) 
  const [suspiciousAlerts, setSuspiciousAlerts] = useState([]) 
  
  // --- STATE: VOICE LOGS ---
  const [voiceLogs, setVoiceLogs] = useState([]);
  
  const [activeTab, setActiveTab] = useState("intel") 

  // --- 1. Polling for Suspicious Activity ---
  useEffect(() => {
    const fetchSuspicious = async () => {
        try {
            // --- CHANGE START: Fixed Axios Syntax ---
            // Removed headers/body/JSON.stringify. Passed object directly.
            const response = await api.post(`/api/room/get-suspicious`, { roomId });
            
            // Axios returns data in response.data, no need for .json()
            const data = response.data;
            // --- CHANGE END ---

            if (Array.isArray(data)) {
                const filtered = data
                    .filter(item => {
                        const s = Number(item.score);
                        return s >= 4.1 && s <= 7.9;
                    })
                    .map(item => {
                        let cleanTimestamp = item.timestamp;
                        if (typeof item.timestamp === 'string') {
                            cleanTimestamp = item.timestamp.replace(" at ", " ");
                        }
                        return {
                            ...item,
                            id: item.id || Math.random().toString(), 
                            type: "SUSPICIOUS", 
                            aiAnalysis: item.reason,
                            timestamp: cleanTimestamp 
                        };
                    });
                
                setSuspiciousAlerts(filtered);
            }
        } catch (error) {
            console.error("Polling Suspicious Activity Failed:", error);
        }
    };
    fetchSuspicious();
    const intervalId = setInterval(fetchSuspicious, 5000);
    return () => clearInterval(intervalId);
  }, [roomId]);


  // --- 2. Main Data Fetching (Realtime DB) ---
  useEffect(() => {
    if (!roomId) return;

    const routeRef = ref(db, `women/routes/${roomId}`);
    onValue(routeRef, (s) => s.exists() && setRouteData(s.val()));

    const membersRef = rQuery(ref(db, `women/user_active`), orderByChild("routeId"), equalTo(roomId));
    const unsubMembers = onValue(membersRef, (s) => {
        if (s.exists()) {
            const list = Object.entries(s.val()).map(([uid, data]) => ({ userId: uid, ...data }));
            setUsers(list);
        } else {
            setUsers([]);
        }
    });

    const msgRef = ref(db, `women/rooms/${roomId}/messages`);
    onValue(msgRef, (s) => {
        if (s.exists()) {
            const list = Object.entries(s.val())
                .map(([id, data]) => ({ id, ...data }))
                .sort((a,b) => a.timestamp - b.timestamp);
            setMessages(list);
        } else setMessages([]);
    });

    const sosRef = ref(db, `women/rooms/${roomId}/sos`);
    onValue(sosRef, (s) => {
        let newAlerts = [];
        if (s.exists()) {
            newAlerts = Object.entries(s.val()).map(([id, data]) => ({ id, type: "CRITICAL", ...data }));
        }
        setSosAlerts(newAlerts);
    });

    return () => { 
        off(routeRef); 
        unsubMembers(); 
        off(msgRef); 
        off(sosRef); 
    }
  }, [roomId]);
useEffect(() => {
    if (!roomId) return;
    const voiceRef = ref(db, 'voice_alerts');
    const q = rQuery(voiceRef, orderByChild('roomId'), equalTo(roomId));
    const unsub = onValue(q, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const logs = Object.entries(data).map(([key, value]) => ({
                id: key,
                ...value
            }));
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setVoiceLogs(logs);
        } else {
            setVoiceLogs([]);
        }
    });
    return () => off(q, unsub);
}, [roomId]);

  const markVoiceAsListened = async (logId) => {
      try {
          const docRef = doc(firestore, "voice_alerts", logId);
          await updateDoc(docRef, { isListened: true });
      } catch (e) {
          console.error("Error updating voice log:", e);
      }
  };

  const allAlerts = useMemo(() => {
      return [...sosAlerts, ...suspiciousAlerts].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [sosAlerts, suspiciousAlerts]);

  const chatEndRef = useRef(null);
  useEffect(() => { if (activeTab === 'comms') chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, activeTab]);

  // Count unseen voice logs
  const unreadVoiceCount = voiceLogs.filter(l => !l.isListened).length;

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-20">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    Command Center <span className="text-slate-300">/</span> <span className="font-mono text-rose-600">{roomId}</span>
                </h1>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> LIVE FEED</span>
                    <span className="text-slate-300">|</span>
                    <span>{users.length} Users Tracked</span>
                </div>
            </div>
         </div>

         <div className="flex gap-4">
             {allAlerts.length > 0 ? (
                 <div className="px-4 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 animate-pulse shadow-sm">
                     <ShieldAlert className="w-5 h-5" />
                     <span className="font-black text-sm">{allAlerts.length} THREATS DETECTED</span>
                 </div>
             ) : (
                 <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center gap-2 shadow-sm">
                     <ShieldCheck className="w-5 h-5" />
                     <span className="font-bold text-sm">Sector Secure</span>
                 </div>
             )}
         </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
          
          {/* MAP CANVAS */}
          <div className="flex-1 h-full relative rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-xl bg-slate-200">
             <AdminRouteMap routeData={routeData} users={users} alerts={allAlerts} />
          </div>

          {/* RIGHT PANEL */}
          <aside className="w-[400px] bg-white rounded-[1.5rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden shrink-0">
              
              {/* TABS NAVIGATION (3 COLS) */}
              <div className="grid grid-cols-3 p-1.5 bg-slate-100/50 border-b border-slate-200">
                  <button 
                    onClick={() => setActiveTab('intel')}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all
                    ${activeTab === 'intel' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <Bell className="w-3.5 h-3.5" /> Intel
                      {allAlerts.length > 0 && <span className="bg-red-500 text-white px-1 rounded-full ml-0.5">{allAlerts.length}</span>}
                  </button>
                  
                  {/* NEW AUDIO TAB */}
                  <button 
                    onClick={() => setActiveTab('audio')}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all
                    ${activeTab === 'audio' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <Mic className="w-3.5 h-3.5" /> Audio
                      {unreadVoiceCount > 0 && <span className="bg-red-500 text-white px-1.5 rounded-full ml-0.5">{unreadVoiceCount}</span>}
                  </button>

                  <button 
                    onClick={() => setActiveTab('comms')}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all
                    ${activeTab === 'comms' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                  </button>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-4">
                  
                  {/* TAB 1: INTEL FEED */}
                  {activeTab === 'intel' && (
                      <div className="space-y-3">
                          {allAlerts.length === 0 ? (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                                  <ShieldCheck className="w-12 h-12 mb-3 text-emerald-300 opacity-50" />
                                  <p className="font-bold text-slate-500">No Active Threats</p>
                              </div>
                          ) : (
                              allAlerts.map(alert => {
                                  const triggerUser = users.find(u => u.userId === alert.userId);
                                  return (
                                      <AlertCard 
                                          key={alert.id} 
                                          alert={alert} 
                                          userInfo={triggerUser} 
                                          roomId={roomId}
                                      />
                                  );
                              })
                          )}
                      </div>
                  )}

                  {/* TAB 2: AUDIO LOGS (NEW) */}
                  {activeTab === 'audio' && (
                      <div className="space-y-3">
                          {voiceLogs.length === 0 ? (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
                                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                      <Mic className="w-8 h-8 text-slate-400" />
                                  </div>
                                  <p className="font-bold text-slate-500">No Audio Logs</p>
                                  <p className="text-[10px] text-slate-400 mt-1">Voice recordings will appear here.</p>
                              </div>
                          ) : (
                              voiceLogs.map(log => (
                                  <VoiceLogCard 
                                      key={log.id} 
                                      log={log} 
                                      onMarkListened={markVoiceAsListened} 
                                  />
                              ))
                          )}
                      </div>
                  )}

                  {/* TAB 3: COMMS LOG */}
                  {activeTab === 'comms' && (
                      <div>
                          {messages.length === 0 ? (
                              <div className="text-center py-10 text-slate-400 text-xs">No comms recorded.</div>
                          ) : (
                              messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
                          )}
                          <div ref={chatEndRef} />
                      </div>
                  )}
              </div>
          </aside>
      </div>
    </div>
  )
}