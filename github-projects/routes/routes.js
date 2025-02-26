import { Router } from 'express';
import { getAllProjects, getProjectById, addProjects } from '../controllers/githubProjectsController.js';

const router = Router();

router.get("/api/github/projects", getAllProjects);

router.get("/api/github/projects/:id", getProjectById);

router.post("/api/github/projects", addProjects);

export default router;