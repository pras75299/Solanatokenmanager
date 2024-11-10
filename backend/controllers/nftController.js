const solanaService = require("../services/solanaService");
const NFT = require("../models/NFT");
const loadKeypair = require("../importKey");

exports.mintNFT = async (req, res) => {
  const { recipientPublicKey, metadata } = req.body;

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
