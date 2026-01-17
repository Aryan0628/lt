import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Calendar, Layers, Waves, TriangleAlert, Globe } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import {api} from "../../../lib/api.js"

export default function CoastalResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alertset, setAlertset] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  // 1. Get Data from Navigation State
  const { data } = location.state || {};
  const result = data?.result;
  const reportRef = result?.reportref;
  console.log("result",result);
  console.log("reportRef",reportRef);

  const handleAlert = async () => {
    try {
      const token = await getAccessTokenSilently();
      await api.post(
        '/api/alerts/setCoastalErosionAlert',
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
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <Waves className="w-12 h-12 opacity-20" />
        <p>No coastal analysis data found.</p>
        <button 
            onClick={() => navigate('/coastal-erosion')}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold text-sm transition-colors"
        >
            Start New Analysis
        </button>
      </div>
    );
  }

  const isErosion = result.erosion_detected;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/coastal-erosion')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-transparent hover:border-slate-200"
            title="Back to Analysis"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>

          {/* Added Dashboard Button */}
          <button 
            onClick={() => navigate('/administration/geoscope')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group border border-transparent hover:border-slate-200"
            title="Back to GeoScope Dashboard"
          >
            <Globe className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
          </button>

          <div className="pl-4 ml-2 border-l border-slate-200">
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
               Coastal Analysis Report
            </h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">
                {result.region_id || "Unknown Region"}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${
          isErosion 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {isErosion ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {result.message}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* 1. KEY STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Net Change */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Waves className="w-3 h-3" /> Net Shoreline Change
            </span>
            <div className={`text-4xl font-black mt-2 flex items-baseline gap-1 ${result.net_land_change_hectares < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {result.net_land_change_hectares > 0 ? '+' : ''}{result.net_land_change_hectares}
              <span className="text-lg text-slate-400 font-bold">Ha</span>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
                {result.net_land_change_hectares < 0 ? 'Land area lost to water' : 'Land area gained'}
            </p>
          </div>

          {/* Card 2: Analysis Window */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Calendar className="w-3 h-3" /> Comparison Period
             </span>
             <div className="mt-4 flex items-center justify-between px-4">
               <div className="text-center">
                 <p className="text-xs text-slate-400 font-bold uppercase">Baseline</p>
                 <p className="text-2xl font-black text-slate-700">{result.comparison_years.split('vs')[0]}</p>
               </div>
               <div className="h-px w-10 bg-slate-300"></div>
               <div className="text-center">
                 <p className="text-xs text-slate-400 font-bold uppercase">Current</p>
                 <p className="text-2xl font-black text-cyan-600">{result.comparison_years.split('vs')[1]}</p>
               </div>
             </div>
          </div>

          {/* Card 3: Actions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
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

        {/* 2. MAIN VISUALIZATION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[500px]">
           
           {/* Left: Info Panel (UPDATED LEGEND) */}
           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-y-auto">
              <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">Understanding the Map </h3>
                  <div className="space-y-6">
                      
                      {/* RED: EROSION */}
                      <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 border border-red-200">
                              <div className="w-6 h-6 bg-red-600 rounded-sm"></div>
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800">Red Areas (Erosion)</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                  <strong>Land Lost:</strong> Was land in baseline year, now submerged.
                              </p>
                          </div>
                      </div>

                      {/* GREEN: ACCRETION */}
                      <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600 shrink-0 border border-green-200">
                              <div className="w-6 h-6 bg-green-500 rounded-sm"></div>
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800">Green Areas (Accretion)</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                  <strong>New Land:</strong> Was water in baseline year, now land.
                              </p>
                          </div>
                      </div>

                      {/* LIGHT GRAY: STABLE LAND */}
                      <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200">
                              <div className="w-6 h-6 bg-slate-300 rounded-sm"></div>
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800">Gray Areas (Stable Land)</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                  Land that has remained unchanged over time.
                              </p>
                          </div>
                      </div>

                      {/* DEEP BLUE: STABLE WATER */}
                      <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-800 shrink-0 border border-blue-100">
                              <div className="w-6 h-6 bg-[#004b8d] rounded-sm"></div>
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800">Blue Areas (Stable Water)</h4>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                  Water bodies that have remained constant.
                              </p>
                          </div>
                      </div>

                  </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400 mt-6">
                  <strong>Technical Note:</strong> Analysis uses MNDWI (Modified Normalized Difference Water Index) to distinguish water from land, filtering out cloud cover where possible.
              </div>
           </div>

           {/* Right: Large Map Visualization */}
           <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative group">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                {result.visualization_url ? (
                  <img 
                    src={result.visualization_url} 
                    alt="Coastal Change Map" 
                    className="w-full h-full object-contain relative z-10" 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    <p>Visualization unavailable</p>
                  </div>
                )}

                {/* Floating Overlay Label */}
                <div className="absolute top-6 right-6 z-20 bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                    <Layers className="w-4 h-4 text-white" />
                    <span className="text-xs font-bold text-white tracking-widest uppercase">Composite Layer</span>
                </div>
           </div>
        </div>

      </main>
    </div>
  );
}