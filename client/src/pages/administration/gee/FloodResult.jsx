import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Calendar, Layers, Droplets, Waves, TriangleAlert, Globe, Info } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { api } from '../../../lib/api.js';

export default function FloodResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alertset, setAlertset] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const { data } = location.state || {};
  const result = data?.result;
  const reportRef = result?.reportref;
  
  const handleAlert = async () => {
    try {
      const token = await getAccessTokenSilently();
      await api.post('/api/alerts/setFloodAlert', {reportRef}, { headers: { Authorization: `Bearer ${token}` }});
      setAlertset(true);
      alert("Alert set successfully!");
    } catch (error) {
      console.error("Failed to set alert:", error);
    }
  }; 
  
  if (!result) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        No analysis data found. Please run a new analysis.
      </div>
    );
  }

  const isAlert = result.alert_triggered;

  // --- LEGEND COMPONENTS ---
  
  const RadarLegend = () => (
    <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="h-2 rounded-full w-full bg-gradient-to-r from-black to-white mb-2" />
      <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        <span>Water/Flat</span>
        <span>Urban/Veg</span>
      </div>
    </div>
  );

  const FloodLegend = () => (
    <div className="mt-3 p-2 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
         {/* Background Gradient (Dry Land) */}
         <div className="h-2 flex-1 rounded-l-full bg-gradient-to-r from-gray-900 via-gray-500 to-gray-200" />
         {/* Flood Color */}
         <div className="h-2 w-1/3 rounded-r-full bg-[#00ffff] shadow-[0_0_10px_#00ffff]" />
      </div>
      
      {/* UPDATED LABELS */}
      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
        {/* Left Side Labels (Dry) */}
        <div className="flex justify-between w-full pr-4 border-r border-slate-700">
            <span>Water/Flat</span>
            <span className="text-slate-200">Urban/Veg</span> {/* Added Context Here */}
        </div>
        {/* Right Side Label (Flood) */}
        <div className="pl-4 text-cyan-400">
            Flooded
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/flood')} className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-transparent hover:border-slate-200">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <button onClick={() => navigate('/administration/geoscope')} className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200">
            <Globe className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
          </button>
          <div className="pl-4 ml-2 border-l border-slate-200">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Waves className="w-5 h-5 text-blue-500" /> Flood Analysis Report
            </h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{result.region_id || "Unknown Region"}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${isAlert ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {isAlert ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {isAlert ? 'Flood Risk Detected' : 'Water Levels Normal'}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* 1. KEY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Droplets className="w-3 h-3" /> Inundated Area
                </span>
                <div className={`text-4xl font-black mt-2 ${isAlert ? 'text-red-600' : 'text-blue-600'}`}>
                {result.flooded_area_sqkm} <span className="text-lg text-slate-400 font-bold">km²</span>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                    {result.flooded_percentage}% of total area
                </p>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${isAlert ? 'bg-red-500' : 'bg-blue-500'}`} />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="w-3 h-3" /> Sentinel-1 Pass Dates
             </span>
             <div className="mt-4 space-y-2">
               <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                 <span className="text-slate-500 font-medium">Scan Start:</span>
                 <span className="font-mono font-bold text-slate-700">{result.dates?.scan_window_start}</span>
               </div>
               <div className="flex justify-between text-sm pt-1">
                 <span className="text-slate-500 font-medium">Scan End:</span>
                 <span className="font-mono font-bold text-slate-700">{result.dates?.scan_window_end}</span>
               </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div className="mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Threshold</span>
                <div className="text-lg font-bold text-slate-700 mt-1">
                    &gt; {result.threshold_percent}% Coverage
                </div>
             </div>
             <button 
                onClick={handleAlert}
                disabled={alertset}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  alertset 
                    ? 'bg-green-500 text-white cursor-not-allowed' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
             >
               <TriangleAlert className="w-4 h-4" /> 
               {alertset ? "Alert Active" : "Set Alerts"}
             </button>
          </div>
        </div>

        {/* 2. SATELLITE IMAGERY & INFO (3 COLUMN GRID) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* COL 1: Historical Radar Baseline */}
           <div className="space-y-3 group">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Layers className="w-4 h-4 text-slate-400" /> 
               Radar Baseline (Dry)
             </h3>
             <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative flex items-center justify-center p-2">
                {result.start_image_url ? (
                  <img src={result.start_image_url} alt="Radar Baseline" className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-mono">No Baseline Imagery Available</div>
                )}
             </div>
             <RadarLegend />
           </div>

           {/* COL 2: Detected Flood Extent */}
           <div className="space-y-3 group">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Layers className="w-4 h-4 text-cyan-500" /> 
               Detected Flood Extent
             </h3>
             <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl relative flex items-center justify-center p-2">
                {result.end_image_url ? (
                  <img src={result.end_image_url} alt="Flood Map" className="w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-mono">No Flood Mask Generated</div>
                )}
                
                {/* Minimal Overlay */}
                <div className="absolute top-3 right-3">
                   <span className="flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                   </span>
                </div>
             </div>
             <FloodLegend />
           </div>

           {/* COL 3: Understanding Card */}
           <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-6 flex flex-col gap-4 h-full">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Info className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-blue-900 text-lg">Report Context</h4>
              </div>
              
              <div className="space-y-4 flex-1">
                <p className="text-blue-800/80 text-sm leading-relaxed">
                    This analysis uses <strong>Synthetic Aperture Radar (SAR)</strong>, which penetrates clouds and rain to see the ground clearly during storms.
                </p>
                
                <div className="bg-white/60 p-3 rounded-xl border border-blue-100/50">
                    <h5 className="text-xs font-bold text-blue-900 uppercase mb-1">Radar Baseline</h5>
                    <p className="text-xs text-blue-700">Shows typical ground reflection. Water reflects radar away (dark), while buildings reflect it back (bright).</p>
                </div>

                <div className="bg-white/60 p-3 rounded-xl border border-blue-100/50">
                    <h5 className="text-xs font-bold text-blue-900 uppercase mb-1">Flood Extent</h5>
                    <p className="text-xs text-blue-700">Cyan areas indicate new water bodies detected by comparing the current pass against the baseline.</p>
                </div>
              </div>
           </div>

        </div>
      </main>
    </div>
  );
}