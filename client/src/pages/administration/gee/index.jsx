import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { 
  Trees, 
  Flame, 
  Waves, 
  CloudRain, 
  Factory, 
  ThermometerSun, 
  LogOut, 
  ArrowLeft
} from "lucide-react"
import { useAuthStore } from "../../../store/useAuthStore" 

export default function EnvironmentalHub() {
  const navigate = useNavigate()
  const { user: auth0User, logout } = useAuth0()
  const { setUser, user: storedUser } = useAuthStore()

  // Sync Auth0 user to store
  useEffect(() => {
    if (auth0User && !storedUser) {
      setUser(auth0User)
    }
  }, [auth0User, storedUser, setUser])


  const ULTRON_FEATURES = [
    {
      id: "deforestation",
      title: "Deforestation",
      description: "Monitor forest loss and vegetation health over time.",
      icon: Trees,
      route: "/deforestation",
      color: "text-emerald-600 bg-emerald-100 border-emerald-200",
      // Dynamic Hover Colors
      hoverBorder: "hover:border-emerald-400",
      hoverText: "group-hover:text-emerald-600",
      hoverShadow: "hover:shadow-emerald-100/50"
    },
    {
      id: "fire",
      title: "Fire Alert",
      description: "Real-time active fire detection and burn area analysis.",
      icon: Flame,
      route: "/fire",
      color: "text-orange-600 bg-orange-100 border-orange-200",
      hoverBorder: "hover:border-orange-400",
      hoverText: "group-hover:text-orange-600",
      hoverShadow: "hover:shadow-orange-100/50"
    },
    {
      id: "coastal",
      title: "Coastal Erosion",
      description: "Track shoreline changes and rising sea levels.",
      icon: Waves,
      route: "/coastal-erosion",
      color: "text-cyan-600 bg-cyan-100 border-cyan-200",
      hoverBorder: "hover:border-cyan-400",
      hoverText: "group-hover:text-cyan-600",
      hoverShadow: "hover:shadow-cyan-100/50"
    },
    {
      id: "flood",
      title: "Flood Watch",
      description: "Inundation mapping and precipitation warnings.",
      icon: CloudRain,
      route: "/flood",
      color: "text-blue-600 bg-blue-100 border-blue-200",
      hoverBorder: "hover:border-blue-400",
      hoverText: "group-hover:text-blue-600",
      hoverShadow: "hover:shadow-blue-100/50"
    },
    {
      id: "pollutants",
      title: "Air Pollutants",
      description: "Analyze NO2, CO, and Aerosol concentrations.",
      icon: Factory,
      route: "/pollutants",
      color: "text-slate-600 bg-slate-100 border-slate-200",
      hoverBorder: "hover:border-slate-400",
      hoverText: "group-hover:text-slate-600",
      hoverShadow: "hover:shadow-slate-200/50"
    },
    {
      id: "heat",
      title: "Surface Heat",
      description: "Land Surface Temperature (LST) and heat island monitoring.",
      icon: ThermometerSun,
      route: "/surface-heat",
      color: "text-red-600 bg-red-100 border-red-200",
      hoverBorder: "hover:border-red-400",
      hoverText: "group-hover:text-red-600",
      hoverShadow: "hover:shadow-red-100/50"
    },
  ]

  const handleFeatureClick = (route) => {
    navigate(route)
  }

  return (
    <div className="relative h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden animate-in fade-in duration-300">
      
      {/* HEADER */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        {/* LEFT: Branding & Back Button */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/administration')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>
          
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xl shadow-sm">
            UL
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">
              UrbanFlow
            </h1>
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
              Geospatial Intelligence
            </p>
          </div>
        </div>

        {/* RIGHT: User Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* User Pill */}
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <img 
              src={storedUser?.picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=Ultron"} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-slate-200" 
            />
            <span className="text-sm font-bold text-slate-700">
              {storedUser?.name || "Guest User"}
            </span>
          </div>
        </div>
      </header>

      {/* BODY - Light Theme Grid */}
      <div className="flex-1 flex overflow-hidden z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-7xl mx-auto">
            
            <div className="text-center mb-10 mt-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                Environmental Monitoring
              </h2>
              <p className="text-slate-500 text-lg">
                Select a module to analyze geospatial data via Google Earth Engine
              </p>
            </div>

            {/* GRID LAYOUT */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
              {ULTRON_FEATURES.map((feature) => {
                const Icon = feature.icon

                return (
                  <button 
                    key={feature.id} 
                    onClick={() => handleFeatureClick(feature.route)} 
                    // UPDATED: Dynamically inject hoverBorder and hoverShadow from the object
                    className={`group relative w-full min-h-[200px] bg-white border border-slate-200 p-8 rounded-[2rem] flex items-start gap-6 ${feature.hoverBorder} hover:shadow-xl ${feature.hoverShadow} transition-all duration-300 overflow-hidden text-left`}
                  >
                    
                    <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl font-black group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm ${feature.color}`}>
                       <Icon strokeWidth={1.5} />
                    </div>
                    
                    <div className="flex-1 relative z-10">
                      {/* UPDATED: Dynamically inject hoverText from the object */}
                      <h3 className={`text-2xl font-black tracking-tight mb-2 text-slate-900 ${feature.hoverText} transition-colors`}>
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    
                    {/* Arrow Indicator */}
                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900">
                        →
                      </div>
                    </div>
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