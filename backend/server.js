const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
const { createApp } = require("./app");
const net = require("net");
const { execSync } = require("child_process");
const os = require("os");

dotenv.config();

/**
 * Check if a port is available
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} - True if port is available
 */
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, () => {
      server.once("close", () => resolve(true));
      server.close();
    });

    server.on("error", () => resolve(false));
  });
};

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Starting port number
 * @param {number} maxAttempts - Maximum number of ports to try
 * @returns {Promise<number>} - Available port number
 */
const findAvailablePort = async (startPort, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  return null;
};

/**
 * Get information about what process is using a port
 * @param {number} port - Port number to check
 * @returns {Promise<string|null>} - Process information or null
 */
const getPortProcessInfo = async (port) => {
  try {
    const platform = os.platform();
    if (platform === "darwin" || platform === "linux") {
      const output = execSync(`lsof -i :${port}`, { encoding: "utf-8" });
      return output.trim() || null;
    } else if (platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf-8",
      });
      return output.trim() || null;
    }
    return null;
  } catch (error) {
    return null;
  }
};

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

    // Validate MongoDB URI format
    if (
      !mongoUri.startsWith("mongodb://") &&
      !mongoUri.startsWith("mongodb+srv://")
    ) {
      throw new Error(
        "Invalid MONGO_URI format. Must start with 'mongodb://' or 'mongodb+srv://'"
      );
    }

    // MongoDB connection options
    const mongooseOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 10000, // 10 seconds
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 10,
    };

    // Set up MongoDB connection event handlers
    mongoose.connection.on("connecting", () => {
      console.log("🔄 Connecting to MongoDB...");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
    });

    console.log("🔄 Attempting to connect to MongoDB...");
    await mongoose.connect(mongoUri, mongooseOptions);
    console.log("✅ MongoDB connection established successfully.");

    const app = createApp();
    let port = parseInt(process.env.PORT) || 5000;
    const requestedPort = port;

    // Check if the requested port is available
    const portAvailable = await isPortAvailable(port);

    if (!portAvailable) {
      console.error(`\n❌ Port ${port} is already in use!\n`);

      // Show what's using the port
      const processInfo = await getPortProcessInfo(port);
      if (processInfo) {
        console.log("📋 Process using port", port, ":");
        console.log(processInfo);
        console.log("");
      }

      console.log("🔍 How to identify and kill the process:\n");

      const platform = os.platform();
      if (platform === "darwin" || platform === "linux") {
        console.log("   Step 1: Find the process using the port:");
        console.log(`      lsof -i :${port}`);
        console.log("");
        console.log(
          "   Step 2: Kill the process (replace PID with actual process ID):"
        );
        console.log(`      kill -9 <PID>`);
        console.log("");
        console.log("   OR kill directly:");
        console.log(`      lsof -ti:${port} | xargs kill -9`);
        console.log("");
        console.log("   Step 3: Verify the port is free:");
        console.log(`      lsof -i :${port}`);
        console.log("      (Should show no output if port is free)\n");
      } else if (platform === "win32") {
        console.log("   Step 1: Find the process using the port:");
        console.log(`      netstat -ano | findstr :${port}`);
        console.log("");
        console.log(
          "   Step 2: Kill the process (replace PID with actual process ID):"
        );
        console.log(`      taskkill /PID <PID> /F`);
        console.log("");
        console.log("   Step 3: Verify the port is free:");
        console.log(`      netstat -ano | findstr :${port}`);
        console.log("      (Should show no output if port is free)\n");
      }

      // Check if FORCE_PORT env variable is set to fail instead of finding alternative
      if (process.env.FORCE_PORT === "true") {
        throw new Error(
          `Port ${port} is in use and FORCE_PORT=true. Please free the port first.`
        );
      }

      console.warn(`⚠️  Searching for an available alternative port...\n`);
      const availablePort = await findAvailablePort(port, 10);

      if (availablePort) {
        console.log(`✅ Found available port: ${availablePort}`);
        port = availablePort;

        if (port !== requestedPort) {
          console.warn(
            `\n⚠️  Note: Server is running on port ${port} instead of ${requestedPort}`
          );
          console.warn(
            `   To use port ${requestedPort}, kill the process above and restart the server`
          );
        }
      } else {
        throw new Error(
          `Could not find an available port. Tried ports ${requestedPort} to ${
            requestedPort + 9
          }`
        );
      }
    }

    // Create server with error handling
    const server = app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });

    // Handle process termination gracefully
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(() => {
        console.log("✅ HTTP server closed");
      });

      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");

      process.exit(0);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    // Handle server errors (fallback - should rarely trigger due to port checking)
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${port} became unavailable after check!`);
        console.error("\n💡 Port Conflict Troubleshooting:");
        console.error(`   1. Find and kill the process using port ${port}:`);
        console.error(`      lsof -ti:${port} | xargs kill -9`);
        console.error(`      OR`);
        console.error(`      npx kill-port ${port}`);
        console.error(
          `   2. Use a different port by setting PORT in .env file`
        );
        console.error(
          `   3. Check if another instance of this server is running`
        );
        console.error(`   4. On macOS/Linux, you can find the process with:`);
        console.error(`      lsof -i :${port}`);
        console.error(`   5. On Windows, you can find the process with:`);
        console.error(`      netstat -ano | findstr :${port}`);
      } else {
        console.error("❌ Server error:", err.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message || error);

    // Provide helpful error messages for port-related issues
    if (
      error.message?.includes("available port") ||
      error.message?.includes("port")
    ) {
      console.error("\n💡 Port Error Troubleshooting:");
      console.error("   1. Free up ports by killing processes using them");
      console.error("   2. Set a specific PORT in your .env file");
      console.error("   3. Check for other running instances of this server");
    }
    // Provide helpful error messages for common MongoDB connection issues
    else if (
      error.code === "ENOTFOUND" ||
      error.message?.includes("ENOTFOUND")
    ) {
      console.error("\n💡 MongoDB Connection Troubleshooting:");
      console.error(
        "   1. Check if your MongoDB Atlas cluster is running (not paused)"
      );
      console.error("   2. Verify the MONGO_URI connection string is correct");
      console.error(
        "   3. Ensure your IP address is whitelisted in MongoDB Atlas"
      );
      console.error("   4. Check your internet connection and DNS resolution");
      console.error(
        "   5. For SRV connections, ensure the hostname is correct"
      );
      console.error(
        "\n   Current MONGO_URI format:",
        process.env.MONGO_URI?.substring(0, 20) + "..." || "Not set"
      );
    } else if (error.message?.includes("authentication failed")) {
      console.error("\n💡 MongoDB Authentication Error:");
      console.error(
        "   1. Verify your MongoDB username and password are correct"
      );
      console.error("   2. Check if the database user has proper permissions");
    } else if (error.message?.includes("MONGO_URI")) {
      console.error("\n💡 MongoDB URI Error:");
      console.error("   1. Ensure MONGO_URI is set in your .env file");
      console.error(
        "   2. Format should be: mongodb+srv://username:password@cluster.mongodb.net/dbname"
      );
    }

    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer, configureCloudinary };
