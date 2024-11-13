const express = require("express");
const router = express.Router();
const tokenController = require("../controllers/tokenController");

// Mint Token
router.post("/mint-token", tokenController.mintToken);

// Transfer Tokens
router.post("/transfer-tokens", tokenController.transferTokens);

// Check Balance
router.get("/balance/:publicKey", tokenController.getBalance);

// Burn Token
router.post("/burn-token", tokenController.burnToken);

// Delegate Token
router.post("/delegate-token", tokenController.delegateToken);

// Close Token Account
router.post("/close-token-account", tokenController.closeTokenAccount);

module.exports = router;
