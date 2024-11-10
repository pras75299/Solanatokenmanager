const express = require("express");
const airdropController = require("../controllers/airdropController");
const router = express.Router();

router.post("/airdrop/:publicKey", airdropController.airdropSol);

module.exports = router;
