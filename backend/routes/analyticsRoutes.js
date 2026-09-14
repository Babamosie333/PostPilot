const express = require("express");
const router = express.Router();

const Post = require("../models/Post");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/summary", async (req, res) => {
  const posted = await Post.find({ userId: req.user._id, status: "posted" }).sort({
    postedAt: -1,
  });

  const withStats = posted.filter((p) => typeof p.likes === "number");
  const totalLikes = withStats.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = withStats.reduce((sum, p) => sum + (p.comments || 0), 0);

  const best = withStats.length
    ? withStats.reduce((a, b) => ((b.likes || 0) > (a.likes || 0) ? b : a))
    : null;

  res.json({
    totalPosted: posted.length,
    postsWithStats: withStats.length,
    totalLikes,
    totalComments,
    bestPost: best
      ? {
          id: best._id,
          generatedText: best.generatedText,
          likes: best.likes,
          comments: best.comments,
          postedAt: best.postedAt,
        }
      : null,
    posts: withStats
      .slice()
      .reverse()
      .map((p) => ({
        id: p._id,
        postedAt: p.postedAt,
        likes: p.likes || 0,
        comments: p.comments || 0,
      })),
  });
});

module.exports = router;
