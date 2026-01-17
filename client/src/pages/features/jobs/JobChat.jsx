import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle2, User } from "lucide-react";
import { ref, push, onValue, serverTimestamp, update } from "firebase/database";
import { db } from "../../../firebase/firebase";
import { useAuthStore } from "../../../store/useAuthStore";
import { Button } from "../../../ui/button";

export default function JobChat({ job }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isDealClosed, setIsDealClosed] = useState(job.status === "closed");
  const messagesEndRef = useRef(null);

  // Load Messages & Job Status
  useEffect(() => {
    if (!job?.id) return;

    // Listen for messages
    const messagesRef = ref(db, `jobs/rooms/${job.id}/messages`);
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.entries(data).map(([key, val]) => ({
          id: key,
          ...val,
        }));
        setMessages(loaded.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    // Listen for job status changes (e.g. if another user closes it)
    const statusRef = ref(db, `jobs/rooms/${job.id}/status`);
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      if(snapshot.exists() && snapshot.val() === "closed") {
        setIsDealClosed(true);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [job?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messagesRef = ref(db, `jobs/rooms/${job.id}/messages`);
    await push(messagesRef, {
      text: newMessage,
      userId: user.sub,
      userName: user.name,
      userAvatar: user.picture,
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };

  const handleCloseDeal = async () => {
    if (!confirm("Are you sure you want to close this deal? This will mark the job as completed.")) return;
    
    try {
      // Update status in Firebase
      await update(ref(db, `jobs/rooms/${job.id}`), {
        status: "closed",
        closedBy: user.sub,
        closedAt: serverTimestamp()
      });
      setIsDealClosed(true);
    } catch (error) {
      console.error("Error closing deal:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center backdrop-blur-md">
        <div>
          <h2 className="font-bold text-white text-sm">{job.title}</h2>
          <p className="text-xs text-zinc-400">
             Posted by {job.userName || "Unknown"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.userId === user?.sub;
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="h-6 w-6 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
                {msg.userAvatar ? (
                    <img src={msg.userAvatar} alt="av" className="h-full w-full object-cover" />
                ) : (
                    <User className="h-4 w-4 m-1 text-zinc-500" />
                )}
              </div>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700"
                }`}
              >
                <p>{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {isDealClosed ? (
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-sm">This conversation is closed.</p>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900/30">
            <div className="flex gap-2 items-center">
            <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 w-10 shrink-0 flex items-center justify-center"
            >
                <Send className="h-10 w-10" />
            </Button>
            </div>
        </form>
      )}
    </div>
  );
}