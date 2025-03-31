const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const tokenRoutes = require("./routes/tokenRoutes");
const nftRoutes = require("./routes/nftRoutes");
const airdropRoutes = require("./routes/airdropRoutes");

dotenv.config();

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
const MONGO_URI = process.env.MONGO_URI || "your-mongodb-uri-here";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });
