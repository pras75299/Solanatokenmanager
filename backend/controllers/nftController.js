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

  console.log("[mintNFT] Starting NFT minting process for:", {
    recipientPublicKey,
    metadataName: metadata.name,
    metadataSymbol: metadata.symbol,
    metadataUri: metadata.uri,
  });

  try {
    let finalImageUri = metadata.uri;

    // --- Upload Image to Cloudinary if necessary ---
    if (!finalImageUri.includes("cloudinary.com")) {
      console.log("[mintNFT] Image not on Cloudinary, attempting upload...");
      try {
        let uploadResult;
        if (finalImageUri.startsWith("data:image")) {
          // Handle Base64
          console.log("[mintNFT] Processing base64 image...");
          const base64Data = finalImageUri.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const tempPath = `./tmp/uploads/${Date.now()}-image.png`;
          await fs.mkdir("./tmp/uploads", { recursive: true });
          await fs.writeFile(tempPath, buffer);
          uploadResult = await cloudinary.uploader.upload(
            tempPath,
            getCloudinaryOptions(recipientPublicKey)
          );
          await fs
            .unlink(tempPath)
            .catch((err) =>
              console.error("[mintNFT] Failed to delete temp base64 file:", err)
            );
        } else {
          // Handle URL
          console.log("[mintNFT] Processing image URL...");
          uploadResult = await cloudinary.uploader.upload(
            finalImageUri,
            getCloudinaryOptions(recipientPublicKey)
          );
        }

        if (!uploadResult?.secure_url?.includes("cloudinary.com")) {
          console.error(
            "[mintNFT] Invalid Cloudinary upload result:",
            uploadResult
          );
          throw new Error("Invalid Cloudinary response after upload attempt");
        }
        finalImageUri = uploadResult.secure_url;
        console.log(
          "[mintNFT] Successfully uploaded image to Cloudinary:",
          finalImageUri
        );
      } catch (uploadError) {
        console.error("[mintNFT] Image upload error:", uploadError);
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
      uri: finalImageUri,
      image: finalImageUri,
      properties: {
        ...(metadata.properties || {}),
        files: metadata.properties?.files?.map((file) => ({
          ...file,
          uri: finalImageUri,
        })) || [{ uri: finalImageUri, type: "image/webp" }],
      },
    };

    console.log("[mintNFT] Prepared final metadata:", {
      name: finalMetadata.name,
      symbol: finalMetadata.symbol,
      uri: finalMetadata.uri,
    });

    // --- Mint NFT via Solana Service ---
    console.log("[mintNFT] Calling Solana service to mint NFT...");
    const mintServiceResult = await solanaService.mintNFT(
      recipientPublicKey,
      finalMetadata
    );
    console.log("[mintNFT] Solana service response:", mintServiceResult);

    // Safer regex pattern with error handling
    const mintAddressMatch = mintServiceResult.match(/Mint Address: ([\w\d]+)/);
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
    console.log("[mintNFT] Saving NFT to database...");
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
      message: mintServiceResult,
      data: {
        mintAddress,
        nft: newNFT,
      },
    });
  } catch (error) {
    // --- Error Handling ---
    console.error("[mintNFT] Error details:", {
      error: error.message,
      stack: error.stack,
      recipientPublicKey,
      metadataName: metadata?.name,
      metadataSymbol: metadata?.symbol,
    });

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
      `Failed to mint NFT: ${error.message}`,
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

  if (!publicKey) {
    return sendErrorResponse(res, 400, "Wallet public key is required");
  }

  console.log(`[fetchNFTs] Fetching NFTs for wallet: ${publicKey}`);

  try {
    // First, get NFTs from our database where this wallet is the recipient
    const dbNFTs = await NFT.find({ recipientPublicKey: publicKey });
    console.log(
      `[fetchNFTs] Found ${dbNFTs.length} NFTs in database for ${publicKey}`
    );

    // Verify on-chain ownership for each NFT
    const verifiedNFTs = [];
    for (const nft of dbNFTs) {
      try {
        console.log(`[fetchNFTs] Verifying NFT ${nft.mintAddress}`);
        // Get on-chain metadata and ownership info
        const onChainData = await solanaService.getNFTMetadata(nft.mintAddress);

        // If the NFT exists on-chain and ownership matches
        if (onChainData && onChainData.owner === publicKey) {
          // Merge database and on-chain data
          verifiedNFTs.push({
            ...nft.toObject(),
            verified: true,
            onChainOwner: onChainData.owner,
          });
          console.log(
            `[fetchNFTs] Verified NFT ${nft.mintAddress} ownership matches`
          );
        } else {
          console.log(
            `[fetchNFTs] NFT ${nft.mintAddress} ownership mismatch or not found on-chain. DB owner: ${nft.recipientPublicKey}, Chain owner: ${onChainData?.owner}`
          );
        }
      } catch (error) {
        console.error(
          `[fetchNFTs] Error verifying NFT ${nft.mintAddress}:`,
          error
        );
        // Include the NFT but mark it as unverified
        verifiedNFTs.push({
          ...nft.toObject(),
          verified: false,
          verificationError: error.message,
        });
      }
    }

    // Also check for any NFTs owned by this wallet on-chain that might not be in our DB
    try {
      console.log(`[fetchNFTs] Checking on-chain NFTs for ${publicKey}`);
      const onChainNFTs = await solanaService.getWalletNFTs(publicKey);
      console.log(
        `[fetchNFTs] Found ${onChainNFTs.length} NFTs on-chain for ${publicKey}`
      );

      for (const onChainNFT of onChainNFTs) {
        // Check if this NFT is already in our verified list
        const exists = verifiedNFTs.some(
          (nft) => nft.mintAddress === onChainNFT.mintAddress
        );

        if (!exists) {
          console.log(
            `[fetchNFTs] Found new on-chain NFT: ${onChainNFT.mintAddress}`
          );
          // Add this NFT to our database
          const newNFT = new NFT({
            mintAddress: onChainNFT.mintAddress,
            recipientPublicKey: publicKey,
            name: onChainNFT.name || "Unknown NFT",
            symbol: onChainNFT.symbol || "NFT",
            uri: onChainNFT.uri || "",
          });

          try {
            await newNFT.save();
            verifiedNFTs.push({
              ...newNFT.toObject(),
              verified: true,
              onChainOwner: publicKey,
              newlyDiscovered: true,
            });
            console.log(
              `[fetchNFTs] Saved new NFT to database: ${onChainNFT.mintAddress}`
            );
          } catch (saveError) {
            console.error(
              `[fetchNFTs] Error saving new NFT ${onChainNFT.mintAddress}:`,
              saveError
            );
          }
        }
      }
    } catch (onChainError) {
      console.error("[fetchNFTs] Error fetching on-chain NFTs:", onChainError);
    }

    console.log(
      `[fetchNFTs] Returning ${verifiedNFTs.length} verified NFTs for ${publicKey}`
    );
    return res.status(200).json({
      success: true,
      data: verifiedNFTs,
      message: `Found ${verifiedNFTs.length} NFTs for wallet ${publicKey}`,
    });
  } catch (error) {
    console.error("[fetchNFTs] Fatal error:", error);
    return sendErrorResponse(res, 500, "Failed to fetch NFTs", error);
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

// Add helper function to sync NFT ownership with blockchain
exports.syncNFTOwnership = async (mintAddress) => {
  try {
    const nft = await NFT.findOne({ mintAddress });
    if (!nft) {
      console.warn(`NFT ${mintAddress} not found in database for sync`);
      return null;
    }

    // Get on-chain owner
    const onChainData = await solanaService.getNFTMetadata(mintAddress);
    if (!onChainData || !onChainData.owner) {
      console.warn(`Could not fetch on-chain data for NFT ${mintAddress}`);
      return null;
    }

    // Update database if ownership has changed
    if (nft.recipientPublicKey !== onChainData.owner) {
      const updatedNFT = await NFT.findOneAndUpdate(
        { mintAddress },
        {
          recipientPublicKey: onChainData.owner,
          lastSyncedAt: new Date(),
        },
        { new: true }
      );
      console.log(
        `Updated ownership for NFT ${mintAddress} to ${onChainData.owner}`
      );
      return updatedNFT;
    }

    return nft;
  } catch (error) {
    console.error(`Error syncing NFT ${mintAddress}:`, error);
    return null;
  }
};
