const solanaService = require("../services/solanaService");
const { PublicKey } = require("@solana/web3.js");
const loadKeypair = require("../importKey");
const {
  mintTokenSchema,
  transferTokensSchema,
  burnTokenSchema,
  delegateTokenSchema,
  closeTokenAccountSchema,
  publicKeySchema,
} = require("../validators/tokenSchemas");

const handleValidationError = (res, error, message) =>
  res.status(400).json({
    success: false,
    message,
    errors: error.flatten ? error.flatten() : error,
  });

exports.mintToken = async (req, res) => {
  const parsed = mintTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      "Invalid mint token request payload"
    );
  }

  const { recipientPublicKey, tokenStandard } = parsed.data;

  try {
    new PublicKey(recipientPublicKey);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid recipient public key",
      error: error.message,
    });
  }

  try {
    const result =
      tokenStandard === "Token-2022"
        ? await solanaService.mintToken2022(recipientPublicKey)
        : await solanaService.mintToken(recipientPublicKey);

    return res.status(200).json({ success: true, message: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Token minting failed",
      error: error.message,
    });
  }
};

// Controller for transferring tokens
exports.transferTokens = async (req, res) => {
  const parsed = transferTokensSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      "Invalid transfer token request payload"
    );
  }

  const { mintAddress, toWallet, amount, tokenStandard } = parsed.data;

  let fromWallet;
  try {
    fromWallet = loadKeypair();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load owner wallet",
      error: error.message,
    });
  }

  try {
    const transferResponse = await solanaService.transferTokens(
      mintAddress,
      fromWallet,
      toWallet,
      amount,
      tokenStandard
    );
    res.status(200).json({ success: true, message: transferResponse });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token transfer failed",
      error: error.message,
    });
  }
};

// Controller for checking balance
exports.getBalance = async (req, res) => {
  const parsed = publicKeySchema.safeParse(req.params.publicKey);
  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      "Invalid public key"
    );
  }

  try {
    const balance = await solanaService.getBalance(parsed.data);
    res.status(200).json({ success: true, balance });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch balance",
      error: error.message,
    });
  }
};

// Controller for burning tokens
exports.burnToken = async (req, res) => {
  const parsed = burnTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleValidationError(res, parsed.error, "Invalid burn payload");
  }

  let ownerWallet;
  try {
    ownerWallet = loadKeypair();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load owner wallet",
      error: error.message,
    });
  }

  try {
    const burnResponse = await solanaService.burnToken(
      parsed.data.mintAddress,
      ownerWallet,
      parsed.data.amount
    );
    res.status(200).json({ success: true, message: burnResponse });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token burn failed",
      error: error.message,
    });
  }
};

// Controller for delegating tokens
exports.delegateToken = async (req, res) => {
  const parsed = delegateTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      "Invalid delegate payload"
    );
  }

  let ownerWallet;
  try {
    ownerWallet = loadKeypair();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load owner wallet",
      error: error.message,
    });
  }

  try {
    const delegateResponse = await solanaService.delegateToken(
      parsed.data.mintAddress,
      ownerWallet,
      parsed.data.delegatePublicKey,
      parsed.data.amount
    );
    res.status(200).json({ success: true, message: delegateResponse });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token delegation failed",
      error: error.message,
    });
  }
};

// Controller for closing token account
exports.closeTokenAccount = async (req, res) => {
  const parsed = closeTokenAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleValidationError(
      res,
      parsed.error,
      "Invalid close account payload"
    );
  }

  let ownerWallet;
  try {
    ownerWallet = loadKeypair();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load owner wallet",
      error: error.message,
    });
  }

  try {
    const closeResponse = await solanaService.closeTokenAccount(
      parsed.data.mintAddress,
      ownerWallet
    );
    res.status(200).json({ success: true, message: closeResponse });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token account closure failed",
      error: error.message,
    });
  }
};
