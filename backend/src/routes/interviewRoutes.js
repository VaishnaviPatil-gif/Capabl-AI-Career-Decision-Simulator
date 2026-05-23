import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  listInterviews,
  startInterview,
  submitAnswer,
  finishInterview,
  getInterview,
} from "../controllers/interviewController.js";

const router = express.Router();

router.get("/", protect, listInterviews);
router.post("/start", protect, startInterview);
router.post("/:id/answer", protect, submitAnswer);
router.post("/:id/finish", protect, finishInterview);
router.get("/:id", protect, getInterview);

export default router;
