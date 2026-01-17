import React, { useState } from 'react';
import RegionSelector from '../../../components/RegionSelector.jsx';
import { Flame, Settings2, Calendar, Maximize2, Loader2, Satellite,ArrowLeft } from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';

export default function Fire() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  
  
  const [lookbackDays, setLookbackDays] = useState(5);      
  const [bufferMeters, setBufferMeters] = useState(5000); 
  
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);   
  
  const { getAccessTokenSilently } = useAuth0(); 
  const navigate = useNavigate(); 

  const handleRegionSelect = (coords) => {
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
      previousDays: lookbackDays,
      buffermeters: bufferMeters
    };

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const response = await api.post('/api/gee/generateFireReport', requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      
      navigate('/fire/result', { state: { data: response.data } });

    } catch (error) {
      console.error("Analysis Failed:", error);
      setIsAnalyzing(false); 
      alert("Analysis failed. Please try again.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative">
      
  
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
           <div className="relative">
             <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 animate-pulse rounded-full" />
             <Satellite className="w-16 h-16 text-orange-400 animate-bounce relative z-10" />
           </div>
           
           <h2 className="mt-8 text-2xl font-black tracking-tight">Scanning for Thermal Anomalies</h2>
           <p className="text-slate-400 mt-2 font-mono text-sm">Accessing MODIS/VIIRS Fire Data...</p>

           <div className="w-64 h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
             <div className="h-full bg-orange-500 w-1/2 animate-[loading_2s_ease-in-out_infinite]" />
           </div>
        </div>
      )}

      {/* Header Area */}
      <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10">
        {/* NEW: Back Button */}
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to Environmental Hub"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>
          <div className="p-2 bg-orange-100 rounded-lg">
            <Flame className="text-orange-600 w-6 h-6" /> 
          </div>
          Fire Alert System
        </h1>
      </div>

      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        
        {/* LEFT: Map Component */}
        <div className="flex-[2] bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
           <RegionSelector onRegionSelect={handleRegionSelect} />
        </div>

        {/* RIGHT: Analysis Panel */}
        <div className="flex-1 bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 overflow-y-auto custom-scrollbar">
           <div className="flex items-center gap-2 mb-6">
             <Settings2 className="w-5 h-5 text-slate-400" />
             <h2 className="font-black text-xl text-slate-800">Analysis Controls</h2>
           </div>
           
           {selectedCoordinates ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* 1. STATUS CARD */}
               <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                 <div className="w-2 h-2 mt-2 rounded-full bg-orange-500 animate-pulse" />
                 <div>
                    <span className="text-orange-800 font-bold text-sm block">Target Area Defined</span>
                    <p className="text-xs text-orange-600 mt-1 leading-relaxed">
                        Ready to scan for active fires and burn scars.
                    </p>
                 </div>
               </div>

               {/* 2. INPUTS FORM */}
               <div className="space-y-4">
                  {/* Lookback Days */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Recent Search Window (Days)
                    </label>
                    <input 
                        type="number" 
                        value={lookbackDays}
                        onChange={(e) => setLookbackDays(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="Default: 5"
                        min="1"
                        max="30"
                    />
                  </div>

                  {/* Buffer Radius */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <Maximize2 className="w-3 h-3" /> Point Buffer (Meters)
                    </label>
                    <input 
                        type="number" 
                        value={bufferMeters}
                        onChange={(e) => setBufferMeters(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="Default: 5000"
                        step="1000"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 pl-1">
                        Applied if selecting a single point.
                    </p>
                  </div>
               </div>
               
               {/* 3. ACTION BUTTON */}
               <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-orange-200 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" /> Detecting...
                   </>
                 ) : (
                   "Run Fire Analysis"
                 )}
               </button>

             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                 <Maximize2 className="w-8 h-8" />
               </div>
               <h3 className="text-slate-900 font-bold mb-2">No Region Selected</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                 Draw a region on the map to check for fire activity.
               </p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}