import express from "express";
import protect from "../middleware/authMiddleware.js";
import { listProjects, saveProjectMemory } from "../controllers/projectsController.js";

const router = express.Router();

router.get("/", protect, listProjects);
router.post("/", protect, saveProjectMemory);

export default router;
