
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Create a JWT token
function tokenFor(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Return safe user information
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

// Register a new account
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2) {
      return res.status(400).json({
        message: "Name must be at least 2 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    // Only the email configured in the server environment can
    // receive the admin role during registration.
    const configuredAdminEmail = String(
      process.env.ADMIN_EMAIL || ""
    )
      .trim()
      .toLowerCase();

    const isConfiguredAdmin =
      configuredAdminEmail !== "" &&
      email === configuredAdminEmail;

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: isConfiguredAdmin ? "admin" : "user",
    });

    return res.status(201).json({
      message: "Registration successful.",
      token: tokenFor(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
});

// Log in to an existing account
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email })
      .select("+passwordHash");

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: "Email or password is incorrect.",
      });
    }

    return res.json({
      message: "Login successful.",
      token: tokenFor(user),
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// Get the currently logged-in user's details
router.get("/me", requireAuth, (req, res) => {
  return res.json({
    user: publicUser(req.user),
  });
});

module.exports = router;