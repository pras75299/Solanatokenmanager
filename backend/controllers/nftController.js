const solanaService = require("../services/solanaService");
const NFT = require("../models/NFT");
const loadKeypair = require("../importKey");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: "./uploads/",
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
}).single("file"); // 'file' is the field name

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
      uri: metadata.uri,
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
    // Create uploads directory if it doesn't exist
    await fs.mkdir("./uploads", { recursive: true });

    // Handle the upload using multer
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred during upload
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message,
        });
      } else if (err) {
        // An unknown error occurred
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
        // Delete the uploaded file if wallet validation fails
        await fs.unlink(req.file.path);
        return res.status(400).json({
          success: false,
          message: "Wallet address is required",
        });
      }

      // Generate the URL for the uploaded file
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        imageUrl: imageUrl,
        file: {
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
      });
    });
  } catch (error) {
    console.error("Image Upload Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
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
