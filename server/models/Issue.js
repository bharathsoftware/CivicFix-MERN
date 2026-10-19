
const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Reported", "In Progress", "Resolved"],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    fixed: {
      type: String,
      enum: ["yes", "partial", "no"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    submittedAt: {
      type: Date,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Roads",
        "Garbage",
        "Streetlights",
        "Water",
        "Public Safety",
        "Other",
      ],
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    photoData: {
      type: String,
      default: "",
      maxlength: 2200000,
    },
    status: {
      type: String,
      enum: ["Reported", "In Progress", "Resolved"],
      default: "Reported",
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
      trim: true,
    },

    // Resolution details
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // Complete issue status timeline
    statusHistory: {
      type: [statusHistorySchema],
      default: function () {
        return [
          {
            status: this.status || "Reported",
            note: "Issue reported",
            changedAt: this.createdAt || new Date(),
          },
        ];
      },
    },

    // Citizen feedback after resolution
    feedback: {
      type: feedbackSchema,
      default: null,
    },

    // Set when a citizen reports that the issue is not fixed
    reviewRequested: {
      type: Boolean,
      default: false,
    },
    reviewRequestedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

issueSchema.index({
  title: "text",
  description: "text",
  location: "text",
});

issueSchema.index({ createdAt: -1 });
issueSchema.index({ reporter: 1, createdAt: -1 });

module.exports = mongoose.model("Issue", issueSchema);
