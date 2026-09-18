const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const router = express.Router();

const Post = require("../models/Post");
const aiService = require("../services/aiService");
const linkedinService = require("../services/linkedinService");
const githubService = require("../services/githubService");
const { authenticate } = require("../middleware/auth");

// Only real images and MP4 video are accepted — anything else is rejected
// before it touches disk. Files are also renamed to a random name with a
// safe, whitelisted extension (never the client-supplied filename), so a
// disguised upload (e.g. an .html or .svg file with a script payload)
// can't be served back as executable/renderable content later.
const ALLOWED_MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME_EXT[file.mimetype] || "";
    cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB — LinkedIn itself allows up to 500MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_EXT[file.mimetype]) cb(null, true);
    else cb(new Error("Unsupported file type — only JPEG/PNG/GIF/WebP images and MP4 video are allowed"));
  },
});

const uploadFields = upload.fields([
  { name: "images", maxCount: 9 },
  { name: "video", maxCount: 1 },
]);

router.use(authenticate);

// 1. Upload up to 9 images OR one video + optional context/topic/link/tone ->
// AI generates description + caption from the first image -> saved as draft
router.post("/generate", uploadFields, async (req, res) => {
  try {
    const {
      context = "",
      topic = "",
      mode = "manual",
      linkUrl = "",
      linkTitle = "",
      tone = "authentic",
    } = req.body;
    const imagePaths = (req.files?.images || []).map((f) => f.path);
    const videoPath = req.files?.video?.[0]?.path || "";

    let imageDescription = "";
    if (imagePaths[0]) {
      imageDescription = await aiService.describeImage(imagePaths[0]);
    }

    const generatedText = await aiService.generateCaption({
      imageDescription,
      context,
      topic,
      linkUrl,
      hasVideo: !!videoPath,
      tone,
    });

    const post = await Post.create({
      userId: req.user._id,
      images: imagePaths,
      imageContext: context,
      imageDescription,
      video: videoPath,
      linkUrl,
      linkTitle,
      generatedText,
      topic,
      tone,
      mode,
      // manual mode -> sits as draft for review
      // auto mode -> marked approved immediately, still needs scheduledFor to actually send
      status: mode === "auto" ? "approved" : "draft",
    });

    res.json(post);
  } catch (err) {
    console.error(err.response?.data || err.message);
    const message = err.message?.includes("File too large")
      ? "Video is too large (200MB limit)"
      : err.message?.includes("Unsupported file type")
      ? err.message
      : "Failed to generate post";
    res.status(err.message?.includes("Unsupported file type") ? 400 : 500).json({ error: message });
  }
});

// 2. Edit a draft's caption/link (review mode)
router.patch("/:id", async (req, res) => {
  const { generatedText, status, linkUrl, linkTitle, likes, comments } = req.body;
  const update = {
    ...(generatedText !== undefined && { generatedText }),
    ...(status && { status }),
    ...(linkUrl !== undefined && { linkUrl }),
    ...(linkTitle !== undefined && { linkTitle }),
  };

  // Manual stats entry — fallback when LinkedIn's Community Management API
  // isn't available on this app (see linkedinService.getPostStats).
  if (likes !== undefined || comments !== undefined) {
    if (likes !== undefined) update.likes = Number(likes);
    if (comments !== undefined) update.comments = Number(comments);
    update.statsSource = "manual";
    update.statsUpdatedAt = new Date();
  }

  const post = await Post.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    update,
    { new: true }
  );
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// 2b. Regenerate a draft's caption with the same inputs, optionally a new tone
router.post("/:id/regenerate", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const tone = req.body.tone || post.tone || "authentic";

    const generatedText =
      post.source === "github-recap"
        ? await aiService.generateRecapCaption({
            commitSummary: post.imageContext || post.generatedText,
            tone,
          })
        : await aiService.generateCaption({
            imageDescription: post.imageDescription,
            context: post.imageContext,
            topic: post.topic,
            linkUrl: post.linkUrl,
            hasVideo: !!post.video,
            tone,
          });

    post.generatedText = generatedText;
    post.tone = tone;
    await post.save();

    res.json(post);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to regenerate caption" });
  }
});

// 3. Schedule an approved/draft post for a future time
router.post("/:id/schedule", async (req, res) => {
  const { scheduledFor } = req.body;
  const post = await Post.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { scheduledFor: new Date(scheduledFor), status: "scheduled" },
    { new: true }
  );
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// 4. Post immediately (manual trigger, bypasses scheduling)
router.post("/:id/post-now", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const account = await linkedinService.getAccountForUser(req.user._id);
    const linkedinPostId = await linkedinService.createPost({
      account,
      text: post.generatedText,
      imagePaths: post.images,
      videoPath: post.video,
      linkUrl: post.linkUrl,
      linkTitle: post.linkTitle,
    });

    post.status = "posted";
    post.postedAt = new Date();
    post.linkedinPostId = linkedinPostId;
    await post.save();

    res.json(post);
  } catch (err) {
    console.error(err.response?.data || err.message);
    await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "failed", errorMessage: err.message }
    );
    res.status(500).json({ error: err.message || "Failed to post to LinkedIn" });
  }
});

// 4b. Refresh like/comment counts from LinkedIn (requires Community
// Management API access on your LinkedIn app — see linkedinService.js).
// On failure, the frontend falls back to letting the user enter stats by hand.
router.post("/:id/refresh-stats", async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (!post.linkedinPostId) return res.status(400).json({ error: "This post hasn't been published yet" });

    const account = await linkedinService.getAccountForUser(req.user._id);
    const stats = await linkedinService.getPostStats(account, post.linkedinPostId);

    post.likes = stats.likes;
    post.comments = stats.comments;
    post.statsSource = "linkedin";
    post.statsUpdatedAt = new Date();
    await post.save();

    res.json(post);
  } catch (err) {
    const isAccessError = err.response?.status === 403 || err.response?.status === 401;
    console.error(err.response?.data || err.message);
    res.status(isAccessError ? 403 : 500).json({
      error: isAccessError
        ? "LinkedIn hasn't granted this app Community Management API access, so stats can't be pulled automatically. Enter them manually below instead."
        : "Failed to fetch stats from LinkedIn",
      accessDenied: isAccessError,
    });
  }
});

// 5. List this user's posts (dashboard feed)
router.get("/", async (req, res) => {
  const { status } = req.query;
  const filter = { userId: req.user._id, ...(status && { status }) };
  const posts = await Post.find(filter).sort({ createdAt: -1 });
  res.json(posts);
});

router.delete("/:id", async (req, res) => {
  await Post.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ deleted: true });
});

// 6. Manually trigger a GitHub recap draft right now (for testing, instead
// of waiting for Sunday's cron run)
router.post("/github-recap", async (req, res) => {
  try {
    if (!req.user.github?.username) {
      return res.status(400).json({ error: "Connect a GitHub username first, in Settings" });
    }
    const post = await githubService.generateRecapForUser(req.user, { forceFullWeek: true });
    if (!post) {
      return res.json({ created: false, message: "No new commits found since your last recap" });
    }
    res.json({ created: true, post });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate recap" });
  }
});

// 7. AI Assistant — freeform chat reply, does NOT save anything.
// The frontend keeps its own short conversation history and sends it along
// so follow-up messages have context.
router.post("/ai-chat", async (req, res) => {
  try {
    const { message, history = [], tone = "authentic" } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message required" });

    const reply = await aiService.generateAssistantReply({ message, history, tone });
    res.json({ reply });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to get a reply" });
  }
});

// 8. Explicitly save an AI Assistant reply as a draft — only happens when
// the user clicks "Save as draft", never automatically.
router.post("/save-as-draft", async (req, res) => {
  try {
    const { text, tone = "authentic" } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Text required" });

    const post = await Post.create({
      userId: req.user._id,
      generatedText: text,
      tone,
      mode: "manual",
      source: "manual",
      status: "draft",
    });
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

module.exports = router;