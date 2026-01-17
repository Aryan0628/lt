import { Trash2, History, AlertTriangle } from "lucide-react";

export default function MyComplaints({
  reports,
  onDelete,
  onSelect,
  error, // 👈 NEW PROP
}) {
  return (
    <div className="space-y-3">
      {/* 🔴 ERROR MESSAGE */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-zinc-500 space-y-2 border border-dashed border-white/10 rounded-xl bg-white/5">
          <History className="h-8 w-8 opacity-50" />
          <p className="text-sm">No complaints submitted yet</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <h3 className="text-zinc-300 font-medium text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              My History
            </h3>
            <span className="text-xs text-zinc-500">
              {reports.length} reports
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all"
              >
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => onSelect(r)}
                >
                  <p className="text-sm text-white font-medium group-hover:text-green-300">
                    {r.title}
                  </p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        r.type === "DUSTBIN"
                          ? "bg-blue-500"
                          : "bg-red-500"
                      }`}
                    />
                    {r.type === "DUSTBIN"
                      ? "Dustbin Request"
                      : "Garbage Report"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
