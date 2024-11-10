const solanaService = require("../services/solanaService");
const loadKeypair = require("../importKey");
const { PublicKey } = require("@solana/web3.js");

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

exports.transferToken = async (req, res) => {
  const { mintAddress, toWallet, amount, tokenStandard } = req.body;

  try {
    const fromWallet = loadKeypair();
    if (!mintAddress || !toWallet || !amount) {
      return res
        .status(400)
        .json({ message: "Invalid request body parameters" });
    }

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

exports.checkBalance = async (req, res) => {
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
