import express from "express";
import protect from "../middleware/authMiddleware.js";
import { simulate, comparePaths } from "../controllers/whatifController.js";

const router = express.Router();

router.post("/simulate", protect, simulate);
router.post("/compare", protect, comparePaths);

export default router;
