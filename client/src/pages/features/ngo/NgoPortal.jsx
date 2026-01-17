import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import {
  Heart,
  HandHeart,
  Package,
  ShirtIcon,
  BookOpen,
  Pill,
  Laptop,
  MoreHorizontal,
  Navigation,
  ChevronLeft,
  Send,
  Loader2,
  MapPin
} from "lucide-react";

import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Textarea } from "../../../ui/textarea";

export default function NgoPortal({
  userLocation,
  onRequestLocation,
  onLocationUpdate,
  onMapVisibilityChange,
}) {
  const { getAccessTokenSilently } = useAuth0();

  const [userType, setUserType] = useState(null); // donor | recipient
  const [donorView, setDonorView] = useState(null); // null | post
  const [donorName, setDonorName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [locationMethod, setLocationMethod] = useState(null);
  const [donations, setDonations] = useState([]);
  const [interestedDonationIds, setInterestedDonationIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const [donationForm, setDonationForm] = useState({
    description: "",
    location: "",
    time: "",
  });

  const categories = [
    { id: "clothes", label: "Clothes", icon: ShirtIcon },
    { id: "books", label: "Books", icon: BookOpen },
    { id: "medicines", label: "Medicines", icon: Pill },
    { id: "electronics", label: "Electronics", icon: Laptop },
    { id: "others", label: "Others", icon: MoreHorizontal },
  ];

  /* ================= HELPERS ================= */
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      return data.results?.[0]?.formatted_address || "Current Location";
    } catch (e) { return "Unknown Location"; }
  };

  const geocodeAddress = async (address) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      return data.results?.[0]?.geometry?.location;
    } catch (e) { return null; }
  };

  /* ================= FETCHING ================= */
  useEffect(() => {
    if (userType !== "recipient" || !selectedCategory) return;
    const fetchDonations = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/api/donations?category=${selectedCategory}`);
        setDonations(res.data.data || []);
      } catch { setDonations([]); }
      finally { setIsLoading(false); }
    };
    fetchDonations();
  }, [userType, selectedCategory]);

  useEffect(() => {
    if (userType !== "recipient") return;
    const fetchMyInterests = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await api.get("/api/interests/mine", { headers: { Authorization: `Bearer ${token}` } });
        setInterestedDonationIds(new Set(res.data.map((i) => i.donationId)));
      } catch (err) { console.error(err); }
    };
    fetchMyInterests();
  }, [userType]);

  useEffect(() => {
    if (userType === "recipient" && donations.length > 0) {
      onMapVisibilityChange?.(true);
      onLocationUpdate?.({ lat: donations[0].lat, lng: donations[0].lng });
    }
  }, [userType, donations]);

  useEffect(() => {
    if (locationMethod === "current" && userLocation) {
      onMapVisibilityChange?.(true);
      onLocationUpdate?.(userLocation);
    }
  }, [locationMethod, userLocation]);

  const handleManualAddressBlur = async () => {
    if (!donationForm.location) return;
    const coords = await geocodeAddress(donationForm.location);
    if (coords) {
      onMapVisibilityChange?.(true);
      onLocationUpdate?.(coords);
    }
  };

  const resetState = () => {
    setUserType(null);
    setDonorView(null);
    setSelectedCategory(null);
    setLocationMethod(null);
    setDonations([]);
    onMapVisibilityChange?.(false);
  };

  const handleInterest = async (donation) => {
    if (interestedDonationIds.has(donation.id)) return;
    try {
      const token = await getAccessTokenSilently();
      await api.post("/api/interests", { donationId: donation.id }, { headers: { Authorization: `Bearer ${token}` } });
      setInterestedDonationIds((prev) => new Set([...prev, donation.id]));
    } catch (err) { console.error(err); alert("Failed to send interest"); }
  };

  const handleSubmitDonation = async () => {
    try {
      const token = await getAccessTokenSilently();
                if (
            !donorName.trim() ||
            !donationForm.description ||
            !donationForm.time ||
            !locationMethod
          ) {
            alert("Please fill all fields (including donor name)");
            return;
          }

      let lat, lng, address;
      if (locationMethod === "current") {
        lat = userLocation.lat;
        lng = userLocation.lng;
        address = await reverseGeocode(lat, lng);
      } else {
        const coords = await geocodeAddress(donationForm.location);
        lat = coords.lat;
        lng = coords.lng;
        address = donationForm.location;
      }
      await api.post("/api/donations", { category: selectedCategory, description: donationForm.description, address, lat, lng, time: donationForm.time, donorName,  }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Donation posted successfully!");
      setDonationForm({ description: "", location: "", time: "" });
      resetState();
    } catch (err) { console.error(err); alert("Donation failed"); }
  };

  /* ================= UI COMPONENTS ================= */
  const GlassCard = ({ children, className = "" }) => (
    <div className={`bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl p-1 shadow-xl ${className}`}>
      {children}
    </div>
  );

  const ActionButton = ({ onClick, icon: Icon, label, active = false, disabled = false }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-4 rounded-lg transition-all duration-300 border backdrop-blur-sm group
        ${active 
          ? "bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02]"
        } ${disabled ? "opacity-50 cursor-not-allowed hover:scale-100" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${active ? "bg-white text-black" : "bg-white/5 text-zinc-300 group-hover:bg-white/10"}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <span className={`font-semibold ${active ? "text-white" : "text-zinc-300 group-hover:text-white"}`}>{label}</span>
      </div>
      {!disabled && <ChevronLeft className="h-4 w-4 rotate-180 text-zinc-500 group-hover:text-white transition-colors" />}
    </button>
  );

  const BackButton = ({ onClick }) => (
    <button 
        onClick={onClick} 
        className="h-9 w-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors border border-zinc-700"
    >
        <ChevronLeft className="h-5 w-5" />
    </button>
  );

  return (
    <div className="space-y-6 text-zinc-100">
      
      {/* STEP 1: USER TYPE SELECTION */}
      {!userType && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">I want to...</p>
          <ActionButton onClick={() => { setUserType("donor"); setDonorView(null); }} icon={HandHeart} label="Donate Items" />
          <ActionButton onClick={() => setUserType("recipient")} icon={Package} label="Request Help" />
        </div>
      )}

      {/* STEP 2: DONOR MENU */}
      {userType === "donor" && donorView === null && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 pb-2 border-b border-white/5 h-12">
             <BackButton onClick={resetState} />
             <span className="text-sm font-medium text-zinc-400">Donor Mode</span>
          </div>
          <div className="space-y-3">
             <ActionButton onClick={() => setDonorView("post")} icon={Package} label="Post a Donation" />
             <ActionButton onClick={() => navigate("/ngo/inbox")} icon={Send} label="View Interest Requests" />
          </div>
        </div>
      )}

      {/* STEP 3: CATEGORY SELECTION */}
      {(userType === "donor" || userType === "recipient") && !selectedCategory && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-3 pb-2 border-b border-white/5 h-12">
             <BackButton onClick={resetState} />
             <span className="text-sm font-medium text-zinc-400">Select Category</span>
          </div>
          <div className="grid gap-3">
            {categories.map((c) => (
              <ActionButton key={c.id} onClick={() => setSelectedCategory(c.id)} icon={c.icon} label={c.label} />
            ))}
          </div>
        </div>
      )}

      {/* RECIPIENT: VIEW DONATIONS */}
      {userType === "recipient" && selectedCategory && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="flex items-center gap-3 pb-2 border-b border-white/5 h-12">
             <BackButton onClick={() => setSelectedCategory(null)} />
             <span className="text-sm font-medium text-zinc-400">Available Items</span>
          </div>

          <Button 
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200"
            onClick={() => navigate("/ngo/chats", { state: { category: selectedCategory } })}
          >
            Open Chats
          </Button>

          {isLoading ? (
             <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-zinc-600" /></div>
          ) : donations.length === 0 ? (
             <div className="text-center py-10 text-zinc-500 bg-white/5 rounded-xl border border-white/5">No active donations found.</div>
          ) : (
            <div className="space-y-3">
              {donations.map((d) => (
                <GlassCard key={d.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white text-lg">{d.description}</h4>
                    <span className="text-xs font-mono text-zinc-500 bg-black/20 px-2 py-1 rounded">{d.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                    <MapPin className="h-4 w-4 text-zinc-600" />
                    <span className="truncate">{d.address}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                        size="sm" variant="outline" 
                        className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 bg-transparent"
                        onClick={() => onLocationUpdate?.({ lat: d.lat, lng: d.lng })}
                    >
                        View Map
                    </Button>
                    <Button
                        size="sm"
                        className={`${interestedDonationIds.has(d.id) ? "bg-zinc-800 text-zinc-500" : "bg-white text-black hover:bg-zinc-200"}`}
                        disabled={interestedDonationIds.has(d.id)}
                        onClick={() => handleInterest(d)}
                    >
                        {interestedDonationIds.has(d.id) ? "Requested" : "Request"}
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DONOR: POST FORM */}
      {userType === "donor" && donorView === "post" && selectedCategory && (
         <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 pb-2 border-b border-white/5 h-12">
                <BackButton onClick={() => setSelectedCategory(null)} />
                <span className="text-sm font-medium text-zinc-400">Details</span>
            </div>
            
            <GlassCard className="p-4 space-y-4 bg-zinc-900/60">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Donor Name
                  </label>
                  <Input
                    className="bg-black/40 border-zinc-800 text-zinc-200 focus:ring-1 focus:ring-white/20"
                    placeholder="Enter your name"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
                    <Textarea
                        className="bg-black/40 border-zinc-800 text-zinc-200 focus:ring-1 focus:ring-white/20 min-h-[100px]"
                        placeholder="What are you donating?"
                        value={donationForm.description}
                        onChange={(e) => setDonationForm({ ...donationForm, description: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Availability</label>
                    <Input
                        className="bg-black/40 border-zinc-800 text-zinc-200 focus:ring-1 focus:ring-white/20"
                        placeholder="e.g. Weekends, 5-7 PM"
                        value={donationForm.time}
                        onChange={(e) => setDonationForm({ ...donationForm, time: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                     <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pickup Location</label>
                     {!locationMethod ? (
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                variant="outline" 
                                className="h-12 border-dashed border-zinc-700 hover:bg-white/5 text-zinc-400 hover:text-white bg-transparent flex flex-col items-center justify-center gap-1" 
                                onClick={() => { onRequestLocation(); setLocationMethod("current"); }}
                            >
                                <span className="flex items-center gap-2 font-medium"><Navigation className="h-4 w-4" /> My Location</span>
                            </Button>
                            <Button 
                                variant="outline" 
                                className="h-12 border-dashed border-zinc-700 hover:bg-white/5 text-zinc-400 hover:text-white bg-transparent flex flex-col items-center justify-center gap-1" 
                                onClick={() => setLocationMethod("manual")}
                            >
                                <span className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4" /> Manual Entry</span>
                            </Button>
                        </div>
                     ) : locationMethod === "manual" ? (
                        <div className="flex gap-2">
                            <Input
                                className="bg-black/40 border-zinc-800 text-zinc-200"
                                placeholder="Enter address..."
                                value={donationForm.location}
                                onChange={(e) => setDonationForm({ ...donationForm, location: e.target.value })}
                                onBlur={handleManualAddressBlur}
                                autoFocus
                            />
                            <button onClick={() => setLocationMethod(null)} className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"><ChevronLeft className="h-5 w-5" /></button>
                        </div>
                     ) : (
                         <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                             <span className="text-sm text-zinc-300 flex items-center gap-2"><Navigation className="h-3 w-3 text-emerald-500" /> Current Location</span>
                             <Button variant="ghost" size="sm" onClick={() => setLocationMethod(null)} className="text-xs text-zinc-500 hover:text-white h-auto p-0">Change</Button>
                         </div>
                     )}
                </div>

                <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 mt-4 h-12 font-bold shadow-lg shadow-white/5"
                    onClick={handleSubmitDonation}
                >
                    Confirm Donation
                </Button>
            </GlassCard>
         </div>
      )}
    </div>
  );
}