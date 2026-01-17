import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";

export default function ComplaintHistoryModal({ open, onClose, complaints }) {
  if (!open) return null;

  return (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
    <Card className="w-[650px] max-h-[80vh] overflow-y-auto bg-black border border-white/20 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.08)]">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-lg">
          Complaint History
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {complaints.length === 0 && (
          <p className="text-sm text-gray-400 text-center">
            No complaints found
          </p>
        )}

        {complaints.map(c => (
          <div
            key={c.id}
            className="border border-white/10 rounded-xl p-4 space-y-1 bg-black/40"
          >
            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Donor:</span>{" "}
              <span className="text-white font-medium">
                {c.donorName || "Not provided"}
              </span>
            </p>

            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Receiver:</span>{" "}
              <span className="text-white font-medium">
                {c.receiverName || "Not provided"}
              </span>
            </p>

            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Reason:</span>{" "}
              <span className="text-white">
                {c.reason}
              </span>
            </p>

            <p className="text-sm text-gray-400">
              <span className="text-gray-500">Description:</span>{" "}
              {c.description || "—"}
            </p>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            className="h-10 px-6 rounded-xl border-white/20 text-gray-300 hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

}
