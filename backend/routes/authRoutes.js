const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/User");
const linkedinService = require("../services/linkedinService");
const { signToken, authenticate } = require("../middleware/auth");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Step 1: send the browser to LinkedIn's consent screen. This is the ONLY
// login method — there's no separate email/password signup. A short-lived
// signed nonce in `state` guards against CSRF; no userId is needed since
// the account may not exist yet.
router.get("/linkedin/login", (req, res) => {
  const state = jwt.sign({ nonce: Math.random().toString(36).slice(2) }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
  res.redirect(linkedinService.getAuthUrl(state));
});

// Step 2: LinkedIn redirects back here with a code. We exchange it, then
// find-or-create the User by LinkedIn memberId, and hand the frontend a
// session token via a redirect query param (this is a full-page redirect,
// so there's no other way to hand back a token here).
router.get("/linkedin/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) {
      return res.redirect(`${FRONTEND_URL}/?authError=${encodeURIComponent(error_description || error)}`);
    }
    if (!state) return res.redirect(`${FRONTEND_URL}/?authError=Missing+state+parameter`);

    try {
      jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return res.redirect(`${FRONTEND_URL}/?authError=This+sign-in+link+expired.+Please+try+again.`);
    }

    const profile = await linkedinService.exchangeCodeForToken(code);

    const userCount = await User.countDocuments();
    const isConfiguredAdmin =
      process.env.ADMIN_EMAIL &&
      profile.email &&
      profile.email.toLowerCase().trim() === process.env.ADMIN_EMAIL.toLowerCase().trim();
    const role = userCount === 0 || isConfiguredAdmin ? "admin" : "user";
    const fallbackEmail = `${profile.memberId}@linkedin.local`;

    // Find-or-create by LinkedIn memberId, with a fallback merge by email —
    // this handles the case where an account already exists with this email
    // but no LinkedIn identity yet (e.g. created via the dev-login bypass),
    // by attaching this LinkedIn connection to that existing account instead
    // of colliding with it on the unique email index.
    let user = await User.findOne({ "linkedin.memberId": profile.memberId });

    if (!user && profile.email) {
      user = await User.findOne({ email: profile.email.toLowerCase().trim() });
    }

    if (user) {
      user.linkedin = profile.linkedin;
      if (profile.name) user.name = profile.name;
      if (profile.email) user.email = profile.email;
      await user.save();
    } else {
      try {
        user = await User.create({
          email: profile.email || fallbackEmail,
          name: profile.name,
          role,
          linkedin: profile.linkedin,
        });
      } catch (raceErr) {
        // Two near-simultaneous callback hits for a brand-new account can
        // both reach here at once — one wins the insert, the other hits a
        // duplicate-key error. In that case the account now exists, so
        // just fetch it instead of failing the sign-in.
        if (raceErr.code === 11000) {
          user =
            (await User.findOne({ "linkedin.memberId": profile.memberId })) ||
            (await User.findOne({ email: profile.email?.toLowerCase().trim() }));
        }
        if (!user) throw raceErr;
      }
    }

    if (user.isBanned) {
      return res.redirect(
        `${FRONTEND_URL}/?banned=1&reason=${encodeURIComponent(user.banReason || "")}`
      );
    }

    const token = signToken(user);
    res.redirect(`${FRONTEND_URL}/?token=${token}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/?authError=Failed+to+sign+in+with+LinkedIn`);
  }
});

router.get("/linkedin/status", authenticate, async (req, res) => {
  const connected = !!req.user.linkedin?.memberId;
  res.json({ connected, memberId: connected ? req.user.linkedin.memberId : undefined });
});

// TEMPORARY dev-only bypass — lets you into the app without going through
// LinkedIn's browser flow, for local testing while that's being sorted out.
// Only works if DEV_LOGIN_SECRET is set in .env; leave it unset (or delete
// this route) once LinkedIn login is working, since accounts made this way
// have no LinkedIn tokens and can't actually post until they connect for real.
router.post("/dev-login", async (req, res) => {
  if (!process.env.DEV_LOGIN_SECRET) {
    return res.status(404).json({ error: "Not enabled" });
  }
  if (req.body.secret !== process.env.DEV_LOGIN_SECRET) {
    return res.status(403).json({ error: "Invalid dev secret" });
  }

  const email = (req.body.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "Email required" });

  let user = await User.findOne({ email });
  if (!user) {
    const userCount = await User.countDocuments();
    const isConfiguredAdmin =
      process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase().trim();
    const role = userCount === 0 || isConfiguredAdmin ? "admin" : "user";
    user = await User.create({ email, name: email.split("@")[0], role });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "This account has been banned.", banned: true, banReason: user.banReason });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
});

module.exports = router;
