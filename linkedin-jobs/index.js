import express, { json } from "express";
import morgan from "morgan";
import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const PORT = 5002;

// Middlewares
app.use(json());
app.use(morgan("dev"));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `You are a software engineer headhunter!`,
});

const linkedinJobSkills = [];

const linkedinScrape = async function (url, cssSelector) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
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
  const cleanedText = resultText.replace(/```json|```/g, "").trim();
  const requiredSkills = JSON.parse(cleanedText);

  return requiredSkills;
};

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`linkedin-microservice is running on port ${PORT}`);
});
