const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  totalSupply: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Token", TokenSchema);
