require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const postRoutes = require("./routes/postRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { startScheduler, processDuePosts } = require("./services/scheduler");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/analytics", analyticsRoutes);

// Manual trigger endpoint - useful if you later switch to an external
// cron service (e.g. cron-job.org) hitting this instead of node-cron.
app.post("/api/check-scheduled-posts", async (req, res) => {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await processDuePosts();
  res.json({ checked: true });
});

app.get("/", (req, res) => res.send("PostPilot backend is running."));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`PostPilot backend running on port ${PORT}`));
    startScheduler();
  })
  .catch((err) => console.error("MongoDB connection error:", err));
