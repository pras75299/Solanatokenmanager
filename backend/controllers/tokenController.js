const solanaService = require("../services/solanaService");
const { PublicKey } = require("@solana/web3.js");
const loadKeypair = require("../importKey");

exports.mintToken = async (req, res) => {
  const { recipientPublicKey, tokenStandard } = req.body;
  try {
    const recipientKey = new PublicKey(recipientPublicKey);
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
};

// Controller for transferring tokens
exports.transferTokens = async (req, res) => {
  const { mintAddress, toWallet, amount, tokenStandard } = req.body;
  try {
    const fromWallet = loadKeypair();
    const transferResponse = await solanaService.transferTokens(
      mintAddress,
      fromWallet,
      toWallet,
      amount,
      tokenStandard
    );
    res.status(200).json({ message: transferResponse });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Token transfer failed", error: error.message });
  }
};

// Controller for checking balance
exports.getBalance = async (req, res) => {
  const { publicKey } = req.params;
  try {
    const balance = await solanaService.getBalance(publicKey);
    res.status(200).json({ balance });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch balance", error: error.message });
  }
};

// Controller for burning tokens
exports.burnToken = async (req, res) => {
  const { mintAddress, amount } = req.body;
  try {
    const ownerWallet = loadKeypair();
    const burnResponse = await solanaService.burnToken(
      mintAddress,
      ownerWallet,
      amount
    );
    res.status(200).json({ message: burnResponse });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Token burn failed", error: error.message });
  }
};

// Controller for delegating tokens
exports.delegateToken = async (req, res) => {
  const { mintAddress, delegatePublicKey, amount } = req.body;
  try {
    const ownerWallet = loadKeypair();
    const delegateResponse = await solanaService.delegateToken(
      mintAddress,
      ownerWallet,
      delegatePublicKey,
      amount
    );
    res.status(200).json({ message: delegateResponse });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Token delegation failed", error: error.message });
  }
};

// Controller for closing token account
exports.closeTokenAccount = async (req, res) => {
  const { mintAddress } = req.body;
  try {
    const ownerWallet = loadKeypair();
    const closeResponse = await solanaService.closeTokenAccount(
      mintAddress,
      ownerWallet
    );
    res.status(200).json({ message: closeResponse });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Token account closure failed", error: error.message });
  }
};
