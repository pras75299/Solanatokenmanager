const solanaService = require("../services/solanaService");
const NFT = require("../models/NFT");
const loadKeypair = require("../importKey");
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
}).single("file");

exports.mintNFT = async (req, res) => {
  const { recipientPublicKey, metadata } = req.body;

  // Input validation
  if (!recipientPublicKey || !metadata) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: recipientPublicKey or metadata",
    });
  }

  if (!metadata.uri || !metadata.name || !metadata.symbol) {
    return res.status(400).json({
      success: false,
      message: "Missing required metadata fields: uri, name, or symbol",
    });
  }

  try {
    // Removed validateCloudinaryConfig(); - Server startup handles this

    // Ensure image URL is from Cloudinary
    let imageUri = metadata.uri;
    if (!imageUri.includes("cloudinary.com")) {
      try {
        let uploadResult;

        // For base64 images
        if (imageUri.startsWith("data:image")) {
          const base64Data = imageUri.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const tempPath = `./tmp/uploads/${Date.now()}-image.png`;

          // Save base64 to temporary file
          await fs.mkdir("./tmp/uploads", { recursive: true });
          await fs.writeFile(tempPath, buffer);

          // Upload to Cloudinary
          uploadResult = await cloudinary.uploader.upload(
            tempPath,
            getCloudinaryOptions(recipientPublicKey)
          );

          // Clean up temp file
          await fs.unlink(tempPath).catch(console.error);
        }
        // For URLs (including localhost)
        else {
          uploadResult = await cloudinary.uploader.upload(
            imageUri,
            getCloudinaryOptions(recipientPublicKey)
          );
        }

        // Validate Cloudinary response
        if (!uploadResult?.secure_url?.includes("cloudinary.com")) {
          throw new Error(
            "Invalid Cloudinary response: Missing or invalid secure_url"
          );
        }

        imageUri = uploadResult.secure_url;

        // Update metadata with Cloudinary URL
        metadata.uri = imageUri;
        metadata.image = imageUri;

        // Update properties.files array if it exists
        if (metadata.properties?.files?.length > 0) {
          metadata.properties.files = metadata.properties.files.map((file) => ({
            ...file,
            uri: imageUri,
          }));
        }
      } catch (uploadError) {
        console.error("Image Upload Error:", uploadError);
        return res.status(400).json({
          success: false,
          message:
            "Failed to process image. Please ensure the image is accessible and in a supported format.",
          error: uploadError.message,
        });
      }
    }

    const result = await solanaService.mintNFT(recipientPublicKey, metadata);

    // Safer regex pattern with error handling
    const mintAddressMatch = result.match(/Mint Address: (.+)(?:\r?\n|$)/);
    if (!mintAddressMatch) {
      throw new Error("Could not extract mint address from result");
    }
    const mintAddress = mintAddressMatch[1];

    const newNFT = new NFT({
      recipientPublicKey,
      mintAddress,
      uri: imageUri,
      name: metadata.name,
      symbol: metadata.symbol,
    });

    await newNFT.save();

    return res.status(200).json({
      success: true,
      message: result,
      data: {
        mintAddress,
        nft: newNFT,
      },
    });
  } catch (error) {
    // Add specific check for Cloudinary config errors potentially missed at startup
    if (
      error.message.includes("Missing Cloudinary configuration") ||
      error.message.includes(
        "Cloudinary configuration is not properly initialized"
      )
    ) {
      console.error("NFT Minting Error due to Cloudinary Config:", error);
      return res.status(500).json({
        success: false,
        message:
          "Cloudinary service is not configured correctly. Please check server logs.",
        error: error.message,
      });
    }
    console.error("NFT Minting Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mint NFT",
      error: error.message,
    });
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

  try {
    const senderKeypair = loadKeypair();
    const transferResponse = await solanaService.transferNFT(
      mintAddress,
      senderKeypair,
      recipientPublicKey
    );

    res.status(200).json({ message: transferResponse });
  } catch (error) {
    res
      .status(500)
      .json({ message: "NFT transfer failed", error: error.message });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    // Log environment variables and config state at the start of the request
    console.log("[uploadImage] Checking Cloudinary Env Vars:", {
      CLOUD_NAME_ENV: process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Not Set",
      API_KEY_ENV: process.env.CLOUDINARY_API_KEY ? "Set" : "Not Set",
      API_SECRET_ENV: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not Set",
    });
    console.log("[uploadImage] Checking Cloudinary Config Object:", {
      cloud_name_config: cloudinary.config().cloud_name || "Not Set",
      api_key_config: cloudinary.config().api_key ? "Set" : "Not Set",
      api_secret_config: cloudinary.config().api_secret ? "Set" : "Not Set",
    });

    // Create temporary uploads directory if it doesn't exist
    await fs.mkdir("./tmp/uploads", { recursive: true });

    // Handle the upload using multer
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message,
        });
      } else if (err) {
        return res.status(500).json({
          success: false,
          message: "Error uploading file",
          error: err.message,
        });
      }

      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Validate wallet address
      const wallet = req.body.wallet;
      if (!wallet) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({
          success: false,
          message: "Wallet address is required",
        });
      }

      try {
        // Removed the explicit config check here - rely on server startup validation
        // if (
        //   !cloudinary.config().cloud_name ||
        //   !cloudinary.config().api_key ||
        //   !cloudinary.config().api_secret
        // ) {
        //   throw new Error(
        //     "Cloudinary configuration is not properly initialized"
        //   );
        // }

        // Log right before upload attempt
        console.log(`[uploadImage] Attempting upload for wallet: ${wallet}`);

        // Upload to Cloudinary with standardized options
        const result = await cloudinary.uploader.upload(
          req.file.path,
          getCloudinaryOptions(wallet)
        );

        // Clean up temporary file
        await fs.unlink(req.file.path).catch(console.error);

        // Validate Cloudinary response
        if (!result?.secure_url?.includes("cloudinary.com")) {
          throw new Error(
            "Invalid Cloudinary response: Missing or invalid secure_url"
          );
        }

        console.log("Successfully uploaded to Cloudinary:", {
          public_id: result.public_id,
          format: result.format,
          size: result.bytes,
        });

        // Return success with Cloudinary URL
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
        // Log the specific error encountered during upload
        console.error(
          `[uploadImage] Cloudinary uploader.upload Error for wallet ${wallet}:`,
          {
            message: cloudinaryError.message,
            code: cloudinaryError.http_code,
            name: cloudinaryError.name, // e.g., 'Error', 'AuthorizationRequired'
          }
        );

        // Clean up temporary file if it exists
        if (req.file?.path) {
          await fs.unlink(req.file.path).catch(console.error);
        }

        // Return a more specific error if it seems config-related
        if (
          !cloudinary.config().cloud_name ||
          !cloudinary.config().api_key ||
          !cloudinary.config().api_secret
        ) {
          console.error(
            "[uploadImage] Detected config issue during error handling."
          );
          return res.status(500).json({
            success: false,
            message: "Cloudinary configuration error detected during upload.",
            error: "Configuration seems invalid or missing.",
          });
        }

        // Generic Cloudinary upload failure
        return res.status(500).json({
          success: false,
          message: "Failed to upload to Cloudinary",
          error: cloudinaryError.message || "Unknown Cloudinary error",
          details: {
            code: cloudinaryError.http_code,
            type: cloudinaryError.name,
          },
        });
      }
    });
  } catch (error) {
    // General error before or during multer processing
    console.error("[uploadImage] General Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process image upload",
      error: error.message,
    });
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
