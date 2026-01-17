import React, { useState } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, ShieldCheck, Calendar, Thermometer, TriangleAlert, CheckCircle } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react'; 
import { api } from '../../../lib/api.js';

export default function FireResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0(); 
  const [alertset, setAlertset] = useState(false);
  const { data } = location.state || {};
  const result = data?.result;
  const reportRef = result?.reportref; 
  console.log("result",result)

  const handleAlert = async () => {
    if (!reportRef) {
        alert("Error: Report Reference is missing. Cannot set alert.");
        return;
    }

    try {
      const token = await getAccessTokenSilently();
      
      await api.post(
        '/api/alerts/setFireAlert',
        { reportRef }, 
        {              
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      setAlertset(true);
      alert("✅ Fire Alert set successfully!");
    } catch (error) {
      console.error("Failed to set alert:", error);
      alert("❌ Failed to set alert. See console for details.");
    }
  };

  if (!result) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        No analysis data found. Please run a new analysis.
      </div>
    );
  }

  const fireCount = result.active_fire_count || 0;
  const isAlert = result.alert_triggered;
  const startDate = result.dates?.scan_window_start ;
  const endDate = result.dates?.scan_window_end ;

  // --- LEGEND COMPONENTS (UPDATED TO CELSIUS) ---

  // 1. Thermal Legend (Safe/Background)
  // Kelvin Range: 280K -> 325K
  // Celsius Range: 7°C -> 52°C
  const ThermalLegend = () => (
    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="h-3 rounded-full w-full bg-gradient-to-r from-black via-blue-600 to-white mb-2" 
           style={{ background: 'linear-gradient(to right, #000000, #000080, #0000ff, #0080ff, #00ffff, #ffffff)' }} 
      />
      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <span>Cold Ground (7°C)</span>
        <span>Hot Surface (52°C)</span>
      </div>
    </div>
  );

  // 2. Fire Intensity Legend (Active)
  // Kelvin Range: 330K -> 400K+
  // Celsius Range: 57°C -> 127°C+
  const FireLegend = () => (
    <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
      <div className="h-3 rounded-full w-full mb-2" 
           style={{ background: 'linear-gradient(to right, #500000, #ff0000, #ff8000, #ffff00, #ffffff)' }} 
      />
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Smoldering (57°C)</span>
        <span>Severe Fire ({'>'}127°C)</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/fire')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Flame className={`w-5 h-5 ${isAlert ? 'text-orange-600' : 'text-slate-400'}`} />
                Fire Analysis Report
            </h1>
            <p className="text-xs text-slate-500 font-mono">ID: {result.region_id}</p>
          </div>
        </div>

        {/* Status Badge */}
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${
          isAlert 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isAlert ? <TriangleAlert className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {isAlert ? 'Active Fire Signatures' : 'No Fires Detected'}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* 1. KEY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Stat 1: Fire Count */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-3 h-3" /> Active Hotspots
            </span>
            <div className={`text-5xl font-black mt-2 ${fireCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
              {fireCount}
            </div>
            <p className="text-sm text-slate-500 mt-1">Confirmed high-confidence pixels</p>
            
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${fireCount > 0 ? 'bg-orange-500' : 'bg-slate-300'}`} />
          </div>

          {/* Stat 2: Window */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="w-3 h-3" /> Scan Window
             </span>
             <div className="mt-3 space-y-1">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Start:</span>
                 <span className="font-mono font-bold">{startDate}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">End:</span>
                 <span className="font-mono font-bold">{endDate}</span>
               </div>
             </div>
          </div>

          {/* Stat 3: Action Button */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            <button 
                  onClick={handleAlert}
                  disabled={alertset}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all w-full justify-center ${
                    alertset 
                      ? 'bg-emerald-500 text-white cursor-not-allowed' 
                      : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200'
                  }`}
              >
                <TriangleAlert className="w-4 h-4" /> 
                {alertset ? "Alerts Set" : "Set Fire Alerts"}
            </button>
          </div>
        </div>

        {/* 2. SATELLITE IMAGERY & INCIDENT LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* IMAGE 1: Baseline */}
           <div className="space-y-3">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Thermometer className="w-4 h-4 text-blue-500" /> Historical Baseline
             </h3>
             <div className="aspect-square bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative group flex items-center justify-center">
                {result.start_image_url ? (
                  <>
                    <img src={result.start_image_url} alt="Before" className="w-full h-full object-contain p-2" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">No Baseline Data</div>
                )}
             </div>
             <ThermalLegend />
           </div>

           {/* IMAGE 2: Active Scan */}
           <div className="space-y-3">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Flame className="w-4 h-4 text-orange-500" /> Active Thermal Scan
             </h3>
             <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative group flex items-center justify-center">
                {result.end_image_url ? (
                  <img src={result.end_image_url} alt="After" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">No Scan Data</div>
                )}
             </div>
             
             {/* DYNAMIC LEGEND: Fire vs Thermal */}
             {fireCount > 0 ? <FireLegend /> : <ThermalLegend />}
           </div>

           {/* COLUMN 3: INCIDENT LOG */}
           <div className="space-y-3 flex flex-col h-full">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <ShieldCheck className="w-4 h-4 text-slate-500" /> Incident Log
             </h3>
             
             <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
                {result.fires && result.fires.length > 0 ? (
                    <div className="overflow-y-auto custom-scrollbar p-2 space-y-2 h-full">
                        {result.fires.map((fire, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors flex items-center justify-between group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                                            fire.intensity === 'Severe' ? 'bg-red-500' : 'bg-orange-400'
                                        }`}>
                                            {fire.intensity || 'High'}
                                        </span>
                                        <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 font-mono mt-1">
                                        Lat: {fire.lat?.toFixed(4)}, Lng: {fire.lng?.toFixed(4)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-800">{fire.temp_c ? Math.round(fire.temp_c) : 'N/A'}°C</div>
                                    <div className="text-[10px] text-slate-400">Temp</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <ShieldCheck className="w-12 h-12 text-slate-200 mb-2" />
                        <p className="text-sm font-medium">No Incidents</p>
                        <p className="text-xs opacity-70 mt-1">No fire signatures detected in this region.</p>
                    </div>
                )}
             </div>
           </div>

        </div>
      </main>
    </div>
  );
}