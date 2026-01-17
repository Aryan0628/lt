import { Routes, Route } from "react-router-dom";
import NgoPortal from "./NgoPortal";
import DonorInbox from "./DonorInbox";
import NgoMyChats from "./NgoMyChats";
import Chat from "./Chat";

export default function NgoRoutes(props) {
  return (
    <Routes>
      {/* /ngo */}
      <Route index element={<NgoPortal {...props} />} />

      {/* /ngo/inbox */}
      <Route path="inbox" element={<DonorInbox />} />

      {/* /ngo/chats */}
      <Route path="chats" element={<NgoMyChats />} />

      
      {/* /ngo/chat/:chatId */}
      <Route path="chat/:chatId" element={<Chat />} />
    </Routes>
  );
}
