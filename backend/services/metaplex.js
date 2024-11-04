const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js"); // Removed `bundlrStorage` import
const { Connection, Keypair, clusterApiUrl } = require("@solana/web3.js");
const dotenv = require("dotenv");
dotenv.config();

if (!process.env.SOLANA_SECRET_KEY) {
  throw new Error(
    "SOLANA_SECRET_KEY is not defined in .env file or is improperly formatted"
  );
}

let secretKey;
try {
  secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY));
} catch (error) {
  throw new Error(
    "Failed to parse SOLANA_SECRET_KEY. Ensure it is a valid JSON array."
  );
}

const payerKeypair = Keypair.fromSecretKey(secretKey);

// Set up the connection to Solana Devnet
const connection = new Connection(clusterApiUrl("devnet"));

// Initialize Metaplex instance without `bundlrStorage`
const metaplex = Metaplex.make(connection).use(keypairIdentity(payerKeypair));

// Export the configured Metaplex instance for use elsewhere
module.exports = { metaplex, connection, payerKeypair };
