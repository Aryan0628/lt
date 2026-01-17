import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Calendar, Layers, TriangleAlert, Factory, Wind, Globe, Info } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react'; 
import { api } from '../../../lib/api.js';

export default function PollutionResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alertset, setAlertset] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const { data } = location.state || {};
  const result = data?.result;
  const reportRef = result?.reportref;
  console.log("result",result);
  console.log("reportRef",reportRef);

  const handleAlert = async () => {
    try {
      const token = await getAccessTokenSilently(); 
      await api.post(
        '/api/alerts/setPollutantAlert',
         {reportRef} , 
        {              
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
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
  const pollutantCode = result.pollutant_code || "UNK";

  const formatConcentration = (val) => {
    if (val === null || val === undefined) return "N/A";
    if (val === 0) return "0";
    if (val < 0.001) return val.toExponential(2);
    return val.toFixed(4);
  };

  // --- LEGEND COMPONENT ---
  // Matches Python: Black -> Blue -> Cyan -> Green -> Yellow -> Red
  const HeatmapLegend = () => (
    <div className="mt-3 p-2 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
      <div className="h-2 rounded-full w-full mb-2" 
           style={{ background: 'linear-gradient(to right, black, blue, cyan, lime, yellow, red)' }} 
      />
      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Low / None</span>
        <span className="text-yellow-400">Moderate</span>
        <span className="text-red-500">Hazardous</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/pollutants')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>

          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to GeoScope Dashboard"
          >
            <Globe className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
          </button>

          <div className="pl-4 ml-2 border-l border-slate-200">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-slate-600" /> Air Quality Report
            </h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
              {result.region_id || "Unknown Region"} • {result.parameter}
            </p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${
          isAlert 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isAlert ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {isAlert ? 'Hazardous Levels Detected' : 'Air Quality Within Limits'}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* 1. KEY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Wind className="w-3 h-3" /> Avg. Concentration
                </span>
                <div className={`text-4xl font-black mt-2 ${isAlert ? 'text-red-600' : 'text-slate-700'}`}>
                   {formatConcentration(result.average_value)}
                   <span className="text-sm text-slate-400 font-medium ml-1">{result.unit}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                    Threshold: {result.threshold_used}
                </p>
            </div>
            <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 transition-transform group-hover:scale-110 ${isAlert ? 'bg-red-500' : 'bg-slate-500'}`} />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="w-3 h-3" /> Observation Window
             </span>
             <div className="mt-4 space-y-2">
               <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                 <span className="text-slate-500 font-medium">Start Date:</span>
                 <span className="font-mono font-bold text-slate-700">{result.dates?.scan_window_start}</span>
               </div>
               <div className="flex justify-between text-sm pt-1">
                 <span className="text-slate-500 font-medium">End Date:</span>
                 <span className="font-mono font-bold text-slate-700">{result.dates?.scan_window_end}</span>
               </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div className="mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Classification</span>
                <div className={`text-xl font-black mt-1 ${isAlert ? 'text-red-600' : 'text-emerald-600'}`}>
                    {result.air_quality_status || (isAlert ? "POOR" : "GOOD")}
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

        {/* 2. HEATMAP & INFO GRID (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Heatmap Visualization (Spans 2 columns for better view, or 1 if you want 3 distinct) 
               Let's make it span 2 columns for the image, 1 column for info, or 1 each if we had 3 items.
               Here we have Image + Info. Let's do Image (2 cols) + Info (1 col).
           */}
           <div className="space-y-3 group lg:col-span-2">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Layers className="w-4 h-4 text-purple-500" /> 
               {pollutantCode} Concentration Heatmap
             </h3>
             <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative flex items-center justify-center p-2">
                {result.heatmap_url ? (
                  <img src={result.heatmap_url} alt="Pollution Heatmap" className="w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <Wind className="w-12 h-12 mb-2 opacity-20" />
                    <span className="text-sm font-mono">No Heatmap Generated</span>
                    <span className="text-xs opacity-60 mt-1 max-w-xs text-center">{result.message || "Data may be obscured by clouds."}</span>
                  </div>
                )}
             </div>
             <HeatmapLegend />
           </div>

           {/* Info Card (Moved into grid) */}
           <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 h-full">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-slate-600 shadow-sm">
                        <Info className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg">About {pollutantCode}</h4>
                </div>
                
                <div className="text-slate-600 text-sm leading-relaxed space-y-4 flex-1">
                    <p>
                        {pollutantCode === 'NO2' && "Nitrogen Dioxide is primarily emitted from vehicles and industrial facilities. It appears as Cyan/Green on the map at moderate levels."}
                        {pollutantCode === 'CO' && "Carbon Monoxide is a colorless gas produced by incomplete combustion. High levels (Red/Yellow) indicate heavy traffic or biomass burning."}
                        {pollutantCode === 'SO2' && "Sulfur Dioxide is released by power plants and volcanoes. It creates acid rain. Look for bright hotspots."}
                        {pollutantCode === 'O3' && "Ground-level Ozone is created by chemical reactions between pollutants in sunlight."}
                        {pollutantCode === 'AEROSOL' && "The UV Aerosol Index tracks dust, smoke, or ash. High positive values indicate absorbing aerosols."}
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                        <strong>Source:</strong> Sentinel-5P TROPOMI Sensor (European Space Agency).
                    </div>
                </div>
           </div>

        </div>

      </main>
    </div>
  );
}