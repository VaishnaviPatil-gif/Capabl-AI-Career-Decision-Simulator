import express from "express";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  upsertProfile,
  getProfile,
  uploadResume,
  extractResume,
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/", protect, getProfile);

router.post(
  "/",
  protect,
  upload.single("resume"),
  upsertProfile
);

router.post(
  "/resume",
  protect,
  upload.single("resume"),
  uploadResume
);

router.post(
  "/resume/extract",
  protect,
  upload.single("resume"),
  extractResume
);

export default router;
