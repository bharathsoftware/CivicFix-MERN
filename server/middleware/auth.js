
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Check whether the user is logged in
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.sub)
      .select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        message: "Account not found. Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

// Check whether the logged-in user is an administrator
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required.",
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};