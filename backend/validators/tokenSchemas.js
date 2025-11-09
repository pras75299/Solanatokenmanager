const { z } = require("zod");
const { convertAmountToRawUnits } = require("../services/solanaService");

const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const publicKeySchema = z
  .string()
  .trim()
  .regex(base58Regex, "Invalid Solana public key");

const tokenStandardSchema = z.enum(["Token", "Token-2022"]).default("Token");

const positiveAmountSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .refine((value) => {
    try {
      return convertAmountToRawUnits(value) > 0n;
    } catch (error) {
      return false;
    }
  }, "Amount must be a positive number with up to 9 decimal places");

const mintTokenSchema = z.object({
  recipientPublicKey: publicKeySchema,
  tokenStandard: tokenStandardSchema,
});

const transferTokensSchema = z.object({
  mintAddress: publicKeySchema,
  toWallet: publicKeySchema,
  amount: positiveAmountSchema,
  tokenStandard: tokenStandardSchema,
});

const burnTokenSchema = z.object({
  mintAddress: publicKeySchema,
  amount: positiveAmountSchema,
});

const delegateTokenSchema = z.object({
  mintAddress: publicKeySchema,
  delegatePublicKey: publicKeySchema,
  amount: positiveAmountSchema,
});

const closeTokenAccountSchema = z.object({
  mintAddress: publicKeySchema,
});

module.exports = {
  publicKeySchema,
  mintTokenSchema,
  transferTokensSchema,
  burnTokenSchema,
  delegateTokenSchema,
  closeTokenAccountSchema,
};
