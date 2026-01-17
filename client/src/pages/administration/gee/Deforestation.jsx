import React, { useState } from 'react';
import RegionSelector from '../../../components/RegionSelector.jsx'; 
import { 
  Trees, 
  Settings2, 
  Calendar, 
  Maximize2, 
  Activity, 
  Loader2, 
  Satellite, 
  ArrowLeft // Added ArrowLeft import
} from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react"; 
import { useNavigate } from 'react-router-dom'; 
import { api } from '../../../lib/api.js';

export default function Deforestation() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  
  const [lookbackDays, setLookbackDays] = useState(6);      
  const [bufferMeters, setBufferMeters] = useState(1000);   
  const [threshold, setThreshold] = useState(-0.15);        

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
        buffermeters: bufferMeters,
        threshold: threshold
    };

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const response = await api.post('/api/gee/generateDeforestationReport', requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      navigate('/deforestation/result', { state: { data: response.data } });

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
             <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse rounded-full" />
             <Satellite className="w-16 h-16 text-emerald-400 animate-bounce relative z-10" />
           </div>
           
           <h2 className="mt-8 text-2xl font-black tracking-tight">Acquiring Satellite Data</h2>
           <p className="text-slate-400 mt-2 font-mono text-sm">Connecting to Copernicus Sentinel-2...</p>

           <div className="w-64 h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
             <div className="h-full bg-emerald-500 w-1/2 animate-[loading_2s_ease-in-out_infinite]" />
           </div>
        </div>
      )}


      {/* Header Area */}
      <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="flex items-center gap-4">
          
          {/* NEW: Back Button */}
          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to Environmental Hub"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>

          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Trees className="text-emerald-600 w-6 h-6" /> 
            </div>
            Deforestation Analysis
          </h1>
        </div>
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
               <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                 <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 animate-pulse" />
                 <div>
                    <span className="text-emerald-800 font-bold text-sm block">Region Active</span>
                    <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                        Coordinates captured. Configure parameters below or use defaults.
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Default: 6"
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Default: 1000"
                    />
                  </div>

                  {/* Threshold */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Sensitivity Threshold
                    </label>
                    <input 
                        type="number" 
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Default: -0.15"
                        step="0.05"
                    />
                  </div>
               </div>
               
               {/* 3. ACTION BUTTON */}
               <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing} // Disable while running
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-emerald-200 hover:shadow-2xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                   </>
                 ) : (
                   "Run Analysis"
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
                 Please draw a polygon or select a point on the map to unlock analysis controls.
               </p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}