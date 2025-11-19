const solanaService = require("../services/solanaService");
const { publicKeySchema } = require("../validators/tokenSchemas");

exports.airdropSol = async (req, res) => {
  try {
    const parsed = publicKeySchema.safeParse(req.params.publicKey);
    if (!parsed.success) {
      console.error("[Airdrop Controller] Invalid public key:", req.params.publicKey);
      return res.status(400).json({
        success: false,
        message: "Invalid public key",
        errors: parsed.error.flatten(),
      });
    }

    console.log(`[Airdrop Controller] Processing airdrop request for: ${parsed.data}`);
    const message = await solanaService.airdropSol(parsed.data);
    console.log(`[Airdrop Controller] Airdrop successful: ${message}`);
    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("[Airdrop Controller] Error:", error);
    const errorMessage = error.message || "Unknown error occurred";
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorMessage,
    });
  }
};
