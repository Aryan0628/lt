import express from 'express';
import { uploadMiddleware, uploadVoiceNote } from '../controllers/voiceController.js';

const router = express.Router();

// Route: POST /api/voice/upload
router.post('/upload', uploadMiddleware.single('audio'), uploadVoiceNote);

export default router;