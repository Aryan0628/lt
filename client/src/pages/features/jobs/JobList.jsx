import JobCard from "./JobCard";
import { Loader2 } from "lucide-react";

export default function JobList({ jobs, onSelect, selectedJobId, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 space-y-2 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Finding opportunities...</p>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-10 px-6">
        <p className="text-zinc-500 text-sm">No jobs found in this area yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isSelected={selectedJobId === job.id}
          onClick={() => onSelect(job)}
        />
      ))}
    </div>
  );
}