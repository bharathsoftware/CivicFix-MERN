require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const issueRoutes = require("./routes/issues");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "3mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.use("/api/issues", rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "CivicFix API", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Create server/.env using .env.example.");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    console.error("JWT_SECRET must be set to a random string of at least 24 characters.");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`CivicFix API listening on port ${PORT}`));
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}
start();
