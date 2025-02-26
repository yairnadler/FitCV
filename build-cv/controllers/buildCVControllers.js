import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
import relevantProjects from "../models/buildCVData.js";

dotenv.config("../.env");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `You are a software engineer mentor that help job seekers to build thier CV according to their skills and projects.`,
});

const analyzeProjects = async function (id) {
  const linkedinSKillsJSON = await axios.get(
    `http://linkedin-jobs:5002/api/linkedin-jobs/${id}`
  );
  const githubReposJSON = await axios.get(
    "http://github-projects:5001/api/github/projects"
  );

  const linkedinSkills = linkedinSKillsJSON.data;
  const githubRepos = githubReposJSON.data;

  const prompt = `Here is a list of the required technical skills for the job and my personal projects:
    required skills: ${JSON.stringify(linkedinSkills)}
    my projects: ${JSON.stringify(githubRepos)}
    Return a valid JSON relevant projects highlighting the relevant skills I used: { ["project-name": str, "description": str] }.
    Ignore projects that don't have a description or a README file.
    Do not include notes or comments in the response.`;

  const result = await model.generateContent(prompt);
  const resultText = result.response.text();
  const cleanedText = resultText.replace(/```json|```/g, "").trim();
  const relevantProjects = JSON.parse(cleanedText);

  return relevantProjects;
};

export function getRelevantProjects(req, res) {
  const jobId = req.params.id;

  if (!relevantProjects[jobId]) {
    return res.status(404).json({ message: "No relevant projects found" });
  }

  return res
    .status(200)
    .json({ jobId, relevantProjects: relevantProjects[jobId] });
}

export async function postRelevantProjects(req, res) {
  const jobId = req.params.id;
  const analyzedGithubProjects = await analyzeProjects(jobId);

  if (analyzedGithubProjects.length === 0) {
    return res.status(404).json({ message: "No relevant projects found" });
  }

  relevantProjects[jobId] = [];

  analyzedGithubProjects.forEach((project) => {
    if (!relevantProjects[jobId].includes(project)) {
      relevantProjects[jobId].push(project);
    }
  });

  return res
    .status(200)
    .json({ jobId, relevantProjects: relevantProjects[jobId] });
}
