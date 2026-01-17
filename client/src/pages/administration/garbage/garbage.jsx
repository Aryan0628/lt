import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  CheckCircle,
  MapPin,
  AlertCircle,
  TrendingUp,
  Clock,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  LogOut
} from "lucide-react";
import {api} from "../../../lib/api";

import { Button } from "../../../ui/button";
import { Card } from "../../../ui/card";
import { Alert, AlertDescription } from "../../../ui/alert";
import GarbageMap from "../../features/garbage/GarbageMap";
import CleanupVerificationModal from "../../features/garbage/CleanupVerificationModal";

export default function GarbageAdmin() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State for resolving issues
  const [activeReport, setActiveReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Map Selection State
  const [selectedReport, setSelectedReport] = useState(null);

  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const { getAccessTokenSilently, user, logout } = useAuth0();

  // ✅ ONLY request location on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setLocation(loc);
        fetchNearbyReports(loc.lat, loc.lng);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("Failed to get location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchNearbyReports = async (lat, lng) => {
    if (!lat || !lng) return;

    try {
      setLoading(true);
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const res = await api.get(
        `/api/garbage/nearby?lat=${lat}&lng=${lng}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReports(res.data.reports || []);
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: "Failed to load garbage reports.",
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCleanup = async (report, image) => {
    if (!report || !image || !location) return;

    setVerifying(true);

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const formData = new FormData();
      formData.append("image", image);
      formData.append("lat", location.lat);
      formData.append("lng", location.lng);

      const res = await api.post(
        `/api/garbage/${report.id}/verify-cleanup`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setStatusMsg({ type: "success", text: res.data.message });
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      closeModal();
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Verification failed",
      });
    } finally {
      setVerifying(false);
    }
  };

  const openModal = (report) => {
    setActiveReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setActiveReport(null);
    setIsModalOpen(false);
  };

  if (locationError) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-3xl border border-slate-200 shadow-xl p-10">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">
            Location Access Required
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Administrative verification tools require precise geolocation to validate cleanup efforts.
          </p>
          <p className="text-red-600 font-semibold mb-6 text-sm bg-red-50 py-2 px-4 rounded-lg inline-block">
            {locationError}
          </p>
          <Button onClick={requestLocation} className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-6 rounded-xl font-bold transition-all">
            Retry Access
          </Button>
        </div>
      </div>
    );
  }

  // ⏳ WAITING FOR LOCATION
  if (!location) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
        <p className="text-slate-500 font-medium animate-pulse">
          Acquiring satellite position...
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden animate-in fade-in duration-300">
      
      {/* HEADER */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        {/* LEFT: Branding & Back Button */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/administration')} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
          </button>
          
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">
              UrbanFlow
            </h1>
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
              Waste Management Command
            </p>
          </div>
        </div>

        {/* RIGHT: User Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <img 
              src={user?.picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-slate-200" 
            />
            <span className="text-sm font-bold text-slate-700">
              {user?.name || "Administrator"}
            </span>
          </div>

          <button 
            onClick={() => logout({ returnTo: window.location.origin })} 
            className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 max-w-7xl mx-auto w-full">

            {/* Status Alert */}
            {statusMsg.text && (
              <Alert
                className={`mb-8 border border-l-4 rounded-xl shadow-sm ${
                  statusMsg.type === "success"
                    ? "bg-emerald-50 border-emerald-200 border-l-emerald-500 text-emerald-800"
                    : "bg-red-50 border-red-200 border-l-red-500 text-red-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {statusMsg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <AlertDescription className="font-semibold">
                    {statusMsg.text}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <StatCard title="Total Reports" value={reports.length} icon={<TrendingUp className="w-6 h-6" />} color="emerald" />
              <StatCard title="High Hazard" value={reports.filter(r => r.hazard === "High").length} icon={<AlertCircle className="w-6 h-6" />} color="red" />
              <StatCard title="Pending Review" value={reports.length} icon={<Clock className="w-6 h-6" />} color="blue" />
            </div>

            {/* Map Section */}
            <div className="h-[600px] w-full bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-200 mb-12 relative z-0">
              <GarbageMap
                userLocation={location}
                reports={reports}
                selectedReport={selectedReport}
                onSelect={setSelectedReport}
              />
            </div>

            {/* Content Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Reports</h2>
                <span className="text-slate-500 font-medium bg-slate-100 px-4 py-1 rounded-full text-sm">
                    {reports.length} Pending
                </span>
            </div>

            {/* Reports Grid */}
            {loading ? (
              <SkeletonGrid />
            ) : reports.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                {reports.map((report) => (
                  <div key={report.id} className="group bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col">
                    
                    {/* Image Area */}
                    <div className="relative h-56 w-full overflow-hidden">
                        <img 
                            src={report.imageUrl} 
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            alt="Garbage Report" 
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-white/50">
                            {report.hazard || "Medium"} Priority
                        </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col space-y-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-extrabold text-slate-900 truncate mb-2">{report.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <MapPin className="w-4 h-4 text-emerald-500" /> 
                            {report.distance ? `${report.distance} km away` : 'Vicinity Unknown'}
                        </div>
                      </div>
                      
                      <Button
                        className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-6 rounded-xl shadow-lg shadow-slate-200 hover:shadow-emerald-200 transition-all active:scale-95"
                        onClick={() => openModal(report)}
                      >
                        <CheckCircle className="mr-2 w-5 h-5" />
                        Verify Cleanup
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CleanupVerificationModal
        isOpen={isModalOpen}
        isLoading={verifying}
        onClose={closeModal}
        onVerify={(image) => handleVerifyCleanup(activeReport, image)}
      />
    </div>
  );
}

/* ---------- Helper Components (Styled to Match Theme) ---------- */

function StatCard({ title, value, icon, color }) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  return (
    <div className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex justify-between items-start z-10">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</p>
            <div className={`p-2 rounded-xl border ${colorMap[color]} transition-colors`}>{icon}</div>
        </div>
        <p className="text-4xl font-black text-slate-900 z-10">{value}</p>
        
        {/* Decorative background circle */}
        <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${color === 'red' ? 'bg-red-500' : color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[400px] rounded-[2rem] bg-slate-100 animate-pulse border border-slate-200" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-200 border-dashed">
      <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <ImageIcon size={40} className="text-slate-300" />
      </div>
      <h3 className="text-2xl font-black text-slate-900">No Pending Reports</h3>
      <p className="text-slate-500 mt-2 font-medium">All clean! Enjoy the view. 🎉</p>
    </div>
  );
}