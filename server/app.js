import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Route Imports
import authRoutes from "./src/routes/auth.js";
import roomRoutes from "./src/routes/room.js";
import modelRoutes from "./src/routes/model.js";
import geeRoutes from "./src/routes/geeRoutes.js";
import donationRoutes from "./src/routes/donation.routes.js";
import interestRoutes from "./src/routes/interest.routes.js";
import garbageRoutes from "./src/routes/garbage.route.js";
import jobRoutes from "./src/routes/job.route.js";
import setalertRoutes from "./src/routes/setalertsRoutes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import complaintRoutes from "./src/routes/complaint.routes.js";
import complaintStatsRoutes from "./src/routes/complaintStats.routes.js";
import complaintHistoryRoutes from "./src/routes/complaintHistory.routes.js";
import voiceRoutes from "./src/routes/voiceRoutes.js"
const app = express();

/* ---------------- MIDDLEWARE ---------------- */

console.log("CORS ORIGIN:", process.env.CORS_ORIGIN);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

/* ---------------- ROUTES ---------------- */

app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/model", modelRoutes);
app.use("/api/gee", geeRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/garbage", garbageRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/alerts", setalertRoutes);
/* ---------------- EXPORT ---------------- */
app.use('/uploads', express.static('uploads'));
app.use("/api/chats", chatRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/complaint-stats",complaintStatsRoutes);
app.use("/api/complaint-history",complaintHistoryRoutes);
app.use("/api/voice",voiceRoutes);

app.get("/health", (req, res) => res.status(200).json({ message: "server is healthy" }));

app.use("/api/room",roomRoutes);
app.use("/api/model",modelRoutes);
app.use("/api/gee",geeRoutes)
export { app };