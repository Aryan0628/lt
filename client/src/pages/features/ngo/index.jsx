import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Navigation, 
  ArrowLeft 
} from "lucide-react";
import NgoRoutes from "./routes";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import GoogleMapComponent from "../../../components/google-map1";
import { NGO_FEATURE } from "./config";
import FloatingLines from "../../../ui/FloatingLines";

export default function NgoPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const navigate = useNavigate();
  const feature = NGO_FEATURE;

  const requestLocation = async () => {
    setIsLoadingLocation(true)
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })

      setShowMap(true)
    } catch (error) {
      console.error("Location permission denied:", error)
      alert("Please allow location access")
    } finally {
      setIsLoadingLocation(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col relative overflow-hidden">
      
      {/* GLOBAL HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md z-20 shrink-0 h-16 flex items-center relative">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 w-full h-full overflow-hidden">
            <div className="w-full h-full scale-150 origin-center"><FloatingLines /></div>
        </div>
        
        <div className="px-6 w-full flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-zinc-400 hover:text-white p-0 border-none shadow-none hover:bg-transparent mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
               <h1 className="text-2xl font-black tracking-tighter text-white">
            Urban<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Flow</span>
          </h1>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL — NGO PORTAL */}
        <div className="w-[450px] border-r border-zinc-800 bg-zinc-900/80 backdrop-blur-sm relative flex flex-col shadow-2xl z-10">
           <div className="absolute inset-0 z-0 pointer-events-none opacity-20"><FloatingLines /></div>
           
           {/* Header Section */}
           <div className="p-6 z-10 bg-transparent relative">
             <h2 className="text-2xl font-bold text-white mb-2">KindShare</h2>
             <p className="text-sm text-zinc-400 leading-relaxed">
               Bridge the gap between communities and NGOs for faster, more effective social impact.
             </p>
           </div>

           <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-6">
              <NgoRoutes
                userLocation={userLocation}
                isLoadingLocation={isLoadingLocation}
                onRequestLocation={requestLocation}
                onLocationUpdate={setUserLocation}
                onMapVisibilityChange={setShowMap}
              />
           </div>
        </div>

        {/* RIGHT PANEL — MAP */}
        <div className="flex-1 relative bg-zinc-950">
          {showMap && userLocation && (
            <GoogleMapComponent
              currentUserLocation={userLocation}
              selectedFeature={feature.id}
              isLoadingLocation={isLoadingLocation}
            />
          )}
          {!userLocation && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-zinc-600 text-sm font-medium tracking-widest uppercase">Map Inactive</div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}