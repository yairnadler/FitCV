import { Router } from "express";
import { postRelevantProjects, getRelevantProjects } from "../controllers/buildCVControllers.js";

const router = Router();

router.post("/api/build-cv/:id", postRelevantProjects);
router.get("/api/build-cv/:id", getRelevantProjects);

export default router;