import React, { useState } from 'react';
import RegionSelector from '../../../components/RegionSelector.jsx';
import { Waves, AlertTriangle, ArrowRight, Calendar, Satellite,ArrowLeft} from 'lucide-react';
import {api} from "../../../lib/api.js"
import { useAuth0 } from "@auth0/auth0-react"; 
import { useNavigate } from 'react-router-dom';

export default function CoastalErosion() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getAccessTokenSilently } = useAuth0(); 
  const navigate = useNavigate();

  const [historicYear, setHistoricYear] = useState(2000);
  const [currentYear, setCurrentYear] = useState(2024);

  const years = Array.from({ length: 26 }, (_, i) => 2000 + i);

  const handleRegionSelect = (coords) => {
    console.log("Region Selected:", coords);
    setSelectedCoordinates(coords);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedCoordinates) return;

    if (historicYear >= currentYear) {
      setError("Historic year must be earlier than the comparison year.");
      return;
    }

    setLoading(true);
    setError(null);
    
    const uniqueId = `region_${Math.random().toString(16).slice(2, 10)}`;
    const requestPayload = {
        regionGeoJson: {
            type: 'Polygon', 
            coordinates: selectedCoordinates
        },
        regionId: uniqueId,
        historicYear: parseInt(historicYear),
        currentYear: parseInt(currentYear)
    };

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const response = await api.post('/api/gee/generateCoastalReport', requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        navigate('/coastal-erosion/result', { state: { data: response.data } });
      } else {
        setError(response.data.error || "Analysis failed.");
      }

    } catch (err) {
      console.error(err);
      setError("Failed to connect to the analysis engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 relative">
      
      {/* ANIMATION OVERLAY
         Adapted to use Cyan colors to match the Coastal theme
      */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
           <div className="relative">
             <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse rounded-full" />
             <Satellite className="w-16 h-16 text-cyan-400 animate-bounce relative z-10" />
           </div>
           
           <h2 className="mt-8 text-2xl font-black tracking-tight">Acquiring Satellite Data</h2>
           <p className="text-slate-400 mt-2 font-mono text-sm">Connecting to Landsat Archive...</p>

           <div className="w-64 h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
             <div className="h-full bg-cyan-500 w-1/2 animate-[loading_2s_ease-in-out_infinite]" />
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-10">
        {/* NEW: Back Button */}
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-900">
          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to Environmental Hub"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>
          <div className="p-2 bg-cyan-100 rounded-lg text-cyan-700">
            <Waves size={24} strokeWidth={2.5} />
          </div>
          Coastal Erosion Tracker
        </h1>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>Landsat 7/8/9 Data</span>
          <div className="h-4 w-px bg-slate-300" />
          <span>Global Coverage</span>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden max-w-[1920px] mx-auto w-full">
        
        {/* LEFT PANEL: MAP */}
        <div className="flex-[2] bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative flex flex-col group">
           <RegionSelector onRegionSelect={handleRegionSelect} />
        </div>

        {/* RIGHT PANEL: CONTROLS */}
        <div className="flex-1 min-w-[400px] max-w-[500px] bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 flex flex-col overflow-y-auto custom-scrollbar">
           
           <div className="mb-8">
             <h2 className="text-xl font-black mb-2">Analysis Parameters</h2>
             <p className="text-slate-500 text-sm">Select the time range to compare shoreline changes.</p>
           </div>

           <div className="space-y-6">
             {/* Year Selectors */}
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                   <Calendar size={12} /> Historic Baseline
                 </label>
                 <div className="relative">
                   <select 
                     value={historicYear}
                     onChange={(e) => setHistoricYear(Number(e.target.value))}
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                   >
                     {years.map(y => (
                       <option key={`h-${y}`} value={y}>{y}</option>
                     ))}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                   <Calendar size={12} /> Comparison Year
                 </label>
                 <div className="relative">
                   <select 
                     value={currentYear}
                     onChange={(e) => setCurrentYear(Number(e.target.value))}
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                   >
                     {years.map(y => (
                       <option key={`c-${y}`} value={y}>{y}</option>
                     ))}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                 </div>
               </div>
             </div>

             {/* Action Button */}
             <button 
               onClick={handleAnalyze}
               disabled={!selectedCoordinates || loading}
               className={`w-full py-4 rounded-xl font-black text-lg tracking-wide flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                 !selectedCoordinates 
                   ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                   : loading 
                     ? 'bg-cyan-100 text-cyan-700 cursor-wait'
                     : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-200 hover:shadow-cyan-300'
               }`}
             >
               {loading ? (
                 "Processing..." 
               ) : (
                 <>
                   Analyze Erosion <ArrowRight size={20} />
                 </>
               )}
             </button>

             {/* Error Message */}
             {error && (
               <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-shake">
                 <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                 <p className="text-sm font-bold">{error}</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}