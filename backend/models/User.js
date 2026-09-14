const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Sign-in is LinkedIn-only — there's no password. Email/name come from
    // LinkedIn's profile at first login and are kept in sync on each sign-in.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },

    role: { type: String, enum: ["user", "admin"], default: "user" },

    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date },
    banReason: { type: String, default: "" },

    // Per-user LinkedIn connection — memberId is how we find the account on
    // login; unique+sparse so MongoDB itself prevents duplicate accounts
    // for the same LinkedIn member even under concurrent sign-in attempts.
    linkedin: {
      memberId: { type: String, index: { unique: true, sparse: true } },
      accessToken: { type: String },
      refreshToken: { type: String },
      accessTokenExpiresAt: { type: Date },
      refreshTokenExpiresAt: { type: Date },
    },

    // Optional GitHub connection, powers the weekly auto-recap draft feature
    github: {
      username: { type: String, default: "" },
      token: { type: String, default: "" }, // optional PAT, raises rate limit / allows private repo events
      lastRecapAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
