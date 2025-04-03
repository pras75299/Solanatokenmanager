const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const tokenRoutes = require("./routes/tokenRoutes");
const nftRoutes = require("./routes/nftRoutes");
const airdropRoutes = require("./routes/airdropRoutes");

// Load environment variables first, before any other operations
dotenv.config({ path: path.join(__dirname, ".env") });

// Validate and configure Cloudinary immediately
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
    console.error("Missing required environment variables:", missingEnvVars);
    process.exit(1);
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    // Verify Cloudinary configuration with await
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary configuration verified:", result);
    return true;
  } catch (error) {
    console.error("❌ Cloudinary configuration error:", error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    // Ensure Cloudinary is configured before starting the server
    await configureCloudinary();

    const app = express();
    app.use(express.json());
    app.use(cors());

    // Serve static files from the uploads directory
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // Root endpoint
    app.get("/", (req, res) => res.send("Backend server is running"));

    // Use routes
    app.use("/api", tokenRoutes);
    app.use("/api", nftRoutes);
    app.use("/api", airdropRoutes);

    // MongoDB connection and server start
    const PORT = process.env.PORT || 5000;
    const MONGO_URI = process.env.MONGO_URI;

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
