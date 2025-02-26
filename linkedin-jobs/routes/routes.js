import { Router } from "express";
import { getLinkedinJobSkills, postLinkedinJobSkills } from "../controllers/linkedinJobsController.js";

const router = Router();

router.get("/api/linkedIn-jobs/:id", getLinkedinJobSkills);

router.post("/api/linkedIn-jobs/:id", postLinkedinJobSkills);

export default router;