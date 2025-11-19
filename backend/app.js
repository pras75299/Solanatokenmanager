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
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          console.log("[CORS] Allowing request with no origin");
          return callback(null, true);
        }

        // If no allowed origins specified, allow all (development mode)
        if (allowedOrigins.length === 0) {
          console.log(`[CORS] Allowing origin: ${origin} (no restrictions)`);
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          console.log(`[CORS] Allowing origin: ${origin}`);
          return callback(null, true);
        }

        console.error(`[CORS] Blocked origin: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "DELETE", "PATCH", "PUT", "OPTIONS"],
      optionsSuccessStatus: 204,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) =>
    res.status(200).json({ success: true, message: "Backend server is healthy" })
  );

  // Health check endpoint under /api for frontend
  app.get("/api/health", (_req, res) =>
    res.status(200).json({ 
      success: true, 
      message: "Backend server is healthy",
      timestamp: new Date().toISOString()
    })
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

  app.use((err, req, res, _next) => {
    console.error("[Error Handler] Unhandled Error:", err);
    
    // Handle CORS errors specifically
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({
        success: false,
        message: "CORS Error: Origin not allowed",
        error: err.message,
      });
    }

    res.status(err.status || 500).json({
      success: false,
      message: err.message || "An unexpected server error occurred.",
    });
  });

  return app;
};

module.exports = { createApp };
