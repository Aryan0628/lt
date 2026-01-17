import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, TriangleAlert, CheckCircle, Calendar, Map, Flame, ThermometerSun, Info } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react'; 
import { api } from '../../../lib/api';

export default function SurfaceHeatResult() {
  const [alertset, setAlertset] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  
  const stateData = location.state?.data;
  const result = stateData?.result || stateData;
  const reportRef = result?.reportref;

  const handleAlert = async () => {
    try {
      const token = await getAccessTokenSilently();
      await api.post(
        '/api/alerts/setSurfaceHeatAlert',
         { reportRef }, 
         {
          headers: {
            Authorization: `Bearer ${token}`
          }
         }
      );
      setAlertset(true);
      alert("Alert set successfully!");
    } catch (error) {
      console.error("Failed to set alert:", error);
    }
  }

  if (!result || !result.data_found) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <ThermometerSun className="w-12 h-12 text-slate-300" />
        <p>No thermal analysis data found. Please run a new analysis.</p>
        <button onClick={() => navigate('/surface-heat')} className="text-blue-600 font-bold hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const isExtremeHeat = result.max_temp_celsius > 35 || result.alert_triggered;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/surface-heat')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-orange-600" />
              Thermal Analysis Report
            </h1>
            <p className="text-xs text-slate-500 font-mono uppercase">{result.region_id}</p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${
          isExtremeHeat 
            ? 'bg-orange-50 border-orange-200 text-orange-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isExtremeHeat ? <Flame className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {isExtremeHeat ? 'High Heat Detected' : 'Normal Thermal Range'}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* KEY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Main Metric: Max Temp */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peak Surface Temp</span>
            <div className={`text-4xl font-black mt-2 ${isExtremeHeat ? 'text-orange-600' : 'text-slate-700'}`}>
              {result.max_temp_celsius}°C
            </div>
            <div className="flex gap-4 mt-2 text-sm text-slate-500">
                <p>Min: <span className="font-mono text-slate-700">{result.min_temp_celsius}°C</span></p>
                <p>Avg: <span className="font-mono text-slate-700">{result.mean_temp_celsius}°C</span></p>
            </div>
            
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${isExtremeHeat ? 'bg-orange-500' : 'bg-blue-500'}`} />
          </div>

          {/* Date / Metadata */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="w-3 h-3" /> Satellite Pass Info
             </span>
             <div className="mt-3 space-y-1">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Acquisition:</span>
                 <span className="font-mono font-bold">{result.image_date}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Source:</span>
                 <span className="font-mono font-bold text-blue-600">{result.satellite_source || 'Landsat'}</span>
               </div>
             </div>
          </div>

          {/* Download Action */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            <button 
                onClick={handleAlert}
                disabled={alertset}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all w-full justify-center ${
                  alertset 
                    ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' 
                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200'
                }`}
             >
               {alertset ? <CheckCircle className="w-4 h-4"/> : <TriangleAlert className="w-4 h-4" />} 
               {alertset ? "Alert Active" : "Set Thermal Alert"}
             </button> 
          </div>
        </div>

        {/* IMAGERY SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           
           {/* Thermal Map with Legend */}
           <div className="space-y-3">
             <div className="flex justify-between items-end">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <ThermometerSun className="w-4 h-4 text-orange-500" /> Thermal Layer (LST)
                </h3>
                <span className="text-xs text-slate-400 bg-slate-200 px-2 py-1 rounded">Range: -20°C to 50°C</span>
             </div>
             
             {/* Updated Container: 
                 1. 'max-w-[500px]' limits the width (and height because of aspect-square).
                 2. 'mx-auto' centers it horizontally in the column.
             */}
             <div className="aspect-square max-w-[500px] mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative flex items-center justify-center p-4">
                {result.heatmap_url ? (
                  <img 
                    src={result.heatmap_url} 
                    alt="Thermal Map" 
                    className="w-full h-full object-contain rounded-lg" 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">Processing Visual...</div>
                )}
             </div>

             {/* TEMPERATURE LEGEND BAR */}
             {/* Added mx-auto and max-w match to keep it aligned with the smaller image */}
             <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm max-w-[500px] mx-auto">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1 px-1">
                    <span>Freezing</span>
                    <span>Mild</span>
                    <span>Extreme</span>
                </div>
                {/* Gradient matching Python Palette */}
                <div 
                    style={{ background: 'linear-gradient(to right, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF0000)' }} 
                    className="h-3 w-full rounded-full ring-1 ring-black/5" 
                />
                <div className="flex justify-between text-xs font-mono text-slate-500 mt-2">
                    <span>-20°C</span>
                    <span>15°C</span>
                    <span>50°C</span>
                </div>
             </div>
           </div>

           {/* Analysis Details */}
           <div className="space-y-3">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Map className="w-4 h-4 text-slate-500" /> Analysis Details
             </h3>
             <div className="h-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
                
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Info className="w-3 h-3" /> Analysis ID
                   </span>
                   <p className="font-mono text-xs text-slate-700 mt-2 break-all bg-white p-2 rounded border border-slate-200">
                        {result.latest_image_id}
                   </p>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <span className="text-xs font-bold text-blue-400 uppercase">Start Window</span>
                            <p className="font-bold text-slate-800 mt-1">{result.dates?.scan_window_start}</p>
                        </div>
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <span className="text-xs font-bold text-blue-400 uppercase">End Window</span>
                            <p className="font-bold text-slate-800 mt-1">{result.dates?.scan_window_end}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                        <span className="text-xs font-bold text-orange-400 uppercase">Threshold Setting</span>
                        <div className="flex items-center justify-between mt-1">
                            <p className="font-bold text-slate-800">{result.threshold}°C</p>
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                {result.max_temp_celsius > result.threshold ? "Threshold Exceeded" : "Within Limits"}
                            </span>
                        </div>
                    </div>
                </div>
             </div>
           </div>

        </div>

      </main>
    </div>
  );
}