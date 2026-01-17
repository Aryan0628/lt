import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { useAuth0 } from "@auth0/auth0-react";
import ReportComplaintModal from "./ReportComplaintModal";
import ComplaintHistoryModal from "./ComplaintHistoryModal";


export default function NgoMyChats() {
  const { getAccessTokenSilently } = useAuth0();
  const [chats, setChats] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [complaintHistory, setComplaintHistory] = useState([]);


  const navigate = useNavigate();
  const location = useLocation();

const selectedCategory = location.state?.category;
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


  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = await getAccessTokenSilently();

        const res = await api.get("/api/chats/recipient", {
          headers: { Authorization: `Bearer ${token}` },
        });

        let allChats = res.data.data || [];

        if (selectedCategory) {
          allChats = allChats.filter(
            (chat) => chat.donationCategory === selectedCategory
          );
        }

        setChats(allChats);
      } catch (err) {
        console.error(err.response?.data || err);
      }
    };

    fetchChats();
  }, [selectedCategory]);

 return (
  <Card className="bg-black/40 border border-white/10 rounded-2xl">
    <CardHeader>
      <CardTitle className="text-white text-lg">
        My Chats {selectedCategory && `(${selectedCategory})`}
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4">
      {chats.length === 0 && (
        <p className="text-sm text-gray-400">No chats found</p>
      )}

      {chats.map((chat) => (
        <Card
          key={chat.id}
          className="bg-black border border-white/10 rounded-xl"
        >
          <CardContent className="flex justify-between items-start px-8 py-6">
            {/* LEFT: CHAT INFO */}
            <div className="space-y-2 max-w-[60%]">
              <p className="text-white text-lg font-semibold">
                {chat.donationTitle}
              </p>

              <p className="text-sm text-gray-300">
                <span className="text-gray-400">Category:</span>{" "}
                {chat.donationCategory}
              </p>

              <p className="text-sm text-gray-300">
                <span className="text-gray-400">Donor:</span>{" "}
                <span className="text-white font-medium">
                  {chat?.donorName || "Unknown"}
                </span>
              </p>
            </div>

            {/* RIGHT: ACTION BUTTONS */}
            <div className="flex flex-col gap-3">
              <Button
                className="h-11 min-w-[160px] text-base rounded-xl whitespace-nowrap"
                onClick={() => navigate(`/ngo/chat/${chat.id}`)}
              >
                Open Chat
              </Button>

              <Button
                variant="destructive"
                className="h-11 min-w-[160px] text-base rounded-xl"
                onClick={() => {
                  setSelectedChat(chat);
                  setReportOpen(true);
                }}
              >
                Report
              </Button>

              <Button
                variant="outline"
                className="h-11 min-w-[160px] text-base rounded-xl border-white/20 text-gray-300 hover:bg-white/10"
                onClick={() => viewHistory(chat.donorId)}
              >
                Donor History
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </CardContent>
  


      {/* ✅ MODAL MUST BE INSIDE RETURN */}
      {selectedChat && (
        <ReportComplaintModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          chatId={selectedChat.id}
          donationId={selectedChat.donationId}
          againstUserId={selectedChat.donorId}
          role="recipient"
        />
      )}
      <ComplaintHistoryModal
  open={historyOpen}
  onClose={() => setHistoryOpen(false)}
  complaints={complaintHistory}
/>

    </Card>
  );
}

