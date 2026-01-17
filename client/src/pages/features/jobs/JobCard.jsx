import { MapPin, Clock, IndianRupee } from "lucide-react";

export default function JobCard({ job, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
        isSelected
          ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.15)]"
          : "bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700"
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate ${isSelected ? "text-blue-400" : "text-zinc-200"}`}>
            {job.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {job.description}
          </p>
          
          <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
             {/* Time */}
             {job.time && (
              <span className="flex items-center gap-1 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800">
                <Clock className="h-3 w-3" />
                {job.time}
              </span>
            )}
             
             {/* Distance (if available) */}
             <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.distance ? `${job.distance.toFixed(1)} km` : "Nearby"}
             </span>
          </div>
        </div>

        {/* COST SECTION - Always Visible */}
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-0.5 font-bold text-sm px-2.5 py-1 rounded-lg border ${
            isSelected 
              ? "bg-blue-500/20 text-blue-300 border-blue-500/30" 
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            <IndianRupee className="h-3 w-3" />
            <span>{job.amount || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}