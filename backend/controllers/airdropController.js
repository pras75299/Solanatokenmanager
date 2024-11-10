const solanaService = require("../services/solanaService");

exports.airdropSol = async (req, res) => {
  const { publicKey } = req.params;
  try {
    const message = await solanaService.airdropSol(publicKey);
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ message: "Airdrop failed", error: error.message });
  }
};
