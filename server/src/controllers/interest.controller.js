import { db } from "../firebaseadmin/firebaseadmin.js";


/* ================= CREATE INTEREST ================= */
export const createInterest = async (req, res) => {
  try {
    const recipientId = req.auth.payload.sub;
          // ✅ Fetch recipient (interested user) name
      let recipientName = "Unknown User";

      const recipientSnap = await db
        .collection("users")
        .doc(recipientId)
        .get();

      if (recipientSnap.exists) {
        const recipient = recipientSnap.data();
        recipientName =
          recipient.name ||
          recipient.fullName ||
          recipient.username ||
          recipientName;
      }

    const { donationId } = req.body;

    // 🔎 Fetch donation
    const donationSnap = await db
      .collection("donations")
      .doc(donationId)
      .get();

    if (!donationSnap.exists) {
      return res.status(404).json({ message: "Donation not found" });
    }

   const donation = donationSnap.data();

    // ✅ Fetch donor name
    let donorName = "Unknown Donor";
    const donorSnap = await db.collection("users").doc(donation.donorId).get();
    if (donorSnap.exists) {
    const donor = donorSnap.data();
    donorName = donor.name || donor.fullName || donor.username || donorName;
}


    const interestId = `${donationId}_${recipientId}`;
    const interestRef = db.collection("interests").doc(interestId);

    const existing = await interestRef.get();

    if (existing.exists) {
      return res.status(409).json({
        message: "Interest already sent",
      });
    }

    // 📝 Create interest
      const ref = await db.collection("interests").add({
      donationId,
      donationTitle: donation.description,
      donationCategory: donation.category,
      donorId: donation.donorId,
      donorName,
      recipientId,
      recipientName,
      status: "pending",
      chatId: null,
      createdAt: new Date(),
    });

    res.json({ success: true, interestId: ref.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create interest" });
  }
};


/* ================= ACCEPT INTEREST ================= */
export const acceptInterest = async (req, res) => {
  try {
    const { interestId } = req.params;

    const interestRef = db.collection("interests").doc(interestId);
    const snap = await interestRef.get();

    if (!snap.exists) {
      return res.status(404).json({ message: "Interest not found" });
    }

    const interest = snap.data();

    // ⛔ Prevent duplicate chat
    if (interest.chatId) {
      return res.json({ chatId: interest.chatId });
    }

    // 💬 Create chat (tied to donation)
  const chatRef = await db.collection("chats").add({
  donationId: interest.donationId,
  donationTitle: interest.donationTitle,     // ✅ SAFE
  donationCategory: interest.donationCategory,
  donorId: interest.donorId,
  donorName: interest.donorName,
  recipientId: interest.recipientId,
  createdAt: new Date(),
});

    await interestRef.update({
      status: "accepted",
      chatId: chatRef.id,
    });

    res.json({ chatId: chatRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept interest" });
  }
};

/* ================= DONOR INBOX ================= */
export const getInterestsForDonor = async (req, res) => {
  try {
    if (!req.auth || !req.auth.payload?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const donorId = req.auth.payload.sub;

    const snap = await db
      .collection("interests")
      .where("donorId", "==", donorId)
      .get();

    res.json({
      data: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    console.error("🔥 getInterestsForDonor error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= RECEIVER INTERESTS ================= */
export const getInterestsForRecipient = async (req, res) => {
  try {
    if (!req.auth || !req.auth.payload?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const recipientId = req.auth.payload.sub;

    const snap = await db
      .collection("interests")
      .where("recipientId", "==", recipientId)
      .orderBy("createdAt", "desc")
      .get();

    res.json({
      data: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  } catch (err) {
    console.error("🔥 getInterestsForRecipient error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
