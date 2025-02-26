import express, { json } from "express";
import morgan from "morgan";
import { Octokit } from "@octokit/rest";
import axios from "axios";
import dotenv from "dotenv";
import router from "./routes/routes.js";

dotenv.config();

const app = express();
const PORT = 5001;

// Middlewares
app.use(json());
app.use(morgan("dev"));
app.use("/", router);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`github-microservice server is running on port ${PORT}`);
});
