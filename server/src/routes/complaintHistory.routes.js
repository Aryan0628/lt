import express from "express";
import { getComplaintHistoryForUser } from "../controllers/complaintHistory.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";

const router = express.Router();

router.get("/:userId", checkJwt, getComplaintHistoryForUser);
export default router;
