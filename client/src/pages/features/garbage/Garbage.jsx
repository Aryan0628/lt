import { useEffect, useState } from "react";
import { Button } from "../../../ui/button";
import { MapPin, AlertCircle, ArrowLeft, List, Map as MapIcon } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import GarbageMap from "./GarbageMap";
import GarbageUpload from "./GarbageUpload";
import CleanupVerificationModal from "./CleanupVerificationModal";
import { api } from "../../../lib/api";
import MyComplaints from "./MyComplaints";
import FloatingLines from "../../../ui/FloatingLines";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "../../../store/useAuthStore";

export default function GarbageFeature() {
  const { getAccessTokenSilently } = useAuth0();
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [reportToVerify, setReportToVerify] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // --- Responsive State ---
  const [mobileTab, setMobileTab] = useState("map"); // 'map' | 'list'

  const user = useAuthStore((state) => state.user);
  const myReports = reports.filter((r) => r.userId === user?.sub);

  // --- Location Handlers ---
  const requestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (err) {
      console.error("Location denied", err);
      alert("Location access is required to report garbage accurately.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const addReport = (report) => {
    setReports((prev) => [...prev, report]);
    // On mobile, switch to map to see the new pin
    if (window.innerWidth < 1024) {
        setMobileTab("map");
    }
  };

  const handleVote = async (reportId, type) => {
    const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });
    try {
      const res = await api.patch(
        "/api/garbage/vote",
        { reportId, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { upvotes, downvotes, userVote } = res.data;
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, upvotes, downvotes, userVote } : r
        )
      );
      setSelectedReport((prev) =>
        prev && prev.id === reportId
          ? { ...prev, upvotes, downvotes, userVote }
          : prev
      );
    } catch (err) {
      console.error("Vote failed", err);
    }
  };

  const initiateDeleteProcess = (reportId) => {
    setReportToVerify(reportId);
    setIsVerifyModalOpen(true);
  };

  const handleVerifyAndClose = async (proofImage) => {
    if (!reportToVerify || !userLocation) return;
    setIsVerifying(true);
    const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });
    const formData = new FormData();
    formData.append("image", proofImage);
    formData.append("lat", userLocation.lat);
    formData.append("lng", userLocation.lng);

    try {
      const res = await api.post(
        `/api/garbage/${reportToVerify}/verify-cleanup`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (res.data.success) {
        setReports((prev) => prev.filter((r) => r.id !== reportToVerify));
        setSelectedReport((prev) => (prev?.id === reportToVerify ? null : prev));
        alert("Cleanup Verified! Report closed.");
        setIsVerifyModalOpen(false);
      }
    } catch (err) {
      console.error("Verification failed", err);
      alert(err.response?.data?.message || "Verification failed.");
    } finally {
      setIsVerifying(false);
      setReportToVerify(null); 
      if(!isVerifying) setIsVerifyModalOpen(false); 
    }
  };

  const fetchReports = async () => {
    const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });
    const res = await api.get("/api/garbage/nearby", {
      params: { lat: userLocation.lat, lng: userLocation.lng },
      headers: { Authorization: `Bearer ${token}` },
    });
    setReports(res.data.reports);
  };

  useEffect(() => {
    if (!userLocation) return;
    fetchReports();
  }, [userLocation]);

  // --- 1. LOCATION ACCESS UI (GLASS THEME) ---
  if (!userLocation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 md:px-6 relative z-10 bg-slate-950 overflow-hidden font-sans">
        
        {/* Background: Floating Lines Only */}
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
            <FloatingLines />
        </div>
        
        {/* Glass Card */}
        <div className="max-w-md w-full space-y-8 bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative z-10">
            <div className="flex justify-center">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
                    <MapPin className="h-8 w-8 md:h-10 md:w-10 text-white drop-shadow-glow" />
                </div>
            </div>

            <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-sm">Enable Location</h1>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-md">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5 drop-shadow-sm" />
                    <div>
                        <p className="text-white text-sm font-semibold">Privacy First</p>
                        <p className="text-zinc-300 text-xs mt-1 leading-normal">
                            Your location is encrypted and only shared when you actively submit a report.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Glass Button */}
                <Button
                    onClick={requestLocation}
                    disabled={isLoadingLocation}
                    className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-6 text-lg rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02]"
                >
                    {isLoadingLocation ? (
                        <span className="flex items-center gap-2">
                            <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full"></span>
                            Detecting...
                        </span>
                    ) : (
                        "Allow Access"
                    )}
                </Button>

                <button 
                    onClick={handleSkip}
                    className="w-full text-zinc-400 hover:text-white text-sm font-medium py-2 transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </div>
      </div>
    );
  }

  // --- 2. MAIN DASHBOARD UI (GLASS THEME) ---
  return (
    <div className="relative h-screen w-screen bg-slate-950 flex flex-col overflow-hidden font-sans">
      
      {/* GLOBAL BACKGROUND: Floating Lines */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <FloatingLines />
      </div>

      {/* HEADER - GLASS */}
      <header className="relative z-50 w-full h-16 px-4 md:px-6 flex items-center justify-between bg-black/20 backdrop-blur-xl border-b border-white/10 shrink-0 overflow-hidden shadow-sm">
        
        {/* Header-Specific Floating Lines Effect */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
            <div className="w-full h-full scale-150 origin-top">
                <FloatingLines />
            </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
             <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white drop-shadow-sm">
            Urban<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Flow</span>
          </h1>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex relative z-10 overflow-hidden">
        
        {/* SIDEBAR (Report & List) - GLASS */}
        {/* Mobile: Absolute full screen translucent | Desktop: Relative fixed width translucent */}
        <div 
          className={`
            absolute inset-0 lg:static lg:w-96 flex flex-col border-r border-white/10 
            bg-slate-950/80 lg:bg-black/50 backdrop-blur-3xl z-30 lg:z-20 shadow-2xl 
            transition-transform duration-300 ease-in-out
            ${mobileTab === 'list' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
            {/* Left Panel Floating Lines (visible through the glass sidebar) */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden lg:opacity-20">
                <FloatingLines />
            </div>

            <div className="relative z-10 p-6 space-y-8 overflow-y-auto flex-1 scrollbar-none pb-28 lg:pb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                      EcoSnap
                    </h1>
                    <p className="text-sm text-zinc-400">
                    Report garbage dumps or overflow to help keep the city clean.
                    </p>
                </div>

                <GarbageUpload userLocation={userLocation} onSubmit={addReport} />

                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <MyComplaints
                    reports={myReports}
                    onDelete={initiateDeleteProcess} 
                    onSelect={(report) => {
                      setSelectedReport(report);
                      setMobileTab("map"); // Switch to map on mobile when a report is clicked
                    }}
                />
            </div>
        </div>

        {/* MAP PANEL */}
        <div className="flex-1 w-full h-full relative z-10">
            <GarbageMap
                userLocation={userLocation}
                reports={reports}
                selectedReport={selectedReport}
                onSelect={setSelectedReport}
                onVote={handleVote}
            />
        </div>

        {/* MOBILE BOTTOM NAVIGATION PILL - GLASS */}
        {/* Only visible on lg:hidden */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 lg:hidden w-auto pointer-events-none">
          <div className="flex items-center bg-black/40 border border-white/20 rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-3xl pointer-events-auto">
             <button
               onClick={() => setMobileTab("map")}
               className={`
                 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300
                 ${mobileTab === "map" 
                    ? "bg-white/20 text-white border border-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)]" 
                    : "text-zinc-400 hover:text-white hover:bg-white/10"}
               `}
             >
               <MapIcon className="w-4 h-4" />
               Map
             </button>
             <button
               onClick={() => setMobileTab("list")}
               className={`
                 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300
                 ${mobileTab === "list" 
                    // Purple glass effect for active state
                    ? "bg-purple-500/30 text-purple-100 border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
                    : "text-zinc-400 hover:text-white hover:bg-white/10"}
               `}
             >
               <List className="w-4 h-4" />
               Report
             </button>
          </div>
        </div>

      </div>

      {/* --- Verification Modal --- */}
      <CleanupVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onVerify={handleVerifyAndClose}
        isLoading={isVerifying}
      />
    </div>
  );
}