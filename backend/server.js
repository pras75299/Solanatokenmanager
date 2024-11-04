const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const solanaService = require("./services/solanaService");
const { mintNFT } = require("./services/solanaService");
const { payerKeypair } = require("./services/metaplex");
const { Keypair } = require("@solana/web3.js");
const { PublicKey } = require("@solana/web3.js");
const loadKeypair = require("./importKey");
const NFT = require("./models/NFT");

dotenv.config();

const app = express();
app.use(express.json()); // To parse JSON requests
app.use(cors()); // Enable CORS

// Root endpoint
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// Mint a new token
app.post("/api/mint-token", async (req, res) => {
  const { recipientPublicKey, tokenStandard } = req.body;

  try {
    // Convert recipientPublicKey to PublicKey here and validate
    const recipientKey = new PublicKey(recipientPublicKey);
    console.log("Parsed PublicKey in API:", recipientKey.toString());

    // Call the mint function based on the selected token standard
    let result;
    if (tokenStandard === "Token-2022") {
      result = await solanaService.mintToken2022(recipientPublicKey);
    } else {
      result = await solanaService.mintToken(recipientPublicKey);
    }

    res.status(200).json({ message: result });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Token minting failed", error: error.message });
  }
});

// Transfer tokens from one wallet to another
app.post("/api/transfer-tokens", async (req, res) => {
  const { mintAddress, toWallet, amount, tokenStandard } = req.body;

  try {
    // Securely load the sender's Keypair on the backend
    const fromWallet = loadKeypair();

    // Validate recipient public key and other parameters
    if (!mintAddress || !toWallet || !amount) {
      return res
        .status(400)
        .json({ message: "Invalid request body parameters" });
    }

    // Call the transferTokens function with the securely loaded Keypair
    const transferResponse = await solanaService.transferTokens(
      mintAddress,
      fromWallet,
      toWallet,
      amount,
      tokenStandard
    );

    res.status(200).json({ message: transferResponse });
  } catch (error) {
    console.error("Transfer Error:", error.message);
    res
      .status(500)
      .json({ message: "Token transfer failed", error: error.message });
  }
});

// Check SOL balance of a public key
app.get("/api/balance/:publicKey", async (req, res) => {
  const { publicKey } = req.params;
  try {
    const balance = await solanaService.getBalance(publicKey);
    res.status(200).json({ balance });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch balance", error: error.message });
  }
});

// Airdrop SOL to a public key
app.post("/api/airdrop/:publicKey", async (req, res) => {
  const { publicKey } = req.params;
  try {
    const message = await solanaService.airdropSol(publicKey);
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ message: "Airdrop failed", error: error.message });
  }
});

// mintNFT
app.post("/api/mint-nft", async (req, res) => {
  const { recipientPublicKey, metadata } = req.body;

  try {
    // Call the mintNFT function from solanaService
    const result = await solanaService.mintNFT(recipientPublicKey, metadata);

    // Extract mint address from the result
    const mintAddress = result.match(/Mint Address: (.*)$/)[1];

    // Save the minted NFT info to the database
    const newNFT = new NFT({
      recipientPublicKey,
      mintAddress,
      uri: metadata.uri,
      name: metadata.name,
      symbol: metadata.symbol,
    });

    await newNFT.save();
    res.status(200).json({ message: result });
  } catch (error) {
    console.error("Error minting NFT:", error.message);
    res
      .status(500)
      .json({ message: "NFT minting failed", error: error.message });
  }
});

app.get("/api/minted-nfts", async (req, res) => {
  try {
    const nfts = await NFT.find();
    res.status(200).json(nfts);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch minted NFTs", error: error.message });
  }
});

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
