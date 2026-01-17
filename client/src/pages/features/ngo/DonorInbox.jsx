import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { useAuth0 } from "@auth0/auth0-react";
import ReportComplaintModal from "./ReportComplaintModal";
import ComplaintHistoryModal from "./ComplaintHistoryModal";


export default function DonorInbox() {
  const { getAccessTokenSilently } = useAuth0();
  const [interests, setInterests] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
const [complaintHistory, setComplaintHistory] = useState([]);


  const navigate = useNavigate();
  

  useEffect(() => {
    const fetch = async () => {
      const token = await getAccessTokenSilently();
      const res = await api.get("/api/interests/donor", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterests(res.data.data || []);
    };
    fetch();
  }, []);
const viewHistory = async (userId) => {
  try {
    const token = await getAccessTokenSilently();

    const res = await api.get(
      `/api/complaint-history/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setComplaintHistory(res.data.data || []);
    setHistoryOpen(true);
  } catch (err) {
    alert("Failed to load complaint history");
  }
};


  const acceptInterest = async (id) => {
    const token = await getAccessTokenSilently();
    const res = await api.post(
      `/api/interests/${id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    navigate(`/ngo/chat/${res.data.chatId}`);
  };

  return (
  <div className="space-y-4">
    {interests.map((i) => (
      <Card
        key={i.id}
        className="bg-black border border-white/10 rounded-2xl"
      >
        {/* ❌ REMOVED CardHeader to avoid duplicate title */}

        <CardContent className="flex justify-between items-start px-8 py-6">
          {/* LEFT: TEXT CONTENT */}
          <div className="space-y-2 max-w-[60%]">
            {/* ✅ SINGLE TITLE */}
            <p className="text-white text-lg font-semibold leading-tight">
              {i.donationTitle}
            </p>

            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Category:</span>{" "}
              {i.donationCategory}
            </p>

            <p className="text-sm text-gray-300">
              <span className="text-gray-400">Interested User:</span>{" "}
              <span className="text-white font-medium">
                {i?.recipientName || "—"}
              </span>
            </p>
          </div>

          {/* RIGHT: ACTION BUTTONS */}
          {i.status === "pending" ? (
            <Button
              className="h-12 px-8 text-base rounded-xl bg-green-600 hover:bg-green-700"
              onClick={() => acceptInterest(i.id)}
            >
              Accept
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                className="h-11 min-w-[160px] text-base rounded-xl whitespace-nowrap"
                onClick={() => navigate(`/ngo/chat/${i.chatId}`)}
              >
                Chats
              </Button>

              <Button
                variant="destructive"
                className="h-11 min-w-[160px] text-base rounded-xl"
                onClick={() => {
                  setSelectedInterest(i);
                  setReportOpen(true);
                }}
              >
                Report
              </Button>

              <Button
                variant="outline"
                className="h-11 min-w-[160px] text-base rounded-xl border-white/20 text-gray-300 hover:bg-white/10"
                onClick={() => viewHistory(i.recipientId)}
              >
                History
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    ))}
 

    {/* ✅ MODAL MUST BE INSIDE RETURN */}
    {selectedInterest && (
      <ReportComplaintModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        chatId={selectedInterest.chatId}
        donationId={selectedInterest.donationId}
        againstUserId={selectedInterest.recipientId}
        role="donor"
      />
    )}
    <ComplaintHistoryModal
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      complaints={complaintHistory}
    />
  </div>
);
}
