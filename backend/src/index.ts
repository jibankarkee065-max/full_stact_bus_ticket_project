
 // src/index.ts
import "dotenv/config";

import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import connectDB from "./config/database.js";
import dns from "dns";
import authRoutes from "./routes/authRoutes.js";
//import listingRoutes from "./routes/listingRoutes";

// Point this process at Google Public DNS for MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 4001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/listings", listingRoutes);

// Health check -- useful for checking the server is alive
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "API is running" });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "API is running" });
});

// 404 -- any request that matched no route above
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler -- the safety net
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({ message: err.message });
      return;
    }

    if (err.name === "CastError") {
      res.status(400).json({ message: "Invalid ID format" });
      return;
    }

    res.status(500).json({ message: err.message || "Server error" });
  }
);

// Connect to the database first, then start listening
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Database connected successfully Added By Cloned User");
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error(
      "Failed to start server because MongoDB did not connect:",
      error
    );
    process.exit(1);
  });
