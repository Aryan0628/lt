import React, { useState } from 'react';
import RegionSelector from '../../../components/RegionSelector.jsx'; 
import { Factory, Settings2, Calendar, Maximize2, Activity, Loader2, Satellite, Wind, CloudFog, AlertCircle, Droplets,ArrowLeft } from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react"; 
import { useNavigate } from 'react-router-dom'; 
import { api } from '../../../lib/api.js';

export default function Pollutants() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  
  // Analysis Parameters
  const [pollutant, setPollutant] = useState('NO2');
  const [recentDays, setRecentDays] = useState(6);      
  const [bufferMeters, setBufferMeters] = useState(5000);   
  const [threshold, setThreshold] = useState(0.00015); // Default for NO2
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { getAccessTokenSilently } = useAuth0(); 
  const navigate = useNavigate(); 

  const pollutantsConfig = {
    NO2: { label: "Nitrogen Dioxide (NO2)", icon: CloudFog, defaultThreshold: 0.00015 },
    CO: { label: "Carbon Monoxide (CO)", icon: Factory, defaultThreshold: 0.05 },
    SO2: { label: "Sulfur Dioxide (SO2)", icon: AlertCircle, defaultThreshold: 0.0005 },
    O3: { label: "Ozone (O3)", icon: Wind, defaultThreshold: 0.15 },
    AEROSOL: { label: "UV Aerosol Index", icon: Droplets, defaultThreshold: 1.0 },
  };

  const handlePollutantChange = (e) => {
    const newPollutant = e.target.value;
    setPollutant(newPollutant);
    // Auto-update threshold to recommended default when switching pollutant
    setThreshold(pollutantsConfig[newPollutant].defaultThreshold);
  };

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
        pollutant: pollutant,
        recentDays: recentDays,
        bufferMeters: bufferMeters,
        threshold: threshold
    };

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const response = await api.post('/api/gee/generatePollutantsReport', requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success || response.data.result?.status === 'success') {
         navigate('/pollutants/result', { state: { data: response.data } });
      } else {
         alert("Analysis returned no valid data. Please try a different region or time window.");
         setIsAnalyzing(false);
      }

    } catch (error) {
      console.error("Analysis Failed:", error);
      setIsAnalyzing(false); 
      alert("Analysis failed. Please check your connection or parameters.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative font-sans">
      
      {/* LOADING OVERLAY */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
           <div className="relative">
             <div className="absolute inset-0 bg-gray-500 blur-2xl opacity-30 animate-pulse rounded-full" />
             <div className="relative z-10 flex flex-col items-center">
                <Satellite className="w-20 h-20 text-gray-300 animate-[spin_4s_linear_infinite]" strokeWidth={1} />
                <Wind className="w-10 h-10 text-gray-500 absolute bottom-0 right-0 animate-pulse" />
             </div>
           </div>
           
           <h2 className="mt-8 text-3xl font-black tracking-tight bg-gradient-to-r from-gray-200 to-white bg-clip-text text-transparent">
             Analyzing Atmosphere
           </h2>
           <p className="text-gray-400 mt-3 font-mono text-sm tracking-wider uppercase">
             Connecting to Sentinel-5P TROPOMI Sensor...
           </p>

           <div className="w-80 h-1.5 bg-slate-800 rounded-full mt-10 overflow-hidden border border-slate-700">
             <div className="h-full bg-gray-400 w-1/3 animate-[loading_1.5s_ease-in-out_infinite] shadow-[0_0_15px_gray]" />
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
          <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner border border-slate-200">
            <Factory className="text-slate-600 w-6 h-6" /> 
          </div>
          Air Quality Monitor
        </h1>
        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>Sentinel-5P Data</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Global Coverage</span>
        </div>
      </div>

      <div className="flex-1 flex p-6 gap-6 overflow-hidden max-w-[1920px] mx-auto w-full">
        
        {/* LEFT: Map Component */}
        <div className="flex-[2] bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative group">
           <RegionSelector onRegionSelect={handleRegionSelect} />
        </div>

        {/* RIGHT: Analysis Panel */}
        <div className="flex-1 min-w-[380px] max-w-[450px] bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 overflow-y-auto custom-scrollbar">
           
           <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
             <Settings2 className="w-5 h-5 text-slate-400" />
             <h2 className="font-black text-xl text-slate-800">Analysis Config</h2>
           </div>
           
           {selectedCoordinates ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               
               {/* STATUS CARD */}
               <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4 shadow-sm">
                 <div className="w-3 h-3 mt-1.5 rounded-full bg-slate-500 animate-pulse shadow-[0_0_10px_gray]" />
                 <div>
                    <span className="text-slate-900 font-black text-sm block tracking-wide">REGION SELECTED</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                        Target coordinates locked. Select a pollutant below to begin spectral analysis.
                    </p>
                 </div>
               </div>

               {/* PARAMETERS FORM */}
               <div className="space-y-5">
                  
                  {/* Pollutant Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CloudFog className="w-3 h-3" /> Target Pollutant
                    </label>
                    <div className="relative">
                        <select 
                            value={pollutant}
                            onChange={handlePollutantChange}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white transition-all appearance-none cursor-pointer"
                        >
                            {Object.entries(pollutantsConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>

                  {/* Recent Days */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Observation Window
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={recentDays}
                            onChange={(e) => setRecentDays(parseInt(e.target.value) || 0)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                            min="1"
                            max="30"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">DAYS</span>
                    </div>
                  </div>

                  {/* Buffer Radius */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Maximize2 className="w-3 h-3" /> Point Buffer
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={bufferMeters}
                            onChange={(e) => setBufferMeters(parseInt(e.target.value) || 0)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">METERS</span>
                    </div>
                  </div>

                  {/* Threshold */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Concentration Threshold
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                            step="0.00001"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">mol/m²</span>
                    </div>
                  </div>
               </div>
               
               {/* ACTION BUTTON */}
               <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing} 
                className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-slate-300 hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-4 group"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                   </>
                 ) : (
                   <>
                     Measure {pollutant} <Factory className="w-5 h-5 group-hover:text-gray-300 transition-colors" />
                   </>
                 )}
               </button>

             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                 <Wind className="w-8 h-8 text-slate-300" />
               </div>
               <h3 className="text-slate-900 font-bold mb-2 text-lg">Waiting for Input</h3>
               <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[220px]">
                 Select a region on the map to initialize the atmospheric sensors.
               </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}