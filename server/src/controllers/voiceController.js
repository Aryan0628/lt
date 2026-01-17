import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { db } from "../firebaseadmin/firebaseadmin.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/voice';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || 'unknown';
    const filename = `${userId}-${Date.now()}.webm`;
    cb(null, filename);
  }
});

export const uploadMiddleware = multer({ storage: storage });

export const uploadVoiceNote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file received" });
    }
    const { userId, userName, roomId, lat, lng } = req.body;
    const backendUrl = 'http://localhost:3000';
    const audioUrl = `${backendUrl}/uploads/voice/${req.file.filename}`;
    const voiceLogRef = db.collection('voice_alerts').doc();
    
    await voiceLogRef.set({
      id: voiceLogRef.id,
      userId,
      userName,
      roomId,
      audioUrl,
      location: {
        lat: Number(lat),
        lng: Number(lng)
      },
      timestamp: new Date().toISOString(),
      isListened: false,
      type: "VOICE_SOS"
    });
    console.log(`🎙️ Voice Note Saved: ${userName} in Room ${roomId}`);
    return res.status(200).json({ 
      success: true, 
      message: "Voice note secured", 
      url: audioUrl 
    });
  } catch (error) {
    console.error("❌ Voice Upload Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};