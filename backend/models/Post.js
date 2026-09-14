const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Local file paths for uploaded images. LinkedIn allows 1 (single image)
    // or up to 20 (multi-image carousel) — we cap this at 9 in the UI.
    images: { type: [String], default: [] },
    imageContext: { type: String, default: "" }, // user-provided hint, e.g. "hackathon win"
    imageDescription: { type: String, default: "" }, // from vision model, based on first image

    // Local file path for an uploaded video (mp4). Mutually exclusive with
    // images/link at the LinkedIn API level — see createPost's priority order.
    video: { type: String, default: "" },

    // A single link attachment (e.g. demo URL or GitHub repo). LinkedIn's
    // post schema only supports ONE rich link/article attachment per post,
    // and it's mutually exclusive with image attachments at the API level —
    // if linkUrl is set, the post publishes as a link/article post and any
    // images are for reference only in this dashboard, not sent to LinkedIn.
    linkUrl: { type: String, default: "" },
    linkTitle: { type: String, default: "" },

    generatedText: { type: String, default: "" }, // final caption
    topic: { type: String, default: "" },
    tone: {
      type: String,
      enum: ["authentic", "casual", "professional", "technical", "celebratory"],
      default: "authentic",
    },

    mode: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
    },

    // How this draft was created — a plain upload, or an auto-generated
    // weekly GitHub activity recap.
    source: {
      type: String,
      enum: ["manual", "github-recap"],
      default: "manual",
    },

    status: {
      type: String,
      enum: ["draft", "approved", "scheduled", "posted", "failed"],
      default: "draft",
    },

    scheduledFor: { type: Date },
    postedAt: { type: Date },
    linkedinPostId: { type: String },
    errorMessage: { type: String },

    // Engagement stats — either pulled from LinkedIn's Community Management
    // API (requires separate LinkedIn approval, not self-serve) or entered
    // manually by the user as a fallback.
    likes: { type: Number },
    comments: { type: Number },
    statsSource: { type: String, enum: ["linkedin", "manual"] },
    statsUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
