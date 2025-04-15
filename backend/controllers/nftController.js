const solanaService = require("../services/solanaService");
const NFT = require("../models/NFT");
const loadKeypair = require("../importKey");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;
const dotenv = require("dotenv");
const {
  Connection,
  Transaction,
  sendAndConfirmRawTransaction,
  clusterApiUrl,
} = require("@solana/web3.js");

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
  // Log the full error object for better debugging, especially for 500 errors
  console.error(
    `Error ${statusCode}: ${message}`,
    error
      ? error.stack
        ? `\\nStack: ${error.stack}`
        : `\\nDetails: ${JSON.stringify(error)}`
      : "" // Log stack or details
  );
  return res.status(statusCode).json({
    success: false,
    message: message,
    // Provide the error message, or the string representation if it's not an Error object
    error: error ? error.message || String(error) : undefined,
  });
};

// Helper: Get Solana Connection
let connection;
const getSolanaConnection = () => {
  if (!connection) {
    const network = process.env.SOLANA_NETWORK || "devnet";
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(network);
    connection = new Connection(rpcUrl, "confirmed");
    console.log(
      `[Solana Connection] Initialized for network: ${network} at ${rpcUrl}`
    );
  }
  return connection;
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

  let finalImageUri = metadata.uri; // Define here to be accessible in the final catch

  try {
    // --- Upload Image to Cloudinary if necessary ---
    if (!finalImageUri.includes("cloudinary.com")) {
      try {
        let uploadResult;
        if (finalImageUri.startsWith("data:image")) {
          // Handle Base64
          const base64Data = finalImageUri.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          // Ensure tmp directory exists
          await fs.mkdir("./tmp/uploads", { recursive: true });
          const tempPath = `./tmp/uploads/${Date.now()}-image.png`; // Define path after directory creation
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
          console.error(
            "[mintNFT] Invalid Cloudinary response structure:",
            uploadResult
          );
          throw new Error("Invalid Cloudinary response after upload attempt");
        }
        finalImageUri = uploadResult.secure_url;
        console.log(
          `[mintNFT] Image processed/uploaded, final URI: ${finalImageUri}`
        );
      } catch (uploadError) {
        console.error(
          "[mintNFT] Error during image upload/processing:",
          uploadError
        );
        return sendErrorResponse(
          res,
          500, // Changed to 500 as it's an internal server issue potentially
          "Failed to process or upload image.",
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
    console.log(
      "[mintNFT] Final metadata prepared:",
      finalMetadata.name,
      finalMetadata.symbol
    );

    // --- Mint NFT via Solana Service (Specific Try-Catch) ---
    let mintServiceResult;
    let mintAddress;
    try {
      console.log(
        "[mintNFT] Calling solanaService.mintNFT for:",
        recipientPublicKey
      );
      mintServiceResult = await solanaService.mintNFT(
        recipientPublicKey,
        finalMetadata
      );
      console.log("[mintNFT] Solana service result:", mintServiceResult);

      // Safer regex pattern with error handling
      const mintAddressMatch = mintServiceResult.match(
        /Mint Address: ([\w\d]+)/
      ); // More specific regex
      if (!mintAddressMatch?.[1]) {
        console.error(
          "[mintNFT] Could not extract mint address from service result:",
          mintServiceResult
        );
        // Throw specific error to be caught by the outer catch block
        throw new Error("Failed to extract mint address after minting.");
      }
      mintAddress = mintAddressMatch[1];
      console.log(`[mintNFT] Extracted Mint Address: ${mintAddress}`);
    } catch (solanaError) {
      console.error(
        "[mintNFT] Error during Solana minting call or address extraction:",
        solanaError
      );
      // Check if it's the specific extraction error we threw
      if (solanaError.message.includes("extract mint address")) {
        return sendErrorResponse(
          res,
          500,
          "Failed to confirm minting result from Solana service.",
          solanaError
        );
      }
      // Otherwise, assume it's an error from the service itself
      return sendErrorResponse(
        res,
        500,
        "Error occurred during the Solana NFT minting process.",
        solanaError
      );
    }

    // --- Save NFT to Database (Specific Try-Catch) ---
    let newNFT;
    try {
      newNFT = new NFT({
        recipientPublicKey,
        mintAddress,
        uri: finalImageUri,
        name: finalMetadata.name,
        symbol: finalMetadata.symbol,
      });
      await newNFT.save();
      console.log(`[mintNFT] NFT saved to database: ${mintAddress}`);
    } catch (dbError) {
      console.error(
        `[mintNFT] Error saving NFT ${mintAddress} to database:`,
        dbError
      );
      // Important: Consider how to handle this. The NFT is minted on-chain but not saved.
      // Options:
      // 1. Log the error and maybe return a partial success or specific error message.
      // 2. Try to delete/burn the minted NFT (complex).
      // For now, returning a specific error is safest.
      return sendErrorResponse(
        res,
        500,
        `NFT minted (${mintAddress}) but failed to save to database. Please contact support.`,
        dbError
      );
    }

    // --- Send Success Response ---
    return res.status(200).json({
      success: true,
      message: mintServiceResult, // Original message from service
      data: {
        mintAddress,
        nft: newNFT, // Send the saved NFT data
      },
    });
  } catch (error) {
    // --- Outer Catch-All (for truly unexpected errors) ---
    // This catches errors not specifically handled above (e.g., in metadata prep)
    console.error(
      "[mintNFT] General unexpected error in mintNFT handler:",
      error
    );
    return sendErrorResponse(
      res,
      500,
      "An unexpected error occurred during the minting process.",
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
  const { serializedTransaction } = req.body;

  // Basic Validation
  if (!serializedTransaction) {
    console.error("[transferNFT] Missing serialized transaction data");
    return sendErrorResponse(res, 400, "Missing serialized transaction data.");
  }

  let transaction;
  try {
    // Deserialize Transaction with detailed logging
    console.log("[transferNFT] Attempting to deserialize transaction...");
    const transactionBuffer = Buffer.from(serializedTransaction, "base64");
    transaction = Transaction.from(transactionBuffer);

    // Log transaction details for debugging
    console.log("[transferNFT] Transaction details:", {
      numInstructions: transaction.instructions.length,
      signers: transaction.signatures.map((s) => s.publicKey.toBase58()),
      recentBlockhash: transaction.recentBlockhash,
      feePayer: transaction.feePayer?.toBase58(),
    });

    // Basic Sanity Checks with detailed errors
    if (!transaction.signatures || transaction.signatures.length === 0) {
      throw new Error("Transaction is missing signatures");
    }
    if (!transaction.feePayer) {
      throw new Error("Transaction is missing fee payer");
    }
    if (!transaction.recentBlockhash) {
      throw new Error("Transaction is missing recent blockhash");
    }
    if (transaction.instructions.length === 0) {
      throw new Error("Transaction has no instructions");
    }

    console.log(
      `[transferNFT] Transaction validation passed. Signed by: ${transaction.signatures[0].publicKey.toString()}`
    );
  } catch (error) {
    console.error(
      "[transferNFT] Transaction deserialization/validation error:",
      {
        error: error.message,
        stack: error.stack,
        serializedLength: serializedTransaction?.length,
      }
    );
    return sendErrorResponse(
      res,
      400,
      `Invalid transaction data: ${error.message}`,
      error
    );
  }

  // Send and Confirm Transaction
  try {
    const connection = getSolanaConnection();
    console.log(
      "[transferNFT] Connected to Solana network, preparing to send transaction..."
    );

    // Log connection details
    const rpcEndpoint = connection.rpcEndpoint;
    console.log(`[transferNFT] Using RPC endpoint: ${rpcEndpoint}`);

    // Send transaction without simulation
    console.log("[transferNFT] Sending transaction...");
    const rawTransaction = transaction.serialize();

    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 3,
      preflightCommitment: "processed",
    });

    console.log(`[transferNFT] Transaction sent. Signature: ${signature}`);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
      },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    console.log(`[transferNFT] Transaction confirmed successfully`);

    return res.status(200).json({
      success: true,
      message: "Transaction successfully relayed and confirmed.",
      signature: signature,
      confirmationDetails: confirmation.value,
    });
  } catch (error) {
    console.error("[transferNFT] Transaction sending/confirmation error:", {
      error: error.message,
      stack: error.stack,
      errorLogs: error.logs || "No logs available",
    });

    // Provide more specific error messages based on common failure cases
    let errorMessage = "Failed to relay transaction to Solana network.";
    if (error.message.includes("blockhash")) {
      errorMessage = "Transaction blockhash expired. Please try again.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for transaction.";
    } else if (error.message.includes("invalid account owner")) {
      errorMessage = "Invalid token account ownership.";
    }

    return sendErrorResponse(res, 500, errorMessage, {
      originalError: error.message,
      logs: error.logs || [],
      details: error.details || "No additional details",
    });
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
