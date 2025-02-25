import express, { json } from "express";
import morgan from "morgan";
import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Octokit } from "@octokit/rest";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const PORT = 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `You are a software engineer headhunter!`,
});

// Middlewares
app.use(json());
app.use(morgan("dev"));

const githubRepos = [];
const linkedinJobSkills = [];

const linkedinScrape = async function (url, cssSelector) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url);

  const jobDescription = await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    return element.textContent;
  }, cssSelector);

  await browser.close();

  if (!jobDescription) {
    return [];
  }

  const prompt = `Here is a job description for a software engineer position from a linkedin job posting:
  ${jobDescription}
  List the relevant technical skills with this schema: { ["skill": str, "description": str] }`;

  const result = await model.generateContent(prompt);
  const resultText = result.response.text();
  const cleanedText = resultText.replace(/```json|```/g, '').trim();
  const requiredSkills = JSON.parse(cleanedText);

  return requiredSkills;
};

const githubScrape = async function (githubUsername) {
  const reposUrl = `https://api.github.com/users/${githubUsername}/repos`;

  const response = await axios.get(reposUrl, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });

  return new Promise((resolve, reject) => {
    if (response.status !== 200) {
      return reject("Error fetching github repos");
    }

    const repos = response.data;

    return resolve(repos);
  });
};

const hasReadmeFile = async function (githubUsername, githubRepo) {
  const repoPath = await octokit.request("GET /repos/{owner}/{repo}/contents", {
    owner: githubUsername,
    repo: githubRepo,
  });

  return new Promise((resolve, reject) => {
    if (repoPath.status !== 200) {
      return reject("Error fetching repo path");
    }

    return resolve(repoPath.data.some((file) => file.name === "README.md"));
  });
};

const fetchReadmeFile = async function (githubUsername, githubRepo) {
  try {
    const hasReadme = await hasReadmeFile(githubUsername, githubRepo);
    if (!hasReadme) {
      throw new Error("no README file found");
    }

    const readmePath = "README.md";
    const readme = await axios.get(
      `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${readmePath}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    return Buffer.from(readme.data.content, "base64").toString("utf8");
  } catch (err) {
    console.log(err);
    return err.message;
  }
};

app.get("/api", (req, res) => {
  res.send("Hello World");
});

app.post("/api/linkedin-jobs/:id", async (req, res) => {
  const jobId = req.params.id;
  const liknedinScrapeUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
  const cssSelector = "[class*=description] > section > div";

  const requiredSkills = await linkedinScrape(liknedinScrapeUrl, cssSelector);
  linkedinJobSkills[jobId] = [];

  requiredSkills.forEach((skill) => {
    if (!linkedinJobSkills.includes(skill)) {
      linkedinJobSkills[jobId].push(skill);
    }
  });

  if (requiredSkills.length === 0) {
    return res.status(404).send("No skills found");
  }

  return res.status(200).send(requiredSkills);
});

app.get("/api/linkedIn-jobs/:id", async (req, res) => {
  const jobId = req.params.id;
  if (!linkedinJobSkills[jobId]) {
    return res.status(404).send("No skills found");
  }

  return res.status(200).send(linkedinJobSkills[jobId]);
});


app.get("/api/github/projects", async (req, res) => {
  return res.status(200).send(githubRepos);
});

app.get("/api/github/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const repo = githubRepos.find((repo) => repo.id === parseInt(id));
    if (!repo) {
      return res.status(404).send("Repo not found");
    }

    return res.status(200).send(repo);
  } catch (err) {
    return res.status(400).send("Invalid id");
  }
});

app.post("/api/github/projects", async (req, res) => {
  const githubUsername = req.body.githubUsername;
  const reposData = await githubScrape(githubUsername);

  if (reposData.length === 0) {
    return res.status(404).send("No repos found");
  }

  let count = 0;
  for (const repo of reposData) {
    const readmeFile = await fetchReadmeFile(githubUsername, repo.name);
    githubRepos.push({
      id: count,
      name: repo.name,
      description: repo.description,
      readme: readmeFile,
    });
    count++;
  }

  return res.status(200).send(githubRepos);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
