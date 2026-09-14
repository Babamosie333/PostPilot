const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT, loads the user, and blocks banned users on every request.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    if (user.isBanned) {
      return res.status(403).json({
        error: "Your account has been banned.",
        banned: true,
        banReason: user.banReason || undefined,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function signToken(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
}

module.exports = { authenticate, requireAdmin, signToken };
