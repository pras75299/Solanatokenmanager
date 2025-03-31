const express = require("express");
const nftController = require("../controllers/nftController");
const router = express.Router();

router.post("/mint-nft", nftController.mintNFT);
router.get("/minted-nfts", nftController.getMintedNFTs);
router.post("/transfer-nft", nftController.transferNFT);
router.get("/nfts", nftController.fetchNFTs);
router.get("/refresh-metadata/:mintAddress", nftController.refreshMetadata);

// Upload image route
router.post("/upload-image", nftController.uploadImage);

module.exports = router;
