import express, { json } from "express";
import morgan from "morgan";
import router from "./routes/routes.js";

// dotenv.config();
const app = express();
const PORT = 5002;

// Middlewares
app.use(json());
app.use(morgan("dev"));
app.use("/", router);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`linkedin-microservice is running on port ${PORT}`);
});
