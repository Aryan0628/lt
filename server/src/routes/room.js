import express from "express";
import room_data from "../controllers/room_data.js";
import log_suspicious from "../controllers/log-suspicious.js";
import throttle_room from "../controllers/throttle_room.js";
import log_sos from "../controllers/log-sos.js";
import getAlertDetails from "../controllers/getalertdetails.js";
import getSuspiciousActivity from "../controllers/roomController.js";
const router = express.Router();
router.post("/room_data",room_data)
router.post("/log-suspicious",log_suspicious)
router.post("/log-sos",log_sos)
router.post("/throttle-room",throttle_room)
router.post("/get-alert-details",getAlertDetails)
router.post("/get-suspicious",getSuspiciousActivity)

export default router;

