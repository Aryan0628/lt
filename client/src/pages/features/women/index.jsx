import { useState, useEffect, useRef } from "react"
import { Button } from "../../../ui/button"
import { House, Navigation, ArrowLeft, AlertTriangle, ChevronLeft, Mic, MicOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ref, get, update, onValue, off, push, set, serverTimestamp, runTransaction, remove } from "firebase/database"
import { db } from "../../../firebase/firebase"
import { useAuthStore } from "../../../store/useAuthStore"
import GoogleMapComponent from "../../../components/google-map"
import ChatSidePanel from "./chat-side-panel"
import { WOMEN_FEATURE } from "./config"
import LocationAccess from "./LocationAccess"
import Commute from "./Commute"
import FloatingLines from "../../../ui/FloatingLines"
// --- CHANGED: Switched to Local AI Hook ---
import { useLocalSentinel } from "../../../hooks/useLocalSentinel" 
import { api } from "../../../lib/api"

export default function WomenSafetyPage() {
  const [currentLocation, setCurrentLocation] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [stage, setStage] = useState("location") 
  const [routeStart, setRouteStart] = useState(null)
  const [routeEnd, setRouteEnd] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [otherUsers, setOtherUsers] = useState([])
  const [activeRouteId, setActiveRouteId] = useState(null)
  const [chatMessages, setChatMessages] = useState([]) 
  const [finalScore, setfinalScore] = useState(null)
  const [routeGeoHash, setRouteGeoHash] = useState(null)
  
  const [isSosDisabled, setIsSosDisabled] = useState(false)
  const [showSafetyAlert, setShowSafetyAlert] = useState(false)
  const [sosTriggerCount, setSosTriggerCount] = useState(0)
  const [activeSosUsers, setActiveSosUsers] = useState([]); 
  
  const [nearbyThreats, setNearbyThreats] = useState([]);
  const [isSentinelActive, setIsSentinelActive] = useState(false)
  
  const { user } = useAuthStore()

  // --- CHANGED: Define Handler for Local AI Trigger ---
  const handleLocalAlert = async (keyword) => {
    if (!user?.sub) return;
    // We write to Firebase, mimicking the old Backend behavior.
    // Your existing useEffect (lines ~180) listens to this node and will trigger 'throttle()' automatically.
    const alertRef = ref(db, `women/alerts/${user.sub}`);
    await set(alertRef, {
        type: 'CRITICAL',
        source: 'LOCAL_BROWSER_AI',
        keyword: keyword,
        timestamp: serverTimestamp(),
        status: 'ACTIVE'
    });
  };

  // --- CHANGED: Use Local Sentinel Hook ---
  const { status: sentinelStatus, modelProgress } = useLocalSentinel(isSentinelActive, handleLocalAlert);

  const geoWatchIdRef = useRef(null)
  const roomListenerUnsubscribeRef = useRef(null)
  const navigate = useNavigate()
  const feature = WOMEN_FEATURE

const handleExit = async () => {
    if (geoWatchIdRef.current !== null) navigator.geolocation.clearWatch(geoWatchIdRef.current);
    setIsSentinelActive(false);
    navigate("/dashboard");
    if (user && activeRouteId) {
      try {
        const routeRef = ref(db, `women/routes/${activeRouteId}`);
        const userActiveRef = ref(db, `women/user_active/${user.sub}`);
        const roomMemberRef = ref(db, `women/rooms/${activeRouteId}/members/${user.sub}`);
        
        const audioAlertRef = ref(db, `women/alerts/${user.sub}`); 

        if (routeGeoHash) {
           await remove(ref(db, `women/active_sos/${routeGeoHash}/${user.sub}`));
        }
        await remove(userActiveRef);
        await remove(roomMemberRef);
        
        await remove(audioAlertRef); 

        await runTransaction(routeRef, (currentRouteData) => {
          if (currentRouteData) {
            if (currentRouteData.userCount > 1) {
              currentRouteData.userCount--;
              return currentRouteData;
            } else {
              return null;
            }
          }
          return currentRouteData; 
        });
        const snap = await get(routeRef);
        if (!snap.exists()) {
            console.log("Route deleted. Cleaning up Room and LocalRoom...");
            await remove(ref(db, `women/rooms/${activeRouteId}`));
            if (routeGeoHash) {
                await remove(ref(db, `women/localroom/${routeGeoHash}/${activeRouteId}`));
            }
        }

      } catch (e) { console.error("Cleanup error:", e); }
    }
  };
  const getScoreUI = (score, sosCount, isMySos) => {
    if (sosCount > 0 || isMySos) {
        return { color: "text-red-500", bg: "bg-red-950/80 border-red-500 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]", dot: "bg-red-500 animate-ping shrink-0 aspect-square", text: "SOS ACTIVE" };
    }
    if (score === null) return { color: "text-zinc-500", bg: "bg-zinc-900 border-zinc-700", dot: "bg-zinc-600 shrink-0 aspect-square", text: "Initializing..." };
    const s = Number(score);
    if (s >= 8) return { color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/30", dot: "bg-emerald-500 shrink-0 aspect-square", text: `Safe: ${s}/10` };
    if (s >= 5) return { color: "text-amber-400", bg: "bg-amber-950/30 border-amber-500/30", dot: "bg-amber-500 shrink-0 aspect-square", text: `Caution: ${s}/10` };
    return { color: "text-red-500", bg: "bg-red-950/30 border-red-500/50", dot: "bg-red-500 animate-pulse shrink-0 aspect-square", text: `CRITICAL: ${s}/10` };
  }
  const requestLocation = async () => {
    setIsLoadingLocation(true)
    try {
      const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      setCurrentLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
      setStage("commute");
    } catch (e) { console.error("Loc error", e); } 
    finally { setIsLoadingLocation(false); }
  }
  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
      if (roomListenerUnsubscribeRef.current) roomListenerUnsubscribeRef.current();
    }
  }, []);

  useEffect(() => {
    if (!currentLocation || !user) return;
    const myGeohash = encodeGeohash(currentLocation.lat, currentLocation.lng, 6);
    const nearbySosRef = ref(db, `women/active_sos/${myGeohash}`);
    
    const unsub = onValue(nearbySosRef, (snap) => {
        if (!snap.exists()) {
            setNearbyThreats([]);
            return;
        }

        const threats = [];
        snap.forEach((child) => {
            const threatData = child.val();
            const threatUserId = child.key;

            if (threatUserId === user.sub) return;

            const dist = getDistanceMeters(
                currentLocation.lat, currentLocation.lng,
                threatData.lat, threatData.lng
            );

            if (dist <= 200) {
                threats.push({
                    id: threatUserId,
                    lat: threatData.lat,
                    lng: threatData.lng,
                    routeId: threatData.routeId,
                    distance: Math.round(dist)
                });
            }
        });
        setNearbyThreats(threats);
    });

    return () => off(nearbySosRef);
  }, [currentLocation, user]);

  useEffect(() => {
    if (!activeRouteId) return;
    const sosCountRef = ref(db, `women/rooms/${activeRouteId}/sos_triggered`);
    onValue(sosCountRef, (s) => setSosTriggerCount(s.val() || 0));
    const sosListRef = ref(db, `women/rooms/${activeRouteId}/sos`);
    onValue(sosListRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const events = Object.values(data);
            const userIds = [...new Set(events.map(e => e.userId))];
            setActiveSosUsers(userIds);
        } else {
            setActiveSosUsers([]);
        }
    });
    const scoreRef = ref(db, `women/rooms/${activeRouteId}/finalScore/score`);
    onValue(scoreRef, (s) => setfinalScore(s.exists() ? s.val() : null));

    return () => { off(sosCountRef); off(sosListRef); off(scoreRef); };
  }, [activeRouteId]);
  useEffect(() => {
    if (finalScore === null) return;
    const s = Number(finalScore);
    if (s < 7 && !isSosDisabled) setShowSafetyAlert(true);
  }, [finalScore]);

  useEffect(() => {
    const initRoute = async () => {
      if (stage !== "map" || !user) return;
      setIsLoadingRoute(true);
      try {
        const snap = await get(ref(db, `women/user_active/${user.sub}`));
        if (snap.exists()) {
          const d = snap.val();
          if (d.start && d.end) {
            setRouteStart({ lat: d.start.start_lat, lng: d.start.start_lng });
            setRouteEnd({ lat: d.end.end_lat, lng: d.end.end_lng });
            if (d.routeId) {
              setActiveRouteId(d.routeId);
              onValue(ref(db, `women/routes/${d.routeId}/geoHash`), (s) => { if (s.exists()) setRouteGeoHash(s.val()) });
              startLocationTracking(d.routeId);
              roomListenerUnsubscribeRef.current = listenToRoomMembers(d.routeId);
            }
          }
        }
      } catch (e) { console.error(e); } 
      finally { setIsLoadingRoute(false); }
    };
    initRoute();
  }, [stage, user]);

  useEffect(() => {
    if (!activeRouteId) return;
    const msgRef = ref(db, `women/rooms/${activeRouteId}/messages`);
    onValue(msgRef, (s) => {
      if (s.exists()) {
        const msgs = Object.entries(s.val()).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => a.timestamp - b.timestamp);
        setChatMessages(msgs);
      } else setChatMessages([]);
    });
    return () => off(msgRef);
  }, [activeRouteId]);

  useEffect(() => {
    
    if (!user || !activeRouteId) return; 

    const alertRef = ref(db, `women/alerts/${user.sub}`);

    const unsubscribe = onValue(alertRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        if (data.status === 'ACTIVE' && data.type === 'CRITICAL' && !isSosDisabled) {
          console.log("🎤 Audio Sentinel Triggered SOS:", data.keyword);
          
          if (activeRouteId) {
             throttle(); 
          }
        }
      }
    });

    return () => off(alertRef);
    
  }, [user, isSosDisabled, activeRouteId]);

  const throttle = async () => {
    setIsSosDisabled(true); setShowSafetyAlert(false);
    try {
      await runTransaction(ref(db, `women/rooms/${activeRouteId}/sos_triggered`), (c) => (c || 0) + 1);
      const newSosRef = push(ref(db, `women/rooms/${activeRouteId}/sos`));
      await set(newSosRef, {
        userId: user.sub,
        timestamp: serverTimestamp()
      });

      if (routeGeoHash && currentLocation) {
          const globalSosRef = ref(db, `women/active_sos/${routeGeoHash}/${user.sub}`);
          await set(globalSosRef, {
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              routeId: activeRouteId,
              timestamp: serverTimestamp()
          });
      }
      const msgs = chatMessages.map(m => ({ userId: m.userId, message: m.text }));
      await api.post(`/api/model/throttle`, { message: msgs, userId: user.sub, routeId: activeRouteId });
    } catch (e) { console.error(e); }
  }
  const handleConfirmUnsafe = () => { throttle(); setShowSafetyAlert(false); }
  const startLocationTracking = (rId) => {
    if (!navigator.geolocation) return;
    geoWatchIdRef.current = navigator.geolocation.watchPosition(async (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        setCurrentLocation({ lat, lng });
        
        await update(ref(db, `women/user_active/${user.sub}`), { current: { lat, lng } });
        await update(ref(db, `women/rooms/${rId}/members/${user.sub}`), { current_lat: lat, current_lng: lng });

        if (isSosDisabled && routeGeoHash) {
             await update(ref(db, `women/active_sos/${routeGeoHash}/${user.sub}`), { lat, lng });
        }

    }, console.error, { enableHighAccuracy: true });
  }
  const listenToRoomMembers = (rId) => {
    return onValue(ref(db, `women/rooms/${rId}/members`), (s) => {
      if (s.exists()) {
        const m = [];
        Object.entries(s.val()).forEach(([uid, d]) => { if (uid !== user.sub) m.push({ userId: uid, ...d }); });
        setOtherUsers(m);
      }
    });
  }
  const pushMessage = async (txt) => {
    if (!txt?.trim() || !activeRouteId || !user) return;
    const msgData = { userId: user.sub, userName: user.name || "User", userImage: user.picture || "", text: txt, timestamp: serverTimestamp() };
    await set(push(ref(db, `women/rooms/${activeRouteId}/messages`)), msgData);
    try {
        await api.post(`/api/room/room_data`, { roomId: activeRouteId, userId: user.sub, message: txt });
        const history = chatMessages.slice(-10).map(m => ({ userId: m.userId, message: m.text }));
        
        const res = await api.post(`/api/model/agent1`, { roomId: activeRouteId, messages: history, currentUserMessage: txt, currentUserId: user.sub });
        
        if (res.data.trigger_sos === true) {
            console.log("🚨 Agent 1 triggered SOS! Updating UI state.");
            setIsSosDisabled(true); 
            setShowSafetyAlert(false);
            try {
              await runTransaction(ref(db, `women/rooms/${activeRouteId}/sos_triggered`), (c) => (c || 0) + 1);
              const newSosRef = push(ref(db, `women/rooms/${activeRouteId}/sos`));
              await set(newSosRef, {
                userId: user.sub,
                timestamp: serverTimestamp()
              });

              if (routeGeoHash && currentLocation) {
                await set(ref(db, `women/active_sos/${routeGeoHash}/${user.sub}`), {
                    lat: currentLocation.lat,
                    lng: currentLocation.lng,
                    routeId: activeRouteId,
                    timestamp: serverTimestamp()
                });
              }

            } catch (error) {
              console.error("Error updating SOS count:", error);
            }
        }

        if (res.data.final_score != null) {
            await set(ref(db, `women/rooms/${activeRouteId}/finalScore`), { score: res.data.final_score });
            if (routeGeoHash) await update(push(ref(db, `women/localroom/${routeGeoHash}/${activeRouteId}/finalScore`)), { score: res.data.final_score });
        }
    } catch (e) { console.error(e); }
  }
  const uiStyles = getScoreUI(finalScore, sosTriggerCount, isSosDisabled);

  if (stage === "location") return (
    <div className="h-screen w-screen relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40"><FloatingLines /></div>
        <div className="relative z-10 w-full h-full"><LocationAccess onRequestLocation={requestLocation} isLoadingLocation={isLoadingLocation} onSkip={() => navigate("/dashboard")} /></div>
    </div>
  );

  if (stage === "commute") return (
    <div className="h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
        <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md z-20 shrink-0 h-16 flex items-center relative overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-50 w-full h-full"><div className="w-full h-full scale-150 origin-center"><FloatingLines /></div></div>
          <div className="px-6 w-full flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStage("location")} className="text-zinc-400 hover:text-white p-0"><ArrowLeft className="h-5 w-5" /></Button>
              <h1 className="text-2xl font-black tracking-tighter text-white">
                Urban<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Flow</span>
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-zinc-400 hover:text-white hover:bg-zinc-800 border-none shadow-none">
              <House className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar"><div className="p-4 h-full flex flex-col min-h-[600px]"><Commute onComplete={() => setStage("map")} userLocation={currentLocation} user={user} /></div></div>
    </div>
  );
  return (
    <div className="h-screen bg-zinc-950 flex flex-col relative overflow-hidden"> 
      
      <header className="border-b border-zinc-800 bg-zinc-900 z-20 shrink-0 relative overflow-hidden h-16 flex items-center">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 overflow-hidden w-full h-full">
            <div className="w-full h-full scale-150 origin-center"><FloatingLines /></div>
        </div>
        <div className="px-6 w-full flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleExit} className="text-zinc-400 hover:text-white p-0 border-none shadow-none hover:bg-transparent mr-1">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <h1 className="text-xl font-bold text-white tracking-tight">UrbanFlow</h1>
          </div>

          <div className="flex items-center gap-4">
            
            {/* --- CHANGED: AUDIO SENTINEL TOGGLE BUTTON UPDATED --- */}
            <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsSentinelActive(!isSentinelActive)}
                className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl transition-all duration-300 ${
                  isSentinelActive 
                    ? (sentinelStatus === 'active' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : "bg-zinc-800 border-zinc-700 text-zinc-400 animate-pulse")
                    : "bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                }`}
            >
               {isSentinelActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
               <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">
                  {sentinelStatus === 'loading' 
                    ? `Loading AI (${Math.round(modelProgress || 0)}%)` 
                    : (isSentinelActive ? (sentinelStatus === 'active' ? "Listening" : "Initializing...") : "Sentinel Off")
                  }
               </span>
            </Button>

            {/* NEARBY THREATS */}
            {nearbyThreats.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/90 text-white rounded-lg animate-pulse shadow-lg border border-red-500">
                    <AlertTriangle className="h-4 w-4 fill-white text-red-600" />
                    <span className="text-xs font-bold uppercase tracking-wide">{nearbyThreats.length} SOS Nearby</span>
                </div>
            )}

            {/* SAFETY SCORE BADGE */}
            <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-xl border transition-all duration-500 backdrop-blur-sm ${uiStyles.bg}`}>
                <div className={uiStyles.dot} />
                <span className={`text-xs font-bold uppercase tracking-widest ${uiStyles.color}`}>{uiStyles.text}</span>
            </div>
            
            {/* LIVE INDICATOR */}
            {currentLocation && (
              <Button variant="ghost" className="gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 hidden md:flex h-auto rounded-xl pointer-events-none">
                <Navigation className="h-3 w-3 animate-pulse" /> Live
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        
        <div className="w-[420px] border-r border-zinc-800 bg-slate-900 relative flex flex-col shadow-2xl z-10">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40"><FloatingLines /></div>
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">
             <div className="flex-1 min-h-0 overflow-hidden">
                <ChatSidePanel 
                    messages={chatMessages} currentUser={user} onSendMessage={pushMessage} onClose={handleExit} 
                    routeId={activeRouteId} onThrottle={throttle} isSosDisabled={isSosDisabled} 
                    finalScore={finalScore} otherUsers={otherUsers} sosTriggerCount={sosTriggerCount} 
                />
             </div>
          </div>
        </div>

        <div className="flex-1 relative bg-zinc-950">
          <GoogleMapComponent
            selectedFeature={feature.id} 
            isLoadingLocation={isLoadingRoute} 
            routeStart={routeStart} 
            routeEnd={routeEnd}
            currentUserLocation={currentLocation} 
            currentUser={user} 
            otherUsers={otherUsers}
            sosTriggerCount={sosTriggerCount} 
            activeSosUsers={activeSosUsers}
            nearbyThreats={nearbyThreats} 
            darkMode={true} 
          />
          {isLoadingRoute && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-300 font-medium">Syncing...</p>
                </div>
             </div>
          )}
        </div>
      </div>
      {showSafetyAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-red-500/50 rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex flex-col items-center text-center gap-5">
              <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle className="h-10 w-10 text-red-500 animate-pulse" /></div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Safety Warning</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">Unsafe drop in area safety levels detected.</p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-4">
                <Button onClick={handleConfirmUnsafe} className="w-full bg-red-600 hover:bg-red-700 text-white h-14 font-bold text-lg rounded-xl">Trigger SOS</Button>
                <Button variant="ghost" onClick={() => setShowSafetyAlert(false)} className="w-full text-zinc-500 hover:text-white h-12">I am safe</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; 
  const q1 = lat1 * Math.PI / 180;
  const q2 = lat2 * Math.PI / 180;
  const dq = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dq/2) * Math.sin(dq/2) +
            Math.cos(q1) * Math.cos(q2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function encodeGeohash(lat, lon, precision) {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0, bit = 0, evenBit = true, geohash = '';
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) { idx = idx * 2 + 1; lonMin = lonMid; } 
      else { idx = idx * 2; lonMax = lonMid; }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; } 
      else { idx = idx * 2; latMax = latMid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0; idx = 0;
    }
  }
  return geohash;
}