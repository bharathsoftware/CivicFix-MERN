const express = require("express");
const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const categories = [
  "Roads",
  "Garbage",
  "Streetlights",
  "Water",
  "Public Safety",
  "Other",
];

const statuses = ["Reported", "In Progress", "Resolved"];
const priorities = ["Low", "Medium", "High"];
const feedbackChoices = ["yes", "partial", "no"];

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET ALL ISSUES: search, category, status and sorting
router.get("/", async (req, res, next) => {
  try {
    const {
      search = "",
      category = "All",
      status = "All",
      sort = "newest",
    } = req.query;

    const filter = {};

    if (category !== "All" && categories.includes(category)) {
      filter.category = category;
    }

    if (status !== "All" && statuses.includes(status)) {
      filter.status = status;
    }

    if (String(search).trim()) {
      const escaped = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { location: { $regex: escaped, $options: "i" } },
      ];
    }

    const order =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "priority"
          ? { priority: -1, createdAt: -1 }
          : { createdAt: -1 };

    const issues = await Issue.find(filter)
      .sort(order)
      .limit(200)
      .populate("reporter", "name");

    res.json({ issues, total: issues.length });
  } catch (error) {
    next(error);
  }
});

// GET ONE ISSUE
router.get("/:id", async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid issue ID." });
    }

    const issue = await Issue.findById(req.params.id)
      .populate("reporter", "name");

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    res.json({ issue });
  } catch (error) {
    next(error);
  }
});

// CREATE ISSUE
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "");
    const location = String(req.body.location || "").trim();

    const priority = priorities.includes(req.body.priority)
      ? req.body.priority
      : "Medium";

    const photoData =
      typeof req.body.photoData === "string" ? req.body.photoData : "";

    if (
      photoData &&
      (
        !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photoData) ||
        photoData.length > 2000000
      )
    ) {
      return res.status(400).json({
        message: "Photo must be JPG, PNG, or WebP and within the size limit.",
      });
    }

    if (title.length < 5) {
      return res.status(400).json({
        message: "Title must be at least 5 characters.",
      });
    }

    if (description.length < 10) {
      return res.status(400).json({
        message: "Description must be at least 10 characters.",
      });
    }

    if (!categories.includes(category)) {
      return res.status(400).json({
        message: "Choose a valid category.",
      });
    }

    if (location.length < 3) {
      return res.status(400).json({
        message: "Enter a more specific location.",
      });
    }

    const now = new Date();

    const issue = await Issue.create({
      title,
      description,
      category,
      location,
      priority,
      photoData,
      reporter: req.user._id,
      reporterName: req.user.name,
      status: "Reported",
      statusHistory: [
        {
          status: "Reported",
          note: "Issue reported",
          changedBy: req.user._id,
          changedAt: now,
        },
      ],
    });

    res.status(201).json({
      message: "Issue reported successfully.",
      issue,
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE ISSUE
// Admins can change status.
// Citizens can edit their own report details, but not its status.
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid issue ID." });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    const isOwner =
      issue.reporter.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You can only edit your own report.",
      });
    }

    // Status changes are admin-only.
    if (req.body.status !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          message: "Only an admin can change issue status.",
        });
      }

      if (!statuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Choose a valid status.",
        });
      }

      if (issue.status !== req.body.status) {
        const previousStatus = issue.status;
        const now = new Date();

        const resolutionNote =
          typeof req.body.resolutionNote === "string"
            ? req.body.resolutionNote.trim()
            : "";

        if (
          req.body.status === "Resolved" &&
          resolutionNote.length > 1000
        ) {
          return res.status(400).json({
            message: "Resolution notes cannot exceed 1000 characters.",
          });
        }

        issue.status = req.body.status;

        if (req.body.status === "Resolved") {
          issue.resolvedAt = now;
          issue.resolutionNote = resolutionNote;
        } else {
          issue.resolvedAt = null;
          issue.resolutionNote = "";
        }

        if (!Array.isArray(issue.statusHistory)) {
          issue.statusHistory = [];
        }

        issue.statusHistory.push({
          status: req.body.status,
          note:
            req.body.status === "Resolved"
              ? resolutionNote || "Issue marked as resolved"
              : typeof req.body.note === "string"
                ? req.body.note.trim().slice(0, 1000)
                : `Status changed from ${previousStatus} to ${req.body.status}`,
          changedBy: req.user._id,
          changedAt: now,
        });
      } else if (
        req.body.status === "Resolved" &&
        typeof req.body.resolutionNote === "string"
      ) {
        issue.resolutionNote = req.body.resolutionNote.trim().slice(0, 1000);
      }
    } else if (
      req.body.resolutionNote !== undefined ||
      req.body.note !== undefined
    ) {
      return res.status(400).json({
        message: "Provide a valid status when updating resolution details.",
      });
    }

    // Only the original reporter may edit report details.
    if (isOwner) {
      for (const key of ["title", "description", "location"]) {
        if (req.body[key] !== undefined) {
          issue[key] = String(req.body[key]).trim();
        }
      }

      if (
        req.body.category !== undefined &&
        categories.includes(req.body.category)
      ) {
        issue.category = req.body.category;
      }

      if (
        req.body.priority !== undefined &&
        priorities.includes(req.body.priority)
      ) {
        issue.priority = req.body.priority;
      }
    }

    await issue.save();

    res.json({
      message: "Issue updated successfully.",
      issue,
    });
  } catch (error) {
    next(error);
  }
});

// SUBMIT CITIZEN FEEDBACK
// Only the original reporter can submit feedback, once per issue.
router.post("/:id/feedback", requireAuth, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid issue ID." });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    const isOwner =
      issue.reporter.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "Only the person who reported this issue can submit feedback.",
      });
    }

    if (issue.status !== "Resolved") {
      return res.status(400).json({
        message: "Feedback can only be submitted after resolution.",
      });
    }

    if (issue.feedback && issue.feedback.submittedAt) {
      return res.status(409).json({
        message: "Feedback has already been submitted for this issue.",
      });
    }

    const rating = Number(req.body.rating);
    const fixed = String(req.body.fixed || "");
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5 stars.",
      });
    }

    if (!feedbackChoices.includes(fixed)) {
      return res.status(400).json({
        message: "Choose whether the issue was fixed.",
      });
    }

    if (comment.length > 1000) {
      return res.status(400).json({
        message: "Feedback comment cannot exceed 1000 characters.",
      });
    }

    const now = new Date();

    issue.feedback = {
      rating,
      fixed,
      comment,
      submittedAt: now,
      submittedBy: req.user._id,
    };

    // If not fully fixed, request another review and move it back
    // to In Progress so the administration can investigate again.
    if (fixed === "partial" || fixed === "no") {
      issue.reviewRequested = true;
      issue.reviewRequestedAt = now;
      issue.status = "In Progress";
      issue.resolvedAt = null;

      if (!Array.isArray(issue.statusHistory)) {
        issue.statusHistory = [];
      }

      issue.statusHistory.push({
        status: "In Progress",
        note:
          fixed === "no"
            ? "Citizen reported that the issue is not fixed; review requested."
            : "Citizen reported that the issue is partially fixed; review requested.",
        changedBy: req.user._id,
        changedAt: now,
      });
    }

    await issue.save();

    res.status(201).json({
      message:
        fixed === "yes"
          ? "Thank you for your feedback."
          : "Feedback saved. The issue has been sent for review.",
      issue,
    });
  } catch (error) {
    next(error);
  }
});

// REQUEST A REVIEW WITHOUT SUBMITTING FEEDBACK
router.post("/:id/review", requireAuth, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid issue ID." });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    const isOwner =
      issue.reporter.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "Only the original reporter can request a review.",
      });
    }

    if (issue.status !== "Resolved") {
      return res.status(400).json({
        message: "Only a resolved issue can be sent for review.",
      });
    }

    if (issue.reviewRequested) {
      return res.status(409).json({
        message: "A review has already been requested.",
      });
    }

    const now = new Date();

    issue.reviewRequested = true;
    issue.reviewRequestedAt = now;
    issue.status = "In Progress";
    issue.resolvedAt = null;

    if (!Array.isArray(issue.statusHistory)) {
      issue.statusHistory = [];
    }

    issue.statusHistory.push({
      status: "In Progress",
      note: "Citizen requested a review of the resolution.",
      changedBy: req.user._id,
      changedAt: now,
    });

    await issue.save();

    res.json({
      message: "Review requested successfully.",
      issue,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE ISSUE
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid issue ID." });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    const isOwner =
      issue.reporter.toString() === req.user._id.toString();

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You can only delete your own report.",
      });
    }

    await issue.deleteOne();

    res.json({ message: "Issue deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;