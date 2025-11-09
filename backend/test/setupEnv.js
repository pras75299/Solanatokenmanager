const { Keypair } = require("@solana/web3.js");

const testKeypair = Keypair.generate();
const secretKeyBytes = Array.from(testKeypair.secretKey);

process.env.NODE_ENV = "test";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.SOLANA_PRIVATE_KEY = Buffer.from(secretKeyBytes).toString("base64");
process.env.SOLANA_SECRET_KEY = JSON.stringify(secretKeyBytes);

jest.spyOn(console, "error").mockImplementation(() => undefined);

afterAll(() => {
  console.error.mockRestore();
});
