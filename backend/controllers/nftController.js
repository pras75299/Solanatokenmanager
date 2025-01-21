const solanaService = require("../services/solanaService");
const NFT = require("../models/NFT");
const loadKeypair = require("../importKey");

exports.mintNFT = async (req, res) => {
  const { recipientPublicKey, metadata } = req.body;

  const solanaService = require("../services/solanaService");
  const NFT = require("../models/NFT");
  const loadKeypair = require("../importKey");

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

  try {
    const result = await solanaService.mintNFT(recipientPublicKey, metadata);
    const mintAddress = result.match(/Mint Address: (.*)$/)[1];

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
    res
      .status(500)
      .json({ message: "NFT minting failed", error: error.message });
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
