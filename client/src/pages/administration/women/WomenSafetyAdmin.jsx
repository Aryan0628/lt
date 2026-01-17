import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { 
  ArrowLeft, 
  LogOut, 
  ShieldCheck, 
  MapPin, 
  Users, 
  Activity,
  Search,
  AlertTriangle,
  WifiOff 
} from "lucide-react"
import { ref, onValue, off } from "firebase/database"
import { db } from "../../../firebase/firebase"
import { useAuthStore } from "../../../store/useAuthStore"
export default function WomenSafetyAdmin() {
  const navigate = useNavigate()
  const { logout } = useAuth0()
  const { user: storedUser } = useAuthStore()
  
  const [localRooms, setLocalRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const localRoomRef = ref(db, 'women/localroom')

    const listener = onValue(localRoomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        
        const formattedRooms = Object.entries(data).map(([geoHashId, roomsInside]) => {
          const activeRoomCount = roomsInside ? Object.keys(roomsInside).length : 0;
          return {
            id: geoHashId,
            count: activeRoomCount,
            roomIds: roomsInside ? Object.keys(roomsInside) : []
          }
        })

        setLocalRooms(formattedRooms)
      } else {
        setLocalRooms([])
      }
      setLoading(false)
    })

    return () => off(localRoomRef, listener)
  }, [])

  const filteredRooms = localRooms.filter(room => 
    room.id.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalActiveUsers = localRooms.reduce((acc, room) => acc + room.count, 0)
  const isSystemOnline = localRooms.length > 0
  
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/administration")}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Women Safety
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Live Monitor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <img 
              src={storedUser?.picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-slate-200" 
            />
            <span className="text-sm font-bold text-slate-700">
              {storedUser?.name || "Administrator"}
            </span>
          </div>
          <button 
            onClick={() => logout({ returnTo: window.location.origin })}
            className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* TOP STATS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <MapPin className="w-7 h-7" />
                </div>
                <div>
                    <p className="text-slate-500 font-medium text-sm">Active Zones</p>
                    <h2 className="text-3xl font-black text-slate-900">{localRooms.length}</h2>
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Users className="w-7 h-7" />
                </div>
                <div>
                    <p className="text-slate-500 font-medium text-sm">Total Active Rooms</p>
                    <h2 className="text-3xl font-black text-slate-900">{totalActiveUsers}</h2>
                </div>
            </div>
            {/* SYSTEM STATUS CARD */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 relative overflow-hidden">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center z-10 transition-colors duration-300
                  ${isSystemOnline ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isSystemOnline ? (
                      <Activity className="w-7 h-7 animate-pulse" />
                    ) : (
                      <WifiOff className="w-7 h-7" />
                    )}
                </div>
                <div className="z-10">
                    <p className="text-slate-500 font-medium text-sm">System Status</p>
                    <h2 className={`text-lg font-bold flex items-center gap-2 transition-colors duration-300
                      ${isSystemOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                        <span className={`w-2.5 h-2.5 rounded-full transition-colors duration-300
                          ${isSystemOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}/> 
                        {isSystemOnline ? 'Online' : 'Offline'}
                    </h2>
                </div>
                <div className={`absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-rose-50 to-transparent transition-opacity duration-300
                  ${isSystemOnline ? 'opacity-50' : 'opacity-0'}`} />
            </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Local Safety Zones</h2>
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search Zone ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300 w-full sm:w-64 transition-all"
                />
            </div>
        </div>

        {/* GRID OF LOCAL ROOMS */}
        {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-rose-500 rounded-full animate-spin" />
                Loading Live Data...
            </div>
        ) : filteredRooms.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Active Zones Found</h3>
                <p className="text-slate-500">There are currently no active commute sessions in the database.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredRooms.map((room) => (
                    <div 
                        key={room.id} 
                        // --- NAVIGATION HANDLER ADDED HERE ---
                        onClick={() => navigate(`/administration/womenSafety/${room.id}`)}
                        className="group bg-white border border-slate-200 rounded-[1.5rem] p-6 hover:shadow-xl hover:border-rose-200 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    >
                        {/* Header: Map Pin & Status */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live
                            </span>
                        </div>
                        
                        {/* Body: Zone ID */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Zone ID
                            </p>
                            <h3 className="text-xl font-black text-slate-800 font-mono tracking-tight mb-4 truncate" title={room.id}>
                                {room.id}
                            </h3>                       
                            {/* Footer: Count */}
                            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">
                                    {room.count} {room.count === 1 ? 'Room' : 'Rooms'} Active
                                </span>
                            </div>
                        </div>
                        {/* Hover Effect Background */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-rose-50/0 via-transparent to-rose-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  )
}