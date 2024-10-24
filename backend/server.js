const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Token = require("./models/Token");
dotenv.config();

const app = express();

// Middleware
app.use(express.json()); // To handle JSON requests
app.use(cors()); // Enable CORS

app.get("/", (req, res) => {
  res.send("Backend server is running");
});

app.post("/api/tokens", async (req, res) => {
  const { name, symbol, totalSupply } = req.body;

  try {
    const newToken = new Token({ name, symbol, totalSupply });
    await newToken.save();
    res.status(201).json(newToken);
  } catch (error) {
    res.status(500).json({ message: "Error creating token", error });
  }
});

// Route to get all tokens
app.get("/api/tokens", async (req, res) => {
  try {
    const tokens = await Token.find();
    res.status(200).json(tokens);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tokens", error });
  }
});

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
