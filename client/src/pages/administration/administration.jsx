import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { 
  Globe,        
  ShieldCheck, 
  Trash2,       
  LogOut,
  Building2,    
  Factory,            
  CheckCircle2, 
} from "lucide-react"
import { useAuthStore } from "../../store/useAuthStore.js"

export default function CityAdminHub() {
  const navigate = useNavigate()
  const { user: auth0User, logout } = useAuth0()
  const { setUser, user: storedUser } = useAuthStore()
  const [transitionStage, setTransitionStage] = useState('idle')
  const [isBarActive, setIsBarActive] = useState(false)
  
  useEffect(() => {
    if (auth0User && !storedUser) {
      setUser(auth0User)
    }
  }, [auth0User, storedUser, setUser])

  const ADMIN_FEATURES = [
    {
      id: "geoscope",
      title: "GeoScope",
      description: "Comprehensive geospatial surveillance using Satellite Imagery (UrbanFlow).",
      icon: Globe,
      route: "/administration/geoscope", 
      // Icon Container Colors
      color: "text-indigo-600 bg-indigo-100 border-indigo-200",
      // Hover States (Matching the Icon)
      hoverBorder: "hover:border-indigo-400",
      hoverShadow: "hover:shadow-indigo-100/50",
      hoverText: "group-hover:text-indigo-600"
    },
    {
      id: "safety",
      title: "Women Safety",
      description: "Real-time distress monitoring, SOS alerts, and Safe Route analysis.",
      icon: ShieldCheck,
      route: "/administration/womenSafety",
      // Icon Container Colors
      color: "text-rose-600 bg-rose-100 border-rose-200",
      // Hover States (Matching the Icon)
      hoverBorder: "hover:border-rose-400",
      hoverShadow: "hover:shadow-rose-100/50",
      hoverText: "group-hover:text-rose-600"
    },
    {
      id: "garbage",
      title: "Smart Waste",
      description: "Garbage collection tracking, bin overflow alerts, and sanitation routes.",
      icon: Trash2,
      route: "/administration/garbage",
      // Icon Container Colors
      color: "text-emerald-600 bg-emerald-100 border-emerald-200",
      // Hover States (Matching the Icon)
      hoverBorder: "hover:border-emerald-400",
      hoverShadow: "hover:shadow-emerald-100/50",
      hoverText: "group-hover:text-emerald-600"
    },
  ]

  const handleFeatureClick = (route) => {
    if (route === "/administration/geoscope") {
      runTransitionSequence(route);
    } else {
      navigate(route);
    }
  }

  const runTransitionSequence = (route) => {
    setTransitionStage('scanning');
    
    setTimeout(() => setIsBarActive(true), 100);
    setTimeout(() => {
      setTransitionStage('processing');
    }, 1500);
    setTimeout(() => {
      setTransitionStage('completed');
    }, 3000);
    setTimeout(() => {
      navigate(route);
    }, 3800);
  }
  
  return (
    <div className="relative h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden animate-in fade-in duration-300">
      {transitionStage !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
          

          <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            
            <div className={`absolute transition-all duration-700 transform
              ${transitionStage === 'scanning' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 rotate-45'}
            `}>
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border border-slate-200 shadow-xl">
                <Factory className="w-12 h-12 text-slate-400 animate-pulse" />
              </div>
            </div>
            <div className={`absolute transition-all duration-1000 delay-300 transform
              ${transitionStage === 'processing' || transitionStage === 'completed' ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}
            `}>
               <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-xl shadow-emerald-100/50">
                <Globe className="w-12 h-12 text-emerald-600 animate-bounce" />
              </div>
            </div>
          </div>

          <div className="h-16 flex flex-col items-center justify-center overflow-hidden relative w-full text-center px-4">
             <p className={`absolute w-full text-xl font-mono text-slate-500 transition-all duration-500 transform
               ${transitionStage === 'scanning' ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}
             `}>
               Connecting to Satellite Feed...
             </p>
             
             <p className={`absolute w-full text-2xl font-black tracking-tight text-slate-800 transition-all duration-500 transform
               ${transitionStage === 'processing' ? 'translate-y-0 opacity-100' : (transitionStage === 'completed' ? '-translate-y-10 opacity-0' : 'translate-y-10 opacity-0')}
             `}>
               Calibrating GeoScope Data
             </p>

             <p className={`absolute w-full text-2xl font-black tracking-tight text-emerald-600 flex items-center justify-center gap-2 transition-all duration-300 transform
               ${transitionStage === 'completed' ? 'translate-y-0 opacity-100 scale-110' : 'translate-y-10 opacity-0'}
             `}>
               <CheckCircle2 className="w-6 h-6" /> System Ready
             </p>
          </div>
          <div className="w-64 h-1.5 bg-slate-200 rounded-full mt-8 overflow-hidden relative">
            <div 
              className={`h-full bg-emerald-500 transition-all ease-out rounded-full
              ${isBarActive ? 'w-full duration-[3500ms]' : 'w-0 duration-0'}
              `} 
            />
          </div>
        </div>
      )}
      
      {/* HEADER */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">
              CityAdmin
            </h1>
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
              Central Command
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

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-center">
          <div className="p-8 max-w-7xl mx-auto w-full">
            
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
                Administrative Control
              </h2>
              <p className="text-slate-500 text-xl max-w-2xl mx-auto">
                Manage city-wide operations, monitor safety protocols, and analyze geospatial environmental data from a single point.
              </p>
            </div>

            {/* GRID LAYOUT */}
            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              {ADMIN_FEATURES.map((feature) => {
                const Icon = feature.icon

                return (
                  <button 
                    key={feature.id} 
                    onClick={() => handleFeatureClick(feature.route)} 
                    className={`group relative w-full h-[280px] bg-white border border-slate-200 p-8 rounded-[2.5rem] flex flex-col items-center text-center justify-center gap-6 transition-all duration-300 overflow-hidden ${feature.hoverBorder} ${feature.hoverShadow} hover:shadow-2xl`}
                  >
                    
                    <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center text-4xl font-black group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm ${feature.color}`}>
                       <Icon strokeWidth={1.5} size={40} />
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className={`text-3xl font-black tracking-tight mb-3 text-slate-900 transition-colors ${feature.hoverText}`}>
                        {feature.title}
                      </h3>
                      <p className="text-base text-slate-500 font-medium leading-relaxed px-4">
                        {feature.description}
                      </p>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-50/0 via-slate-50/0 to-slate-50/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}