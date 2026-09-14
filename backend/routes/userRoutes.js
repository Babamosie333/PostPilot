const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isBanned: user.isBanned,
    linkedinConnected: !!user.linkedin?.memberId,
    github: {
      username: user.github?.username || "",
      connected: !!user.github?.username,
      lastRecapAt: user.github?.lastRecapAt,
    },
  };
}

router.get("/me", authenticate, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Save/update the GitHub username (and optional PAT) used for weekly recap drafts
router.patch("/me/github", authenticate, async (req, res) => {
  const { username = "", token = "" } = req.body;
  req.user.github = {
    ...req.user.github,
    username: username.trim(),
    token: token.trim(),
  };
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
