import { useState } from "react";
import { Button } from "../../../ui/button";
import { api } from "../../../lib/api.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useAuth0 } from "@auth0/auth0-react";
import {
  UploadCloud,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";

export default function GarbageUpload({ userLocation, onSubmit }) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { getAccessTokenSilently } = useAuth0();
  const user = useAuthStore((state) => state.user);

  const handleSubmit = async () => {
    if (!title || !image || !userLocation || !user) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      const formData = new FormData();
      formData.append("image", image);
      formData.append("title", title);
      formData.append("lat", userLocation.lat);
      formData.append("lng", userLocation.lng);
      formData.append("email", user.email);

      const res = await api.post("/api/garbage", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const savedReport = res.data.report;
      onSubmit(savedReport);

      setTitle("");
      setImage(null);
    } catch (err) {
      console.error("Upload failed", err);

      const message =
        err?.response?.data?.message ||
        "Failed to upload garbage report";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <UploadCloud className="h-5 w-5 text-green-400" />
        </div>
        <h2 className="text-white font-semibold text-lg">
          Report Issue
        </h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        <input
          placeholder="Describe the issue (e.g. Overflowing Bin)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all text-sm"
        />

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="hidden"
            id="garbage-upload"
          />
          <label
            htmlFor="garbage-upload"
            className="flex items-center justify-center w-full p-4 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-green-500/30 hover:bg-green-500/5 transition-all group"
          >
            <div className="flex flex-col items-center gap-2 text-zinc-400 group-hover:text-green-400">
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">
                {image ? image.name : "Click to upload photo"}
              </span>
            </div>
          </label>
        </div>

        {image && (
          <div className="relative rounded-lg overflow-hidden border border-white/10 h-32 w-full">
            <img
              src={URL.createObjectURL(image)}
              className="h-full w-full object-cover"
              alt="preview"
            />
          </div>
        )}

        {/* REMOVED SHADOW/GLOW FROM BUTTON */}
        <Button
          className="w-full bg-green-600 hover:bg-green-500 text-white"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Analyzing Image..." : "Submit Report"}
        </Button>
      </div>
    </div>
  );
}