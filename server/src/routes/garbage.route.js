import express from "express";
import axios from "axios"; 
import { upload } from "../../middlewares/upload.js";
import { db } from "../firebaseadmin/firebaseadmin.js";
import { uploadToCloudinary } from "../utils/uploadCloudinary.js";
import { checkJwt } from "../auth/authMiddleware.js";
import { geohashForLocation, distanceBetween } from "geofire-common";
import { VertexAI } from "@google-cloud/vertexai";

const router = express.Router();

const vertex_ai = new VertexAI({
  project: "certain-acre-482416-b7",
  location: "us-central1",
});


async function verifyCleanlinessWithAI(cleanupBuffer, cleanupMime, originalBuffer, originalMime) {
  const model = vertex_ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are verifying a civic garbage cleanup effort by comparing two images.

Image 1: The "Original" garbage report (Dirty).
Image 2: The "Verification" photo (Supposedly Clean).

Your Tasks:
1. LOCATION MATCH CHECK: Do these two images depict the EXACT SAME physical location? 
   - Ignore movable objects (cars, people, trash, lighting differences).
   - Look at PERMANENT features: walls, pavement patterns, buildings, trees, poles, fences.
   - If the location is clearly different, set "isSameLocation" to false.

2. CLEANLINESS CHECK: Is the area in Image 2 ACCEPTABLY CLEAN?
   - isClean = true if the specific garbage piles seen in Image 1 are gone.
   - Minor litter or leaves are okay.

Return ONLY valid JSON:
{
  "isSameLocation": boolean,
  "isClean": boolean,
  "confidence": number,
  "reason": "short explanation covering both location match and cleanliness"
}
`;

  try {
    const contents = [
      {
        role: "user",
        parts: [
          { text: prompt },
          { text: "Image 1 (Original Report):" },
          {
            inlineData: {
              data: originalBuffer.toString("base64"),
              mimeType: originalMime || "image/jpeg",
            },
          },
          { text: "Image 2 (Cleanup Verification):" },
          {
            inlineData: {
              data: cleanupBuffer.toString("base64"),
              mimeType: cleanupMime,
            },
          },
        ],
      },
    ];

    const result = await model.generateContent({ contents });

    const rawText = result.response.candidates[0].content.parts
      .map((p) => p.text || "")
      .join("");
    return JSON.parse(rawText);
  } catch (e) {
    console.error("AI Verify JSON parse failed:", e);
    return {
      isSameLocation: false,
      isClean: false,
      reason: "AI analysis unavailable",
    };
  }
}



router.post(
  "/",
  checkJwt,
  upload.single("image"),
  async (req, res) => {
    try {

      const userId = req.auth?.payload?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      console.log(req.body);

      const { title, lat, lng,email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email not found in token" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      if (!title || !lat || !lng) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const aiResult = await analyzeImageWithAI(
        req.file.buffer,
        req.file.mimetype
      );

      if (!aiResult.containsGarbage) {
        return res.status(400).json({
          message: "Image does not contain garbage. Upload rejected.",
        });
      }

      const { imageUrl, publicId } = await uploadToCloudinary(
        req.file.buffer,
        "garbage-reports"
      );

      const geohash = geohashForLocation([
        Number(lat),
        Number(lng),
      ]);

    const reportData = {
    title,
    imageUrl,
    publicId,
  location: {
    lat: Number(lat),
    lng: Number(lng),
  },
  geohash,
  userId,
  email,
  type: aiResult.type,
  severity: aiResult.severity,
  hazard: aiResult.hazard,
  aiAnalysis: aiResult.analysis,
  upvotes: 0,
  downvotes: 0,
  votes: {},
  status: "OPEN",
  createdAt: new Date(),
  updatedAt: new Date(),
};


      const docRef = await db
        .collection("garbageReports")
        .add(reportData);

      return res.status(201).json({
        success: true,
        report: {
          id: docRef.id,
          ...reportData,
        },
      });
    } catch (err) {
      console.error("Garbage Upload Error:", err);
      return res.status(500).json({
        message: "Server failed to process report",
      });
    }
  }
);


import { sendEmail } from "../utils/sendEmail.js";

router.post("/:reportId/verify-cleanup", checkJwt, upload.single("image"), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { lat, lng } = req.body;
    console.log("email route hitted")

    if (!req.file) return res.status(400).json({ message: "Proof image required" });
    if (!lat || !lng) return res.status(400).json({ message: "Location required" });

    // 1. Get report
    const reportRef = db.collection("garbageReports").doc(reportId);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) return res.status(404).json({ message: "Report not found" });

    const reportData = reportSnap.data();

    // 2. Distance check
    const distanceInKm = distanceBetween(
      [reportData.location.lat, reportData.location.lng],
      [Number(lat), Number(lng)]
    );

    if (distanceInKm * 1000 > 100) {
      return res.status(400).json({
        message: "You are too far from the reported location.",
      });
    }

    // 3. Fetch original image
    const originalImageResponse = await axios.get(reportData.imageUrl, {
      responseType: "arraybuffer",
    });

    const originalImageBuffer = Buffer.from(originalImageResponse.data);

    // 4. AI verification
    const aiResult = await verifyCleanlinessWithAI(
      req.file.buffer,
      req.file.mimetype,
      originalImageBuffer,
      "image/jpeg"
    );

    if (!aiResult.isSameLocation) {
      return res.status(400).json({
        success: false,
        message: "Location mismatch",
      });
    }

    if (!aiResult.isClean) {
      return res.status(400).json({
        success: false,
        message: "Area still looks dirty",
        reason: aiResult.reason,
      });
    }
  try {
    await sendEmail({
  to: reportData.email,
  subject: "Your Garbage Report Has Been Cleaned!",
  text: "Your reported garbage issue has been successfully cleaned.",
  html: `
    <h2>Cleanup Verified</h2>
    <p>Your garbage report has been successfully cleaned and verified by AI.</p>

    <p><strong>Report ID:</strong> ${reportId}</p>
    <p><strong>AI Confidence:</strong> ${aiResult.confidence || "N/A"}</p>
    <p><strong>AI Notes:</strong> ${aiResult.reason}</p>

    <p>Thank you for helping keep the city clean! 🌱</p>
    <hr />
    <p><small>This email includes before & after images for transparency.</small></p>
  `,
  attachments: [
    {
      filename: "before_cleanup.jpg",
      content: originalImageBuffer,
    },
    {
      filename: "after_cleanup.jpg",
      content: req.file.buffer,
    },
  ],
});
  } catch (error) {
    console.error(error);
  }
   await reportRef.update({
  status: "VERIFIED",
  verifiedAt: new Date(),
  aiVerification: aiResult,
});


    res.json({
      success: true,
      message: "Cleanup verified, email sent, report closed.",
      aiAnalysis: aiResult,
    });

  } catch (err) {
    console.error("Cleanup Verification Error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

router.get("/nearby", checkJwt, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat & lng required" });

    
    const { getNearbyGarbageReports } = await import("../services/garbage.service.js");
    const reports = await getNearbyGarbageReports(Number(lat), Number(lng), 100);

    res.json({ success: true, reports });
  } catch (err) {
    console.error("Fetch nearby error:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

router.patch("/vote", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { reportId, type } = req.body;

    if (!reportId || !["UP", "DOWN"].includes(type)) return res.status(400).json({ message: "Invalid payload" });

    const reportRef = db.collection("garbageReports").doc(reportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) return res.status(404).json({ message: "Report not found" });

    const report = reportSnap.data();
    const votes = report.votes || {};
    const previousVote = votes[userId];
    let upvotes = report.upvotes || 0;
    let downvotes = report.downvotes || 0;

    if (!previousVote) {
      votes[userId] = type;
      type === "UP" ? upvotes++ : downvotes++;
    } else if (previousVote === type) {
      delete votes[userId];
      type === "UP" ? upvotes-- : downvotes--;
    } else {
      votes[userId] = type;
      previousVote === "UP" ? upvotes-- : downvotes--;
      type === "UP" ? upvotes++ : downvotes++;
    }

    await reportRef.update({ votes, upvotes, downvotes, updatedAt: new Date() });

    return res.json({ success: true, upvotes, downvotes, userVote: votes[userId] || null });
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

async function analyzeImageWithAI(buffer, mimeType) {
  const model = vertex_ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const prompt = `
You are an image verification system.

Return ONLY valid JSON in this EXACT format:
{
  "containsGarbage": boolean,
  "type": "GARBAGE" | "DUSTBIN" | "NONE",
  "severity": number,
  "hazard": "Low" | "Medium" | "High",
  "analysis": "one short sentence"
}

Rules:
- If NO garbage or trash is visible → containsGarbage = false, type = NONE
- If public trash bin → containsGarbage = true, type = DUSTBIN, severity = 1
- If loose garbage, dumping, litter → containsGarbage = true, type = GARBAGE
- severity scale: 1 (small) → 10 (huge piles)
- hazard = High ONLY if needles, chemicals, medical waste, or broken glass are visible
- If unsure → containsGarbage = false
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType,
              },
            },
          ],
        },
      ],
    });

    const rawText = result.response.candidates[0].content.parts
      .map((p) => p.text || "")
      .join("");

    return JSON.parse(rawText);
  } catch (err) {
    console.error("Gemini failed:", err);
    return { containsGarbage: false };
  }
}

router.delete("/:reportId", checkJwt, async (req, res) => {
  const { reportId } = req.params;
  const userId = req.auth.payload.sub;

  const ref = db.collection("garbageReports").doc(reportId);
  const snap = await ref.get();

  if (!snap.exists) return res.status(404).json({ message: "Not found" });
  if (snap.data().userId !== userId) return res.status(403).json({ message: "Not allowed" });

  await ref.delete();
  res.json({ success: true });
});

export default router;