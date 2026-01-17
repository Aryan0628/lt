import { useState } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Textarea } from "../../../ui/textarea";
import { Input } from "../../../ui/input";
import { useAuth0 } from "@auth0/auth0-react";

export default function ReportComplaintModal({
  open,
  onClose,
  chatId,
  donationId,
  againstUserId,
  role,
}) {
  const { getAccessTokenSilently } = useAuth0();

  const [donorName, setDonorName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submitComplaint = async () => {
    if (!reason) {
      alert("Please select a reason");
      return;
    }

    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      await api.post(
        "/api/complaints",
        {
          chatId,
          donationId,
          againstUserId,
          role,
          donorName,
          receiverName,
          reason,
          description,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Complaint submitted successfully");
      setDonorName("");
      setReceiverName("");
      setReason("");
      setDescription("");
      onClose();
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Failed to submit complaint"
      );
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
    <Card className="w-[440px] bg-black border border-white/20 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.08)]">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white text-lg">
          Report Interaction
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        <Input
          placeholder="Donor name"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          className="bg-black/40 border-white/20 text-white placeholder:text-gray-400"
        />

        <Input
          placeholder="Receiver name"
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          className="bg-black/40 border-white/20 text-white placeholder:text-gray-400"
        />

        <select
          className="w-full rounded-lg p-2 bg-black/40 border border-white/20 text-white focus:outline-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="" className="bg-black">Select reason</option>
          <option value="harassment" className="bg-black">Harassment</option>
          <option value="spam" className="bg-black">Spam</option>
          <option value="fraud" className="bg-black">Fraud</option>
          <option value="misbehavior" className="bg-black">Misbehavior</option>
          <option value="other" className="bg-black">Other</option>
        </select>

        <Textarea
          placeholder="Describe the issue"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-black/40 border-white/20 text-white placeholder:text-gray-400 min-h-[90px]"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            className="h-10 px-6 rounded-xl border-white/20 text-gray-300 hover:bg-white/10"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            className="h-10 px-6 rounded-xl"
            onClick={submitComplaint}
            disabled={loading}
          >
            Submit
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

}
