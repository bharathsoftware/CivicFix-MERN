
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();

  if (!email) {
    throw new Error("ADMIN_EMAIL is missing from server/.env");
  }

  // Use the MongoDB environment variable already configured by your project.
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MongoDB URI not found. Check the variable name in server/.env."
    );
  }

  await mongoose.connect(mongoUri);

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin" } },
    { new: true }
  );

  if (!user) {
    console.log(
      "No account found for ADMIN_EMAIL. Register that email first."
    );
  } else {
    console.log("Admin role assigned to:", user.email);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Admin setup failed:", error.message);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exitCode = 1;
});