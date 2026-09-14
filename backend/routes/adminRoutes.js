const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Post = require("../models/Post");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.use(authenticate, requireAdmin);

router.get("/users", async (req, res) => {
  const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });
  const counts = await Post.aggregate([{ $group: { _id: "$userId", count: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  res.json(
    users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      isBanned: u.isBanned,
      banReason: u.banReason,
      linkedinConnected: !!u.linkedin?.memberId,
      postCount: countMap[String(u._id)] || 0,
      createdAt: u.createdAt,
    }))
  );
});

router.post("/users/:id/ban", async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    return res.status(400).json({ error: "You can't ban your own account" });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role === "admin") {
    return res.status(400).json({ error: "Can't ban another admin" });
  }

  target.isBanned = true;
  target.bannedAt = new Date();
  target.banReason = req.body.reason || "";
  await target.save();
  res.json({ banned: true });
});

router.post("/users/:id/unban", async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });

  target.isBanned = false;
  target.bannedAt = undefined;
  target.banReason = "";
  await target.save();
  res.json({ banned: false });
});

module.exports = router;
