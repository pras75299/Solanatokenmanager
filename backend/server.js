const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const tokenRoutes = require("./routes/tokenRoutes");
const nftRoutes = require("./routes/nftRoutes");
const airdropRoutes = require("./routes/airdropRoutes");

// Load environment variables
// Added error handling for dotenv loading
dotenv.config();

// Validate and configure Cloudinary
const configureCloudinary = async () => {
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "MONGO_URI",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  if (missingEnvVars.length > 0) {
    console.error(
      "❌ Fatal Error: Missing required environment variables:",
      missingEnvVars
    );
    process.exit(1);
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    // Verify Cloudinary configuration
    await cloudinary.api.ping();
    console.log("✅ Cloudinary configuration verified.");
  } catch (error) {
    console.error(
      "❌ Fatal Error: Cloudinary configuration is invalid:",
      error.message
    );
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await configureCloudinary();

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get("/", (req, res) =>
      res.status(200).send("Backend server is healthy")
    );

    // API Routes
    app.use("/api", tokenRoutes);
    app.use("/api", nftRoutes);
    app.use("/api", airdropRoutes);

    app.use((err, req, res, next) => {
      console.error("Unhandled Error:", err);
      res.status(500).json({
        success: false,
        message: "An unexpected server error occurred.",
      });
    });

    // MongoDB Connection
    const PORT = process.env.PORT || 5000;
    const MONGO_URI = process.env.MONGO_URI;

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    // Start Server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
