import { useState } from "react";
import { Button } from "../../../ui/button";
import { UploadCloud, X, Image as ImageIcon, Loader2 } from "lucide-react";

export default function CleanupVerificationModal({ isOpen, onClose, onVerify, isLoading }) {
  const [image, setImage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!image) return;
    onVerify(image);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold text-white">Verify Cleanup</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-zinc-400 text-sm">
            To close this report, please upload a photo proving the area has been cleaned. 
            Our AI will verify the cleanup before resolving the report.
          </p>

          {/* Image Upload Input */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="hidden"
              id="cleanup-proof-upload"
            />
            <label
              htmlFor="cleanup-proof-upload"
              className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                image
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-white/10 hover:border-green-500/30 hover:bg-white/5"
              }`}
            >
              {image ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(image)}
                    alt="Proof preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <p className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                      Click to change
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <div className="p-3 rounded-full bg-white/5">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium">Click to upload proof</span>
                  <span className="text-xs text-zinc-500">JPG, PNG supported</span>
                </div>
              )}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSubmit}
              disabled={!image || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Close"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}