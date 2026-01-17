import React, { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ref, onValue, off } from "firebase/database"
// Adjust path to match your project structure
import { db } from "../../../firebase/firebase" 
import { 
  ArrowLeft, MapPin, Users, AlertTriangle, 
  ShieldAlert, ShieldCheck, Navigation, Clock,
  Bell, AlertCircle
} from "lucide-react"

// --- HELPER: Reverse Geocoding ---
const addressCache = {};

const getAddressFromCoords = async (lat, lng) => {
  const key = `${lat},${lng}`;
  if (addressCache[key]) return addressCache[key];

  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.status === "OK" && data.results[0]) {
      const addr = data.results[0].formatted_address;
      addressCache[key] = addr; 
      return addr;
    }
  } catch (error) {
    console.error("Geocoding error", error);
  }
  return "Address unavailable";
};

// --- SUB-COMPONENT: Live Room Card ---
const LiveRoomCard = ({ data }) => {
  const navigate = useNavigate(); // Added hook for navigation
  const { geohashId } = useParams(); // Get the current geohash context
  const { roomId, routeData, liveData, startAddress } = data;

  // Safety Score Logic
  const rawScore = liveData?.finalScore?.score !== undefined ? liveData.finalScore.score : 10;
  const safetyScore = rawScore === 10 ? "10.0" : (Math.round(rawScore * 10) / 10).toFixed(1);
  
  // Status Checks
  const isSosActive = (liveData?.sos_triggered || 0) > 0;
  
  // Active Users
  const activeUserCount = liveData?.members 
    ? Object.keys(liveData.members).length 
    : (routeData?.userCount || 0);

  // --- STYLING LOGIC ---
  let containerStyles = "bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300"; // Added hover effects
  
  if (isSosActive) {
    containerStyles = "bg-red-50 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse";
  } else if (rawScore < 4) {
    containerStyles = "bg-rose-50 border-rose-500 shadow-md";
  } else if (rawScore < 7) {
    containerStyles = "bg-amber-50 border-amber-500 shadow-md";
  }

  const getScoreTextColor = (s) => {
    if (s < 5) return "text-red-700 bg-red-100 border-red-200";
    if (s < 8) return "text-amber-700 bg-amber-100 border-amber-200";
    return "text-emerald-700 bg-emerald-100 border-emerald-200";
  };

  // --- NAVIGATION HANDLER ---
  const handleCardClick = () => {
    // Navigates to: /administration/womenSafety/{tud1nbvyu}/{roomId}
    navigate(`/administration/womenSafety/${geohashId}/${roomId}`);
  };

  return (
    <div 
      onClick={handleCardClick} // Make the card clickable
      className={`relative p-6 rounded-3xl border transition-all duration-300 flex flex-col h-full cursor-pointer transform hover:-translate-y-1 ${containerStyles}`}
    >
       
       {/* SOS CORNER BADGE */}
       {isSosActive && (
         <div className="absolute -top-3 -right-3 bg-red-600 text-white px-3 py-1 rounded-full font-black text-[10px] tracking-wider flex items-center gap-1 shadow-lg animate-bounce z-10">
           <AlertTriangle className="w-3 h-3" /> CRITICAL
         </div>
       )}

       {/* HEADER */}
       <div className="flex justify-between items-start mb-6 gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room ID</span>
            <span className="font-mono text-[10px] font-bold text-slate-600 bg-white/50 px-2 py-1.5 rounded-md select-all break-all border border-slate-100 leading-tight">
              {roomId}
            </span>
          </div>
          
          <div className="flex-shrink-0">
            {isSosActive ? (
                <div className="flex flex-col items-center justify-center w-20 h-[58px] rounded-xl border border-red-700 bg-red-600 text-white shadow-lg">
                    <ShieldAlert className="w-5 h-5 mb-0.5 animate-pulse" />
                    <span className="text-xl font-black tracking-widest leading-none">SOS</span>
                </div>
            ) : (
                <div className={`flex flex-col items-center justify-center w-20 h-[58px] px-2 rounded-xl border ${getScoreTextColor(rawScore)}`}>
                    <span className="text-[9px] font-bold uppercase opacity-70 leading-none mb-1">Safety</span>
                    <span className="text-xl font-black leading-none">{safetyScore}</span>
                </div>
            )}
          </div>
       </div>

       {/* LOCATIONS */}
       <div className="space-y-4 mb-6 relative flex-1">
         <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-slate-200/50 z-0"></div>

         <div className="flex gap-3 relative z-10">
            <div className="mt-1 min-w-[24px] h-6 rounded-full bg-white text-slate-500 border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
             <MapPin className="w-3 h-3" />
           </div>
           <div className="min-w-0">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Location</p>
             <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2 mt-0.5" title={startAddress}>
               {startAddress || "Locating..."}
             </p>
           </div>
         </div>

         <div className="flex gap-3 relative z-10">
           <div className="mt-1 min-w-[24px] h-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm shrink-0">
             <Navigation className="w-3 h-3" />
           </div>
           <div className="min-w-0">
             <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Destination</p>
             <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5" title={routeData?.endaddress}>
               {routeData?.endaddress || "Loading destination..."}
             </p>
           </div>
         </div>
       </div>

       {/* FOOTER */}
       <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 mt-auto">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4" />
            <span className="text-sm font-bold">{activeUserCount} Active Users</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>Live</span>
          </div>
       </div>
    </div>
  );
};

// ... SidebarAlertItem remains unchanged ...
const SidebarAlertItem = ({ data }) => {
  const { roomId, liveData, startAddress, routeData } = data;
  const isSos = (liveData?.sos_triggered || 0) > 0;
  const score = liveData?.finalScore?.score ?? 10;

  return (
    <div className={`p-4 rounded-2xl border mb-3 shadow-sm flex flex-col gap-2 transition-all
      ${isSos 
        ? 'bg-red-50 border-red-200 hover:bg-red-100' 
        : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
      }`}>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                {isSos ? <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse"/> : <AlertCircle className="w-4 h-4 text-amber-600"/>}
                <span className={`text-xs font-black uppercase tracking-wider ${isSos ? 'text-red-700' : 'text-amber-700'}`}>
                    {isSos ? "SOS Triggered" : "Low Safety Score"}
                </span>
            </div>
            {isSos ? (
               <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">SOS</span>
            ) : (
               <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                   {score.toFixed(1)}
               </span>
            )}
        </div>

        <p className="text-[10px] font-mono text-slate-500 break-all bg-white/50 p-1 rounded border border-slate-100">
            ID: {roomId}
        </p>

        <div className="space-y-1 mt-1">
            <div className="flex gap-2 text-[10px] text-slate-600">
                <span className="font-bold w-8 text-slate-400 shrink-0">FROM:</span>
                <span className="truncate flex-1">{startAddress || "..."}</span>
            </div>
            <div className="flex gap-2 text-[10px] text-slate-600">
                <span className="font-bold w-8 text-slate-400 shrink-0">TO:</span>
                <span className="truncate flex-1">{routeData?.endaddress || "..."}</span>
            </div>
        </div>
    </div>
  )
}

// ... Main Component remains largely the same, just keeping imports ...
export default function WomenSafetyZoneDetails() {
  const { geohashId } = useParams()
  const navigate = useNavigate()
  
  const [allRoomsData, setAllRoomsData] = useState({});
  const [loading, setLoading] = useState(true)

  // ... (useEffect for data fetching remains exactly the same) ...
  useEffect(() => {
    const zoneRef = ref(db, `women/localroom/${geohashId}`);
    const unsubZone = onValue(zoneRef, (snap) => {
      if (!snap.exists()) {
        setAllRoomsData({});
        setLoading(false);
        return;
      }
      const roomIds = Object.keys(snap.val());
      roomIds.forEach(roomId => {
        const routeRef = ref(db, `women/routes/${roomId}`);
        onValue(routeRef, async (routeSnap) => {
          if (!routeSnap.exists()) return;
          const rData = routeSnap.val();
          let sAddr = "Locating...";
          if (rData.start?.start_lat && rData.start?.start_lng) {
              sAddr = await getAddressFromCoords(rData.start.start_lat, rData.start.start_lng);
          }
          setAllRoomsData(prev => ({
            ...prev,
            [roomId]: { ...prev[roomId], roomId, routeData: rData, startAddress: sAddr }
          }));
        });
        const roomRef = ref(db, `women/rooms/${roomId}`);
        onValue(roomRef, (roomSnap) => {
           const lData = roomSnap.exists() ? roomSnap.val() : {};
           setAllRoomsData(prev => ({
            ...prev,
            [roomId]: { ...prev[roomId], roomId, liveData: lData }
          }));
        });
      });
      setLoading(false);
    });
    return () => off(zoneRef, unsubZone);
  }, [geohashId]);

  // ... (Sorting Logic remains the same) ...
  const sortedRooms = useMemo(() => {
    const roomsArray = Object.values(allRoomsData);
    return roomsArray.sort((a, b) => {
        const scoreA = a.liveData?.finalScore?.score ?? 10;
        const scoreB = b.liveData?.finalScore?.score ?? 10;
        const sosA = (a.liveData?.sos_triggered || 0) > 0 ? 1 : 0;
        const sosB = (b.liveData?.sos_triggered || 0) > 0 ? 1 : 0;
        if (sosA !== sosB) return sosB - sosA;
        return scoreA - scoreB; 
    });
  }, [allRoomsData]);

  const alertRooms = sortedRooms.filter(r => {
      const score = r.liveData?.finalScore?.score ?? 10;
      const isSos = (r.liveData?.sos_triggered || 0) > 0;
      return score < 7 || isSos;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 h-20 flex items-center gap-4 shadow-sm shrink-0">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
           <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
             Zone Details <span className="text-slate-300">/</span> <span className="font-mono text-rose-600">{geohashId}</span>
           </h1>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
             {sortedRooms.length} Active Routes
           </p>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
          {/* MAIN GRID */}
          <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4"/>
                    <p className="font-bold text-slate-400">Syncing Zone Data...</p>
                </div>
            ) : sortedRooms.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No active rooms in this zone currently.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    {sortedRooms.map(room => (
                        <LiveRoomCard key={room.roomId} data={room} />
                    ))}
                </div>
            )}
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="w-80 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                      <Bell className="w-4 h-4 text-slate-400" /> Live Alerts
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-1">
                      Monitoring rooms with score &lt; 7 or SOS triggers.
                  </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {alertRooms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
                          <ShieldCheck className="w-10 h-10 mb-2 opacity-20 text-emerald-500" />
                          <p className="text-xs font-bold">All Quiet</p>
                          <p className="text-[10px]">No critical alerts in this zone.</p>
                      </div>
                  ) : (
                      alertRooms.map(room => (
                          <SidebarAlertItem key={room.roomId} data={room} />
                      ))
                  )}
              </div>
          </aside>
      </div>
    </div>
  )
}