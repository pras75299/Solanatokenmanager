const solanaService = require("../services/solanaService");
const NFT = require("../models/NFT");
const loadKeypair = require("../importKey");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;
const dotenv = require("dotenv");

// Cloudinary configuration validation
const validateCloudinaryConfig = () => {
  const requiredConfigs = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missingConfigs = requiredConfigs.filter(
    (config) => !process.env[config]
  );

  if (missingConfigs.length > 0) {
    throw new Error(
      `Missing Cloudinary configuration: ${missingConfigs.join(", ")}`
    );
  }

  return true;
};

// Standardized Cloudinary upload options
const getCloudinaryOptions = (publicKey, customOptions = {}) => ({
  folder: "solana-nfts",
  resource_type: "image",
  public_id: `${publicKey}-${Date.now()}`,
  transformation: [
    { quality: "auto:best" },
    { fetch_format: "auto" },
    { width: 1000, crop: "limit" },
  ],
  format: "webp",
  ...customOptions,
});

// Configure Cloudinary - Removed the try/catch as server.js handles initial validation
// Ensure validateCloudinaryConfig is defined before this if needed elsewhere,
// but server.js handles the main startup check.
// validateCloudinaryConfig(); // Optional: Keep if needed for other potential uses
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: "./tmp/uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimeTypeValid = allowedTypes.test(file.mimetype);
    const extensionValid = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimeTypeValid && extensionValid) {
      return cb(null, true);
    }
    // Provide a specific error for invalid file types
    cb(
      new Error("Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.")
    );
  },
}).single("file");

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, error = null) => {
  console.error(
    `Error ${statusCode}: ${message}`,
    error ? error.message || error : ""
  );
  return res.status(statusCode).json({
    success: false,
    message: message,
    error: error ? error.message || String(error) : undefined,
  });
};

exports.mintNFT = async (req, res) => {
  const { recipientPublicKey, metadata } = req.body;

  // --- Input Validation ---
  if (!recipientPublicKey || !metadata) {
    return sendErrorResponse(
      res,
      400,
      "Missing required fields: recipientPublicKey or metadata"
    );
  }
  if (!metadata.uri || !metadata.name || !metadata.symbol) {
    return sendErrorResponse(
      res,
      400,
      "Missing required metadata fields: uri, name, or symbol"
    );
  }

  try {
    let finalImageUri = metadata.uri;

    // --- Upload Image to Cloudinary if necessary ---
    if (!finalImageUri.includes("cloudinary.com")) {
      try {
        let uploadResult;
        if (finalImageUri.startsWith("data:image")) {
          // Handle Base64
          const base64Data = finalImageUri.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const tempPath = `./tmp/uploads/${Date.now()}-image.png`; // Consider more robust temp naming
          await fs.mkdir("./tmp/uploads", { recursive: true });
          await fs.writeFile(tempPath, buffer);
          uploadResult = await cloudinary.uploader.upload(
            tempPath,
            getCloudinaryOptions(recipientPublicKey)
          );
          await fs
            .unlink(tempPath)
            .catch((err) =>
              console.error("Failed to delete temp base64 file:", err)
            );
        } else {
          // Handle URL
          uploadResult = await cloudinary.uploader.upload(
            finalImageUri,
            getCloudinaryOptions(recipientPublicKey)
          );
        }

        if (!uploadResult?.secure_url?.includes("cloudinary.com")) {
          throw new Error("Invalid Cloudinary response after upload attempt");
        }
        finalImageUri = uploadResult.secure_url;
      } catch (uploadError) {
        return sendErrorResponse(
          res,
          400,
          "Failed to process image URI. Please ensure it's a valid image URL or Base64 string.",
          uploadError
        );
      }
    }

    // --- Prepare Final Metadata ---
    const finalMetadata = {
      ...metadata,
      uri: finalImageUri, // Ensure final Cloudinary URI
      image: finalImageUri, // Ensure final Cloudinary image
      properties: {
        ...(metadata.properties || {}),
        files: metadata.properties?.files?.map((file) => ({
          // Update files array if present
          ...file,
          uri: finalImageUri,
        })) || [{ uri: finalImageUri, type: "image/webp" }], // Default if no files property
      },
    };

    // --- Mint NFT via Solana Service ---
    const mintServiceResult = await solanaService.mintNFT(
      recipientPublicKey,
      finalMetadata
    );

    // Safer regex pattern with error handling
    const mintAddressMatch = mintServiceResult.match(/Mint Address: ([\w\d]+)/); // More specific regex
    if (!mintAddressMatch?.[1]) {
      console.error(
        "[mintNFT] Could not extract mint address from service result:",
        mintServiceResult
      );
      throw new Error("Failed to extract mint address after minting.");
    }
    const mintAddress = mintAddressMatch[1];
    console.log(`[mintNFT] Extracted Mint Address: ${mintAddress}`);

    // --- Save NFT to Database ---
    const newNFT = new NFT({
      recipientPublicKey,
      mintAddress,
      uri: finalImageUri,
      name: finalMetadata.name,
      symbol: finalMetadata.symbol,
    });
    await newNFT.save();
    console.log(`[mintNFT] NFT saved to database: ${mintAddress}`);

    // --- Send Success Response ---
    return res.status(200).json({
      success: true,
      message: mintServiceResult, // Original message from service
      data: {
        mintAddress,
        nft: newNFT,
      },
    });
  } catch (error) {
    // --- Error Handling ---
    if (error.message.includes("Cloudinary")) {
      return sendErrorResponse(
        res,
        500,
        "A Cloudinary related error occurred during minting.",
        error
      );
    }
    if (error.message.includes("extract mint address")) {
      return sendErrorResponse(
        res,
        500,
        "Failed to confirm minting result.",
        error
      );
    }
    // Generic error
    return sendErrorResponse(
      res,
      500,
      "Failed to mint NFT due to an unexpected error.",
      error
    );
  }
};

exports.getMintedNFTs = async (req, res) => {
  try {
    const nfts = await NFT.find();
    res.status(200).json(nfts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch minted NFTs", error: error.message });
  }
};

exports.fetchNFTs = async (req, res) => {
  const { publicKey } = req.query;
  try {
    const query = publicKey ? { recipientPublicKey: publicKey } : {};
    const nfts = await NFT.find(query);
    res.status(200).json(nfts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch NFTs", error: error.message });
  }
};

exports.transferNFT = async (req, res) => {
  const { mintAddress, recipientPublicKey } = req.body;

  // --- Input Validation ---
  if (!mintAddress || !recipientPublicKey) {
    return sendErrorResponse(
      res,
      400,
      "Missing required fields: mintAddress or recipientPublicKey"
    );
  }
  // Basic validation for recipient public key format (example)
  if (
    typeof recipientPublicKey !== "string" ||
    recipientPublicKey.length < 32 ||
    recipientPublicKey.length > 44
  ) {
    return sendErrorResponse(res, 400, "Invalid recipient public key format.");
  }

  try {
    // --- Perform On-Chain Transfer ---
    const senderKeypair = loadKeypair(); // Assuming this loads the app's main wallet keypair
    console.log(
      `[transferNFT] Attempting transfer of ${mintAddress} to ${recipientPublicKey}`
    );

    const transferServiceResponse = await solanaService.transferNFT(
      mintAddress,
      senderKeypair,
      recipientPublicKey
    );

    console.log(
      `[transferNFT] On-chain transfer successful for ${mintAddress}. Response: ${transferServiceResponse}`
    );

    // --- Update Database Record ---
    const updatedNft = await NFT.findOneAndUpdate(
      { mintAddress: mintAddress },
      { $set: { recipientPublicKey: recipientPublicKey } },
      { new: true } // Return the updated document
    );

    if (!updatedNft) {
      // This case is unlikely if the transfer succeeded, but handle defensively
      console.warn(
        `[transferNFT] NFT with mint address ${mintAddress} not found in DB after successful on-chain transfer.`
      );
      // Decide if this should be an error or just a warning.
      // Returning success as the main action (on-chain transfer) succeeded.
    } else {
      console.log(
        `[transferNFT] Database record updated for ${mintAddress}. New owner: ${recipientPublicKey}`
      );
    }

    // --- Send Success Response ---
    return res.status(200).json({
      success: true,
      message:
        transferServiceResponse ||
        "NFT transferred successfully and database updated.", // Use service message or default
      data: {
        updatedNft: updatedNft, // Optionally return updated DB record
      },
    });
  } catch (error) {
    // --- Error Handling ---
    if (error.message.includes("Failed to find token account")) {
      return sendErrorResponse(
        res,
        404,
        "NFT or associated token account not found on-chain.",
        error
      );
    }
    if (error.message.includes("owner does not match")) {
      return sendErrorResponse(
        res,
        403,
        "Transfer failed: Sender does not own the NFT.",
        error
      );
    }
    // Handle other potential errors from solanaService or DB update
    return sendErrorResponse(
      res,
      500,
      "NFT transfer failed due to an unexpected error.",
      error
    );
  }
};

exports.uploadImage = async (req, res) => {
  try {
    // Use multer middleware for upload and basic validation
    upload(req, res, async (err) => {
      // Handle Multer errors (file size, file type)
      if (err) {
        if (err instanceof multer.MulterError) {
          // Specific multer errors
          if (err.code === "LIMIT_FILE_SIZE") {
            return sendErrorResponse(
              res,
              400,
              "File too large. Maximum size is 5MB."
            );
          }
          return sendErrorResponse(
            res,
            400,
            `File upload error: ${err.message}`
          );
        }
        // Handle file filter errors (invalid type)
        if (err.message.includes("Invalid file type")) {
          return sendErrorResponse(res, 400, err.message);
        }
        // Other unexpected errors during upload setup
        return sendErrorResponse(
          res,
          500,
          "An unexpected error occurred during file processing.",
          err
        );
      }

      // File should be present after successful multer processing
      if (!req.file) {
        console.error(
          "[uploadImage] Multer processed successfully but req.file is missing."
        );
        return sendErrorResponse(
          res,
          500,
          "File processing failed unexpectedly."
        );
      }

      const tempFilePath = req.file.path;

      // Validate wallet address
      const wallet = req.body.wallet;
      if (!wallet) {
        await fs
          .unlink(tempFilePath)
          .catch((unlinkErr) =>
            console.error(
              "Failed to delete temp file after missing wallet:",
              unlinkErr
            )
          );
        return sendErrorResponse(res, 400, "Wallet address is required.");
      }

      // --- Upload to Cloudinary ---
      try {
        console.log(`[uploadImage] Attempting upload for wallet: ${wallet}`);
        const result = await cloudinary.uploader.upload(
          tempFilePath,
          getCloudinaryOptions(wallet)
        );

        // Validate Cloudinary response
        if (!result?.secure_url?.includes("cloudinary.com")) {
          // This case should ideally not happen if upload doesn't throw, but good practice
          console.error(
            "[uploadImage] Invalid Cloudinary response structure:",
            result
          );
          throw new Error(
            "Received an invalid response structure from Cloudinary."
          );
        }

        console.log(
          `[uploadImage] Successfully uploaded to Cloudinary for wallet ${wallet}: ${result.public_id}`
        );

        // Send success response
        return res.status(200).json({
          success: true,
          message: "File uploaded successfully to Cloudinary",
          imageUrl: result.secure_url,
          file: {
            filename: result.public_id,
            mimetype: req.file.mimetype,
            size: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
          },
        });
      } catch (cloudinaryError) {
        // Handle Cloudinary API errors
        return sendErrorResponse(
          res,
          cloudinaryError.http_code || 500,
          "Failed to upload image to Cloudinary.",
          cloudinaryError
        );
      } finally {
        // --- Cleanup Temporary File ---
        // Always attempt to delete the temp file
        await fs
          .unlink(tempFilePath)
          .catch((unlinkErr) =>
            console.error(
              `Failed to delete temp file ${tempFilePath}:`,
              unlinkErr
            )
          );
      }
    });
  } catch (error) {
    // Catch errors that occur *before* multer middleware runs
    return sendErrorResponse(
      res,
      500,
      "Failed to initiate image upload process.",
      error
    );
  }
};

exports.refreshMetadata = async (req, res) => {
  const { mintAddress } = req.params;

  if (!mintAddress) {
    return res.status(400).json({
      success: false,
      message: "Mint address is required",
    });
  }

  try {
    // Find the NFT in our database
    const nft = await NFT.findOne({ mintAddress });
    if (!nft) {
      return res.status(404).json({
        success: false,
        message: "NFT not found",
      });
    }

    // Fetch latest metadata from Solana
    const updatedMetadata = await solanaService.getNFTMetadata(mintAddress);

    // Update the NFT in our database with new metadata
    nft.name = updatedMetadata.name;
    nft.symbol = updatedMetadata.symbol;
    nft.uri = updatedMetadata.uri;
    await nft.save();

    return res.status(200).json({
      success: true,
      message: "NFT metadata refreshed successfully",
      data: nft,
    });
  } catch (error) {
    console.error("Metadata Refresh Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh NFT metadata",
      error: error.message,
    });
  }
};

exports.migrateLocalImages = async (req, res) => {
  try {
    console.log("Starting migration process...");

    // Find all NFTs with localhost or 127.0.0.1 in their URIs
    const nfts = await NFT.find({
      uri: {
        $regex: /(localhost|127\.0\.0\.1)/i,
      },
    });

    console.log(`Found ${nfts.length} NFTs with localhost URLs`);
    if (nfts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No NFTs found with localhost URLs",
        migratedCount: 0,
      });
    }

    const migratedNFTs = [];

    for (const nft of nfts) {
      try {
        console.log(`Processing NFT ${nft.mintAddress}`);
        console.log(`Original URI: ${nft.uri}`);

        // Create a placeholder image
        const placeholderUrl = `https://placehold.co/400x400?text=NFT+${nft.mintAddress}`;

        // Update NFT with placeholder URL
        const oldUri = nft.uri;
        nft.uri = placeholderUrl;
        await nft.save();

        migratedNFTs.push({
          mintAddress: nft.mintAddress,
          oldUri: oldUri,
          newUri: placeholderUrl,
        });

        console.log(
          `Successfully migrated NFT ${nft.mintAddress} from ${oldUri} to ${placeholderUrl}`
        );
      } catch (error) {
        console.error(`Failed to migrate NFT ${nft.mintAddress}:`, error);
        // Continue with next NFT if one fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "NFT images migrated to placeholders",
      migratedCount: migratedNFTs.length,
      migratedNFTs,
    });
  } catch (error) {
    console.error("Migration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to migrate NFT images",
      error: error.message,
    });
  }
};

exports.deleteNFT = async (req, res) => {
  const { mintAddress } = req.params;

  if (!mintAddress) {
    return res.status(400).json({
      success: false,
      message: "Mint address is required",
    });
  }

  try {
    // Find and delete the NFT from our database
    const nft = await NFT.findOneAndDelete({ mintAddress });

    if (!nft) {
      return res.status(404).json({
        success: false,
        message: "NFT not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "NFT deleted successfully",
      data: nft,
    });
  } catch (error) {
    console.error("NFT Deletion Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete NFT",
      error: error.message,
    });
  }
};
