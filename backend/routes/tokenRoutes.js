const express = require("express");
const tokenController = require("../controllers/tokenController");
const router = express.Router();

router.post("/mint-token", tokenController.mintToken);
router.post("/transfer-tokens", tokenController.transferToken);
router.get("/balance/:publicKey", tokenController.checkBalance);

module.exports = router;
