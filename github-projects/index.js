import express, { json } from "express";
import morgan from "morgan";
import { Octokit } from "@octokit/rest";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const PORT = 5001;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Middlewares
app.use(json());
app.use(morgan("dev"));

const githubRepos = [];

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`github-microservice server is running on port ${PORT}`);
});
