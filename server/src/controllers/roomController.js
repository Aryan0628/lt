import { db } from "../firebaseadmin/firebaseadmin.js";
const getSuspiciousActivity = async (req, res) => {
  try {
    const { roomId } = req.body; 

    if (!roomId) {
        return res.status(400).json({ error: "Route/Room ID is required" });
    }
    const querySnapshot = await db.collection('suspicious_activity')
      .where('routeId', '==', roomId)
      .get();
    const suspiciousLogs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data
        };
    });
    return res.json(suspiciousLogs);

  } catch (error) {
    console.error("Error fetching suspicious activity:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default getSuspiciousActivity;