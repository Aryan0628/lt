import { useCallback, memo, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  Loader2,
  MapPin,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth0 } from "@auth0/auth0-react";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    {
      featureType: "road",
      elementType: "geometry.fill",
      stylers: [{ color: "#2c2c2c" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#000000" }],
    },
  ],
};

function GarbageMap({ userLocation, reports, selectedReport, onSelect }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const { getAccessTokenSilently } = useAuth0();

  const [map, setMap] = useState(null);
  const [voteLoading, setVoteLoading] = useState(false);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const openStreetView = () => {
    if (!map || !selectedReport?.location) return;
    const streetView = map.getStreetView();
    streetView.setPosition(selectedReport.location);
    streetView.setVisible(true);
  };

  
  const handleVote = async (type) => {
    if (!selectedReport) return;

    try {
      setVoteLoading(true);

      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const res = await api.patch(
        "/api/garbage/vote",
        {
          reportId: selectedReport.id,
          type, // "UP" | "DOWN"
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      
      selectedReport.upvotes = res.data.upvotes;
      selectedReport.downvotes = res.data.downvotes;
      selectedReport.userVote = res.data.userVote;
    } catch (err) {
      console.error("Vote failed", err);
    } finally {
      setVoteLoading(false);
    }
  };

  if (loadError)
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-white">
        <AlertCircle className="mr-2" /> Map Error
      </div>
    );

  if (!isLoaded)
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={15}
      options={mapOptions}
      onLoad={onLoad}
    >
      
      <Marker position={userLocation} title="You are here" />

      
      {reports.map((r) => (
        <Marker
          key={r.id}
          position={r.location}
          onClick={() => onSelect(r)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: r.type === "DUSTBIN" ? "#22c55e" : "#ef4444",
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            scale: r.type === "DUSTBIN" ? 8 : 6 + (r.severity || 1),
          }}
        />
      ))}

      
      {selectedReport && (
        <InfoWindow
          position={selectedReport.location}
          onCloseClick={() => onSelect(null)}
        >
          <div className="text-zinc-900 w-64 p-1">
            <img
              src={selectedReport.imageUrl}
              className="rounded-lg w-full h-32 object-cover"
              alt="report"
            />

            <h3 className="mt-2 font-bold text-sm truncate">
              {selectedReport.title}
            </h3>

            <p className="text-[11px] text-zinc-600 italic mt-1">
              {selectedReport.aiAnalysis}
            </p>

            {/* 👍👎 VOTING */}
            <div className="flex justify-between mt-3 text-xs">
              <button
                disabled={voteLoading}
                onClick={() => handleVote("UP")}
                className={`flex items-center gap-1 ${
                  selectedReport.userVote === "UP"
                    ? "text-green-600"
                    : "text-zinc-500 hover:text-green-500"
                }`}
              >
                <ThumbsUp size={14} />
                {selectedReport.upvotes || 0}
              </button>

              <button
                disabled={voteLoading}
                onClick={() => handleVote("DOWN")}
                className={`flex items-center gap-1 ${
                  selectedReport.userVote === "DOWN"
                    ? "text-red-600"
                    : "text-zinc-500 hover:text-red-500"
                }`}
              >
                <ThumbsDown size={14} />
                {selectedReport.downvotes || 0}
              </button>
            </div>

            {/* Street View */}
            <button
              onClick={openStreetView}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded flex justify-center gap-2"
            >
              <Eye size={14} />
              View on Street
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export default memo(GarbageMap);
