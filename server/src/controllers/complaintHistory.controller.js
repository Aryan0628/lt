import { db } from "../firebaseadmin/firebaseadmin.js";

export const getComplaintHistoryForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const snap = await db
      .collection("complaints")
      .where("againstUserId", "==", userId)
    
      .get();

    const complaints = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    res.json({ data: complaints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch complaint history" });
  }
};
