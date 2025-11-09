const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const { createApp } = require("./app");

dotenv.config();

const configureCloudinary = async () => {
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required Cloudinary environment variables: ${missingEnvVars.join(
        ", "
      )}`
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (process.env.NODE_ENV === "test") {
    return;
  }

  await cloudinary.api.ping();
  console.log("✅ Cloudinary configuration verified.");
};

const startServer = async () => {
  try {
    await configureCloudinary();

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is required");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB.");

    const app = createApp();
    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer, configureCloudinary };
