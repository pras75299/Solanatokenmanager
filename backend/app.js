const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const tokenRoutes = require("./routes/tokenRoutes");
const nftRoutes = require("./routes/nftRoutes");
const airdropRoutes = require("./routes/airdropRoutes");

const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || "*",
      methods: ["GET", "POST", "DELETE", "PATCH", "PUT"],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) =>
    res.status(200).json({ success: true, message: "Backend server is healthy" })
  );

  app.use("/api", tokenRoutes);
  app.use("/api", nftRoutes);
  app.use("/api", airdropRoutes);

  app.use((_req, res) =>
    res.status(404).json({
      success: false,
      message: "Resource not found",
    })
  );

  app.use((err, _req, res, _next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "An unexpected server error occurred.",
    });
  });

  return app;
};

module.exports = { createApp };
