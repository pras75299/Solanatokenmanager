// importKey.js

const { Keypair } = require("@solana/web3.js");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

/**
 * Load the private key from an environment variable or file and return a Keypair.
 * @returns {Keypair} The Keypair instance created from the secret key.
 * @throws Will throw an error if the private key is not available or malformed.
 */
function loadKeypair() {
  let secretKey;

  if (process.env.SOLANA_PRIVATE_KEY) {
    // Option 1: Load from environment variable as a base64-encoded string
    try {
      secretKey = Uint8Array.from(
        Buffer.from(process.env.SOLANA_PRIVATE_KEY, "base64")
      );
      if (secretKey.length !== 64) {
        throw new Error(
          "Invalid private key length in environment variable. Expected 64 bytes."
        );
      }
    } catch (error) {
      throw new Error(
        "Failed to parse SOLANA_PRIVATE_KEY from environment variable: " +
          error.message
      );
    }
  } else if (fs.existsSync(path.resolve(__dirname, "solana-keypair.json"))) {
    // Option 2: Load from file (e.g., solana-keypair.json) as an array
    try {
      secretKey = Uint8Array.from(
        JSON.parse(
          fs.readFileSync(
            path.resolve(__dirname, "solana-keypair.json"),
            "utf8"
          )
        )
      );
      if (secretKey.length !== 64) {
        throw new Error(
          "Invalid private key length in file. Expected 64 bytes."
        );
      }
    } catch (error) {
      throw new Error("Failed to load private key from file: " + error.message);
    }
  } else {
    throw new Error(
      "No private key found. Define SOLANA_PRIVATE_KEY in .env or provide solana-keypair.json file."
    );
  }

  return Keypair.fromSecretKey(secretKey);
}

module.exports = loadKeypair;
