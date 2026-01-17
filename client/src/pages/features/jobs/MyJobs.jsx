import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth0 } from "@auth0/auth0-react";
import { Loader2 } from "lucide-react";

export default function MyJobs({ jobs, onSelect, onUpdate }) {
  const { getAccessTokenSilently } = useAuth0();
  const [loadingId, setLoadingId] = useState(null);

  const closeJob = async (e, jobId) => {
    e.stopPropagation(); // Prevent opening the job details
    setLoadingId(jobId);

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      await api.patch(
        `/api/jobs/${jobId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Notify parent to refresh list instead of reloading page
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error("Failed to close job", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!jobs.length) {
    return <div className="text-zinc-500 text-sm text-center py-4">No jobs posted yet.</div>;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-black/30 backdrop-blur-md border border-white/10 p-4 rounded-lg flex flex-col gap-3 hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => onSelect(job)}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-white">{job.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              job.status === "OPEN" 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-red-500/20 text-red-400 border-red-500/30"
            }`}>
              {job.status}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm text-zinc-400">
            <span>₹{job.amount}</span>
            <span>{job.time}</span>
          </div>

          {job.status === "OPEN" && (
            <button
              onClick={(e) => closeJob(e, job.id)}
              disabled={loadingId === job.id}
              className="mt-1 w-full flex items-center justify-center py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-medium transition-all"
            >
              {loadingId === job.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Close Deal"
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}