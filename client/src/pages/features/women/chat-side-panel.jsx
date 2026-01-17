import { useState, useEffect, useRef } from "react"
import { Send, AlertOctagon, ShieldAlert, Phone, X, PhoneOff, Mic, Square, Loader2, Grid, Volume2 } from "lucide-react"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { ScrollArea } from "../../../ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "../../../ui/avatar"
import { db } from "../../../firebase/firebase"
import { ref, push, set } from "firebase/database";
// --- CHANGE START: Import API ---
import { api } from "../../../lib/api";
// --- CHANGE END ---

export default function ChatSidePanel({ 
  messages, 
  currentUser, 
  onSendMessage, 
  onClose, 
  routeId, 
  onThrottle,
  isSosDisabled, 
  finalScore,
  otherUsers,
  sosTriggerCount 
}) {
  const [newMessage, setNewMessage] = useState("")
  
  // --- STATES: CALLING FEATURE ---
  const [showCallConfirm, setShowCallConfirm] = useState(false)
  const [isSimulatingCall, setIsSimulatingCall] = useState(false)
  const [callTimer, setCallTimer] = useState(0)

  // --- STATES: VOICE RECORDING ---
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Refs for logic that doesn't need to trigger re-renders instantly
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const scrollRef = useRef(null)

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    let interval;
    if (isSimulatingCall) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulatingCall]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = uploadRecording;

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Mic Access Error:", err);
      alert("Microphone permission is required to send voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadRecording = async () => {
    setIsUploading(true);
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    
    formData.append('audio', audioBlob, 'voice_note.webm');
    formData.append('userId', currentUser.sub); 
    formData.append('userName', currentUser.name || "User");
    formData.append('roomId', routeId);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const currentLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };
        formData.append('lat', currentLocation.lat);
        formData.append('lng', currentLocation.lng);

        try {
          // --- CHANGE START: Use API (Axios) instead of Fetch ---
          const response = await api.post(`/api/voice/upload`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          
          // Axios stores the response body in .data
          const data = response.data;
          // --- CHANGE END ---

          if (data.url) {
              console.log("✅ File uploaded to server:", data.url);
              await upload_realtime_firebase(data.url, currentLocation);
          }

        } catch (error) {
          console.error("❌ Voice upload failed", error);
        } finally {
          setIsUploading(false);
        }
      }, (err) => {
        console.error("Location Error:", err);
        setIsUploading(false);
      });
    } else {
        setIsUploading(false);
    }
};

  const upload_realtime_firebase = async (audioUrl, location) => {
  try {
    const voiceAlertsRef = ref(db, 'voice_alerts');
    
    // 2. Generate a new unique ID
    const newAlertRef = push(voiceAlertsRef);

    // 3. Save the metadata
    await set(newAlertRef, {
      id: newAlertRef.key,
      userId: currentUser.sub,
      userName: currentUser.name || "User",
      roomId: routeId,
      audioUrl: audioUrl,
      location: {
        lat: location.lat,
        lng: location.lng
      },
      timestamp: new Date().toISOString(), 
      isListened: false,
      type: "VOICE_SOS"
    });

    console.log("✅ Voice metadata saved to Realtime Database");

  } catch (error) {
    console.error("❌ Failed to save to Realtime DB:", error);
  }
};
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleSend = () => {
    if (!newMessage.trim()) return
    onSendMessage(newMessage)
    setNewMessage("")
  }

  const handleNativeCall = () => {
    setShowCallConfirm(false);
    window.location.href = "tel:112"; // Trigger Native Phone App
    setIsSimulatingCall(true); // Show Overlay for Demo/Laptop
  };

  const endSimulation = () => {
    setIsSimulatingCall(false);
    setCallTimer(0);
  };

  // --- THEME LOGIC ---
  const getPanelTheme = () => {
    if (finalScore === null) return "border-zinc-800 bg-zinc-900";
    const s = Number(finalScore);
    if (isSosDisabled || sosTriggerCount > 0 || s < 4) {
      return "border-red-600 shadow-[inset_0_0_30px_rgba(220,38,38,0.15)] bg-zinc-950";
    }
    if (s < 7) {
      return "border-amber-500 shadow-[inset_0_0_30px_rgba(245,158,11,0.1)] bg-zinc-950";
    }
    return "border-emerald-500/30 bg-zinc-950";
  }

  const getWatermark = () => {
    if (sosTriggerCount > 0 || isSosDisabled) {
      return {
        text: "ROUTE ON HIGH ALERT\nAUTHORITIES INFORMED",
        color: "text-red-600/20",
        icon: <AlertOctagon className="w-24 h-24 text-red-600/20 mb-4 animate-pulse" />
      };
    }
    if (finalScore !== null && Number(finalScore) < 4) {
      return {
        text: "CRITICAL DANGER DETECTED\nSTAY ALERT",
        color: "text-red-600/20",
        icon: <ShieldAlert className="w-24 h-24 text-red-600/20 mb-4 animate-pulse" />
      };
    }
    if (finalScore !== null && Number(finalScore) < 7) {
      return {
        text: "ROUTE UNDER SURVEILLANCE\nPRESS THROTTLE IF THREATENED",
        color: "text-amber-500/10",
        icon: <ShieldAlert className="w-24 h-24 text-amber-500/10 mb-4" />
      };
    }
    return null;
  }

  const themeClasses = getPanelTheme();
  const watermark = getWatermark();
  const activeCount = otherUsers ? otherUsers.length : 0;

  return (
    <div className={`flex flex-col h-full border-r transition-all duration-500 relative overflow-hidden ${themeClasses}`}>
      
      {/* 1. CALLING OVERLAY (Laptop/Demo Mode) */}
      {isSimulatingCall && (
        <div className="absolute inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-between py-12 text-white animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col items-center mt-10 space-y-2">
            <h2 className="text-2xl font-medium tracking-wide">Emergency 112</h2>
            <p className="text-zinc-400 text-sm animate-pulse">
              {callTimer === 0 ? "Calling..." : formatTime(callTimer)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 opacity-80">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center"><Mic className="w-5 h-5"/></div>
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center"><Grid className="w-5 h-5"/></div>
            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center"><Volume2 className="w-5 h-5"/></div>
          </div>
          <button 
            onClick={endSimulation}
            className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:bg-red-700 transition-colors"
          >
            <PhoneOff className="w-8 h-8 fill-current" />
          </button>
        </div>
      )}

      {/* 2. CALL CONFIRMATION MODAL */}
      {showCallConfirm && (
        <div className="absolute inset-0 z-[60] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Phone className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Call 112?</h3>
              <p className="text-zinc-400 text-xs mb-4">This will dial emergency services immediately.</p>
              <div className="flex gap-2">
                 <button onClick={() => setShowCallConfirm(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700">CANCEL</button>
                 <button onClick={handleNativeCall} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">CALL NOW</button>
              </div>
           </div>
        </div>
      )}

      {/* 3. BACKGROUND WATERMARK */}
      {watermark && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none p-6 text-center">
          {watermark.icon}
          <h2 className={`text-2xl font-black uppercase tracking-widest leading-relaxed ${watermark.color}`}>
            {watermark.text}
          </h2>
        </div>
      )}

      {/* 4. HEADER */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md z-20 shrink-0 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-white tracking-tight text-sm uppercase">Live Route Chat</h2>
          <div className="flex items-center gap-2 mt-1 bg-zinc-900/50 w-fit px-2 py-0.5 rounded border border-zinc-800">
             <div className="relative flex h-2 w-2 shrink-0">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </div>
             <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
               {activeCount} Active
             </span>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Call Button */}
          <button
             onClick={() => setShowCallConfirm(true)}
             className="h-9 w-9 flex items-center justify-center rounded-md bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 hover:text-red-400 transition-colors"
             title="Call Emergency"
          >
             <Phone className="w-4 h-4" />
          </button>

          {/* SOS Button */}
          <button
            onClick={onThrottle}
            disabled={isSosDisabled}
            className={`h-9 px-4 rounded-md font-black tracking-widest text-sm transition-all duration-300 border ${
              isSosDisabled 
                ? "bg-zinc-800 text-red-900 border-red-900/30 cursor-not-allowed shadow-none" 
                : "bg-red-600 text-white border-transparent shadow-[0_0_20px_rgba(220,38,38,0.8)] hover:bg-red-500 hover:shadow-[0_0_35px_rgba(220,38,38,1)] active:scale-95"
            }`}
          >
            {isSosDisabled ? "SENT" : "SOS"}
          </button>
        </div>
      </div>

      {/* 5. MESSAGES LIST */}
      <ScrollArea className="flex-1 p-4 z-10">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMe = msg.userId === currentUser.sub
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar className="h-8 w-8 border border-zinc-700/50 shadow-sm shrink-0">
                  <AvatarImage src={msg.userImage} />
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400 font-bold">
                    {msg.userName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-zinc-500 mb-1 px-1">{msg.userName}</span>
                  <div className={`rounded-2xl px-4 py-2 text-sm shadow-md backdrop-blur-sm ${
                    isMe 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-zinc-800/80 text-zinc-200 rounded-tl-none border border-zinc-700/50"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-600 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* 6. DYNAMIC FOOTER (Text or Recording UI) */}
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 z-20 shrink-0">
        
        {isRecording ? (
          // --- RECORDING UI ---
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex-1 h-10 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                   <span className="relative flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                   </span>
                   <span className="text-red-500 font-mono font-bold text-sm">
                     Recording {formatTime(recordingDuration)}
                   </span>
                </div>
                <span className="text-[10px] text-red-400/60 uppercase font-bold tracking-widest">Release to Send</span>
             </div>
             
             {/* STOP / SEND BUTTON */}
             <button
               onMouseUp={stopRecording} // Desktop
               onTouchEnd={stopRecording} // Mobile
               className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse scale-105 cursor-pointer"
             >
                <Square className="w-4 h-4 fill-white text-white" />
             </button>
          </div>
        ) : (
          // --- DEFAULT TEXT INPUT UI ---
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-zinc-950/50 border-zinc-800 text-white focus-visible:ring-blue-600/50 h-10 shadow-inner"
            />
            
            {/* Logic: Show SEND if text exists, otherwise show MIC */}
            {newMessage.trim() ? (
               <Button type="submit" className="h-10 w-10 bg-blue-600 hover:bg-blue-500 shrink-0 p-0 flex items-center justify-center transition-all">
                 <Send className="h-4 w-4" />
               </Button>
            ) : (
               <button
                 type="button"
                 onMouseDown={startRecording} // Start on press (Desktop)
                 onTouchStart={startRecording} // Start on press (Mobile)
                 className="h-10 w-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md flex items-center justify-center transition-all active:scale-95 border border-zinc-700 cursor-pointer"
                 title="Hold to Record"
               >  
                   <Mic className="w-5 h-5" />
               </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}