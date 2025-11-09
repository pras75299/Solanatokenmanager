const solanaService = require("../services/solanaService");
const { publicKeySchema } = require("../validators/tokenSchemas");

exports.airdropSol = async (req, res) => {
  const parsed = publicKeySchema.safeParse(req.params.publicKey);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid public key",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const message = await solanaService.airdropSol(parsed.data);
    res.status(200).json({ success: true, message });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Airdrop failed",
        error: error.message,
      });
  }
};
