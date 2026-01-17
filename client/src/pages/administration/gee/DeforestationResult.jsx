import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Calendar, Layers, TriangleAlert, Globe } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react'; 
import { api } from '../../../lib/api';

export default function DeforestationResult() {
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
        '/api/alerts/setDeforestationAlert',
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

  // Reusable Legend Component for Standard NDVI
  const NdviLegend = () => (
    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="h-3 rounded-full w-full bg-gradient-to-r from-[#d7191c] via-[#ffffbf] to-[#1a9641] mb-2" />
      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span>Low NDVI (Bare/Water)</span>
        <span>High NDVI (Healthy Veg)</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/deforestation')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to Deforestation"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
          </button>

          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to GeoScope Dashboard"
          >
            <Globe className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
          </button>

          <div className="pl-4 ml-2 border-l border-slate-200">
            <h1 className="text-xl font-black text-slate-900">Deforestation Analysis Report</h1>
            <p className="text-xs text-slate-500 font-mono">{result.region_id}</p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${
          isAlert 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isAlert ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {isAlert ? 'High Deforestation Detected' : 'Stable Vegetation'}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 1. KEY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">NDVI Change</span>
            <div className={`text-4xl font-black mt-2 ${result.mean_ndvi_change < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {result.mean_ndvi_change}
            </div>
            <p className="text-sm text-slate-500 mt-1">Threshold was {result.threshold}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="w-3 h-3" /> Analysis Window
             </span>
             <div className="mt-3 space-y-1">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Start:</span>
                 <span className="font-mono font-bold">{result.dates.scan_window_start}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">End:</span>
                 <span className="font-mono font-bold">{result.dates.scan_window_end}</span>
               </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
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

        {/* IMAGES GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* BEFORE IMAGE */}
           <div className="space-y-3">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Layers className="w-4 h-4 text-emerald-500" /> Baseline (Before)
             </h3>
             <div className="aspect-square bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative flex items-center justify-center p-2">
                {result.start_image_url ? (
                  <img src={result.start_image_url} alt="Before" className="w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">No Image</div>
                )}
             </div>
             {/* LEGEND ADDED */}
             <NdviLegend />
           </div>

           {/* AFTER IMAGE */}
           <div className="space-y-3">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Layers className="w-4 h-4 text-blue-500" /> Recent (After)
             </h3>
             <div className="aspect-square bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative flex items-center justify-center p-2">
                {result.end_image_url ? (
                  <img src={result.end_image_url} alt="After" className="w-full h-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">No Image</div>
                )}
             </div>
             {/* LEGEND ADDED */}
             <NdviLegend />
           </div>
           
           {/* MASK IMAGE */}
           <div className="space-y-3">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Layers className="w-4 h-4 text-red-500" /> Deforestation Mask
             </h3>
             <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative group flex items-center justify-center p-2">
                <div className="absolute inset-0 opacity-50 grayscale">
                  {result.start_image_url && <img src={result.start_image_url} className="w-full h-full object-contain" />}
                </div>
                
                {result.change_image_url && (
                  <img src={result.change_image_url} alt="Change Mask" className="absolute inset-0 w-full h-full object-contain z-10 p-2" />
                )}
             </div>
             
             {/* SPECIFIC LEGEND FOR LOSS MASK ADDED */}
             <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
                {/* Gradient matches Python script: Dark Red -> Red -> Orange */}
                <div className="h-3 rounded-full w-full bg-gradient-to-r from-[#300000] via-[#ff0000] to-[#ff8c00] mb-2" />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Severe Loss (-0.6)</span>
                  <span>Moderate Loss ({result.threshold})</span>
                </div>
             </div>

           </div>
        </div>
      </main>
    </div>
  );
}