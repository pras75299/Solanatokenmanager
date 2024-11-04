const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  recipientPublicKey: {
    type: String,
    required: true,
  },
  mintAddress: {
    type: String,
    required: true,
  },
  uri: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("NFT", NFTSchema);
