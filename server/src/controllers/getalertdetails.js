import { db } from "../firebaseadmin/firebaseadmin.js";

const getAlertDetails = async (req, res) => {
  try {
    const { userId, roomId } = req.body;
    
    // Debugging: Ensure we are receiving IDs
    console.log(`[AlertDetails] Fetching for User: ${userId}, Room: ${roomId}`);

    let responseData = {
      found: false,
      source: "Unknown",
      aiAnalysis: "No detailed report found.",
      score: "N/A",
      timestamp: null
    };

    // 1. Check User Throttle Logs (Firestore)
    const logSosRef = db.collection('log-sos');
    
    // NOTE: If this fails with "The query requires an index", click the link in your terminal!
    const logQuery = await logSosRef
      .where('triggeredByUserId', '==', userId)
      .where('routeId', '==', roomId)
      .orderBy('timestamp', 'desc') 
      .limit(1)
      .get();

    if (!logQuery.empty) {
      const doc = logQuery.docs[0].data();
      return res.json({
        found: true,
        source: "User Throttle",
        aiAnalysis: doc.aiAnalysis, 
        score: doc.alertLevel,      
        timestamp: doc.timestamp
      });
    }

    // 2. Check AI Model Logs (Firestore)
    const modelSosRef = db.collection('model_sos_activity');
    
    // NOTE: This also needs an index!
    const modelQuery = await modelSosRef
      .where('userId', '==', userId)
      .where('routeId', '==', roomId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!modelQuery.empty) {
      const doc = modelQuery.docs[0].data();
      return res.json({
        found: true,
        source: "AI Watchdog",
        aiAnalysis: doc.reason,
        score: doc.score,    
        timestamp: doc.timestamp
      });
    }

    return res.json(responseData);

  } catch (error) {
    // This log will tell you if it's an Index error or something else
    console.error("🔥 Error in getAlertDetails:", error.message);
    
    // If it is an index error, we can still return a 404-like response to prevent frontend crash
    if (error.code === 9 || error.message.includes("requires an index")) {
        return res.status(500).json({ error: "Missing Firestore Index. Check Backend Logs." });
    }
    
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default getAlertDetails;