import React, { useState } from 'react';
import RegionSelector from '../../../components/RegionSelector.jsx';
import { CloudRain, Settings2, Calendar, Maximize2, Activity, Loader2, Waves, Radar,ArrowLeft } from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react"; 
import { useNavigate } from 'react-router-dom'; 
import { api } from '../../../lib/api.js';

export default function Flood() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  
  // Analysis Parameters
  const [recentDays, setRecentDays] = useState(10);      
  const [bufferMeters, setBufferMeters] = useState(1000);   
  const [threshold, setThreshold] = useState(5.0); // Percent threshold for alert       
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { getAccessTokenSilently } = useAuth0(); 
  const navigate = useNavigate(); 

  const handleRegionSelect = (coords) => {
    console.log("Region Selected:", coords);
    setSelectedCoordinates(coords);
  };

  const handleRunAnalysis = async () => {
    if (!selectedCoordinates) return;
    
    setIsAnalyzing(true);

    const uniqueId = `region_${Math.random().toString(16).slice(2, 10)}`;

    const requestPayload = {
        regionGeoJson: {
            type: 'Polygon', 
            coordinates: selectedCoordinates
        },
        regionId: uniqueId,
        recentDays: recentDays, 
        bufferMeters: bufferMeters,
        thresholdPercent: threshold
    };

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const response = await api.post('/api/gee/generateFloodReport', requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success || response.data.status === "success") {
          navigate('/flood/result', { state: { data: response.data } });
      } else {
          alert("Analysis returned no data. Try a different region.");
          setIsAnalyzing(false);
      }

    } catch (error) {
      console.error("Flood Analysis Failed:", error);
      setIsAnalyzing(false); 
      alert("Analysis failed. Please check your connection.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative">
      
      {/* LOADING OVERLAY */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
           <div className="relative">
             <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse rounded-full" />
             <div className="relative z-10 flex flex-col items-center">
                <Radar className="w-20 h-20 text-blue-400 animate-[spin_3s_linear_infinite]" />
                <Waves className="w-10 h-10 text-blue-200 absolute bottom-0 animate-bounce" />
             </div>
           </div>
           
           <h2 className="mt-8 text-3xl font-black tracking-tight bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
             Scanning Surface Water
           </h2>
           <p className="text-blue-300/80 mt-3 font-mono text-sm tracking-wider uppercase">
             Acquiring Sentinel-1 SAR Data...
           </p>

           <div className="w-80 h-1.5 bg-slate-800 rounded-full mt-10 overflow-hidden border border-slate-700">
             <div className="h-full bg-blue-500 w-1/3 animate-[loading_1.5s_ease-in-out_infinite] shadow-[0_0_10px_#3b82f6]" />
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <button 
                      onClick={() => navigate('/administration/geoscope')} 
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
                      title="Back to Environmental Hub"
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
                    </button>
          <div className="p-2.5 bg-blue-100 rounded-xl shadow-inner">
            <CloudRain className="text-blue-600 w-6 h-6" /> 
          </div>
          Flood Watch & Inundation Mapping
        </h1>
        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>Synthetic Aperture Radar</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>All-Weather Monitoring</span>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6 overflow-hidden max-w-[1920px] mx-auto w-full">
        
        {/* LEFT: MAP */}
        <div className="flex-[2] bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative group">
           <RegionSelector onRegionSelect={handleRegionSelect} />
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="flex-1 min-w-[380px] max-w-[450px] bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 overflow-y-auto custom-scrollbar">
           
           <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
             <Settings2 className="w-5 h-5 text-slate-400" />
             <h2 className="font-black text-xl text-slate-800">Mission Control</h2>
           </div>
           
           {selectedCoordinates ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* STATUS CARD */}
               <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4 shadow-sm">
                 <div className="w-3 h-3 mt-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]" />
                 <div>
                    <span className="text-blue-900 font-black text-sm block tracking-wide">TARGET LOCKED</span>
                    <p className="text-xs text-blue-600/80 mt-1 leading-relaxed font-medium">
                        Geospatial coordinates captured. Radar analysis ready to deploy.
                    </p>
                 </div>
               </div>

               {/* PARAMETERS FORM */}
               <div className="space-y-5">
                  
                  {/* Recent Days */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Analysis Window
                    </label>
                    <div className="relative group">
                        <input 
                            type="number" 
                            value={recentDays}
                            onChange={(e) => setRecentDays(parseInt(e.target.value) || 0)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all pl-4"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">DAYS AGO</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium ml-1">
                        Scans Sentinel-1 passes from the last {recentDays} days.
                    </p>
                  </div>

                  {/* Buffer Radius */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Maximize2 className="w-3 h-3" /> ROI Buffer
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={bufferMeters}
                            onChange={(e) => setBufferMeters(parseInt(e.target.value) || 0)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">METERS</span>
                    </div>
                  </div>

                  {/* Sensitivity Threshold */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Alert Threshold
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                            step="0.5"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">% AREA</span>
                    </div>
                  </div>
               </div>
               
               {/* ACTION BUTTON */}
               <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing} 
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-4 group"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                   </>
                 ) : (
                   <>
                     Scan For Floods <Waves className="w-5 h-5 group-hover:animate-pulse" />
                   </>
                 )}
               </button>

             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                 <CloudRain className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="text-slate-900 font-bold mb-2 text-lg">Waiting for Input</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[220px]">
                 Draw a polygon on the map to initialize the flood detection engine.
               </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}