const fs = require("fs");
const path = require("path");
const MINT_ADDRESS_FILE = path.join(__dirname, "mintAddress.txt");
const {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} = require("@solana/web3.js");
const {
  createMint,
  mintTo,
  getAccount,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} = require("@solana/spl-token");
const dotenv = require("dotenv");
dotenv.config();

// Connect to Solana devnet
const connection = new Connection(clusterApiUrl("devnet"));

const getOrCreateMintAddress = async () => {
  if (fs.existsSync(MINT_ADDRESS_FILE)) {
    const savedMintAddress = fs.readFileSync(MINT_ADDRESS_FILE, "utf8").trim();
    console.log("Using saved mint address:", savedMintAddress);
    return savedMintAddress;
  }

  const mint = await createMint(
    connection,
    payerKeypair,
    payerKeypair.publicKey,
    null,
    9
  );

  const mintAddress = mint.toString();
  console.log("Created new mint address:", mintAddress);
  fs.writeFileSync(MINT_ADDRESS_FILE, mintAddress);
  return mintAddress;
};

// Define the payer keypair (replace with the private key array of the funded account)

if (!process.env.SOLANA_PRIVATE_KEY) {
  throw new Error("SOLANA_PRIVATE_KEY is not defined in .env file");
}

const secretKey = Uint8Array.from(
  Buffer.from(process.env.SOLANA_PRIVATE_KEY, "base64")
);
const payerKeypair = Keypair.fromSecretKey(secretKey);
// Function to get SOL balance of an address
const getBalance = async (publicKey) => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
  } catch (error) {
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }
};

// Function to airdrop SOL
const airdropSol = async (publicKey) => {
  try {
    const airdropSignature = await connection.requestAirdrop(
      new PublicKey(publicKey),
      4 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);
    return "Airdrop successful!";
  } catch (error) {
    throw new Error(`Airdrop failed: ${error.message}`);
  }
};

// Function to mint a new token
const mintToken = async (recipientPublicKey) => {
  try {
    const recipientKey = new PublicKey(recipientPublicKey);
    console.log("Recipient Public Key in mintToken:", recipientKey.toString());

    const mintAddress = await getOrCreateMintAddress();
    console.log("Mint Address in mintToken:", mintAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintPublicKey,
      recipientKey
    );

    const signature = await mintTo(
      connection,
      payerKeypair,
      mintPublicKey,
      recipientTokenAccount.address,
      payerKeypair,
      1000 * 10 ** 9
    );

    console.log("Mint Transaction Signature:", signature);
    return `Mint successful, transaction signature: ${signature}`;
  } catch (error) {
    console.error("Minting Error:", error.message);
    throw new Error(`Failed to mint token: ${error.message}`);
  }
};

const mintToken2022 = async (recipientPublicKey) => {
  try {
    const recipientKey =
      recipientPublicKey instanceof PublicKey
        ? recipientPublicKey
        : new PublicKey(recipientPublicKey);

    // Use getOrCreateMintAddress to get the mint address
    const mintAddress = await getOrCreateMintAddress();
    const mintPublicKey = new PublicKey(mintAddress);

    // Get or create the recipient's associated token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintPublicKey,
      recipientKey,
      false,
      TOKEN_2022_PROGRAM_ID // Specify the Token-2022 program ID
    );

    console.log(
      "Recipient Token Account:",
      recipientTokenAccount.address.toString()
    );

    // Mint tokens to the recipient's account
    const signature = await mintTo(
      connection,
      payerKeypair,
      mintPublicKey,
      recipientTokenAccount.address,
      payerKeypair,
      1000 * 10 ** 9, // Amount to mint
      [],
      TOKEN_2022_PROGRAM_ID // Use Token-2022 program ID
    );

    console.log("Mint Transaction Signature:", signature);

    return `Mint successful, transaction signature: ${signature}`;
  } catch (error) {
    console.error("Minting Error:", error.message);
    throw new Error(`Failed to mint Token-2022: ${error.message}`);
  }
};

const airdropSolIfNeeded = async (
  publicKey,
  minBalance = 1 * LAMPORTS_PER_SOL
) => {
  const balance = await connection.getBalance(publicKey);
  if (balance < minBalance) {
    const signature = await connection.requestAirdrop(publicKey, minBalance);
    await connection.confirmTransaction(signature);
    console.log("Airdropped SOL to payer account for transaction fees.");
  }
};

// Function to transfer tokens from one account to another

const transferTokens = async (
  mintAddress,
  fromWallet,
  toWallet,
  amount,
  tokenStandard = "Token"
) => {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const senderPublicKey = fromWallet.publicKey;
    const toPublicKey = new PublicKey(toWallet);

    // Select the correct program ID based on token standard
    const programId =
      tokenStandard === "Token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

    // Get or create associated token accounts for sender and receiver with the appropriate program ID
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintPublicKey,
      senderPublicKey,
      false,
      programId
    );
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintPublicKey,
      toPublicKey,
      false,
      programId
    );

    console.log(
      "Sender Token Account Address:",
      fromTokenAccount.address.toString()
    );
    console.log(
      "Recipient Token Account Address:",
      toTokenAccount.address.toString()
    );

    // Check sender's token account balance
    let senderBalance = await getTokenAccountBalance(fromTokenAccount.address);
    console.log(
      "Initial Sender Token Account Balance:",
      senderBalance,
      "tokens"
    );

    // Convert `amount` to BigInt and check balance
    const amountBigInt = BigInt(amount) * BigInt(10 ** 9);
    if (senderBalance < amountBigInt) {
      const requiredAmount = amountBigInt - senderBalance;
      console.log(
        `Insufficient token balance: ${senderBalance} available, ${amountBigInt} required. Minting additional tokens...`
      );

      // Mint only the required additional tokens
      await mintTo(
        connection,
        payerKeypair,
        mintPublicKey,
        fromTokenAccount.address,
        payerKeypair,
        requiredAmount,
        [],
        programId
      );

      console.log("Minted additional tokens to sender's account.");

      // Re-check balance after minting
      senderBalance = await getTokenAccountBalance(fromTokenAccount.address);
      console.log(
        "Updated Sender Token Account Balance:",
        senderBalance,
        "tokens"
      );

      if (senderBalance < amountBigInt) {
        throw new Error(
          `Minting failed: still insufficient balance after minting.`
        );
      }
    }

    // Create the transfer instruction with the correct program ID
    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        senderPublicKey,
        amountBigInt,
        [],
        programId
      )
    );

    // Send and confirm the transaction
    const signature = await connection.sendTransaction(transaction, [
      fromWallet,
    ]);
    console.log("Transaction signature:", signature);

    await connection.confirmTransaction(signature);
    console.log("Transaction confirmed");
    return `Transfer successful, transaction signature: ${signature}`;
  } catch (error) {
    console.error("Detailed Transfer Error:", error.message);
    throw new Error(`Token transfer failed: ${error.message}`);
  }
};

// Helper function to check token account balance, returning BigInt
const getTokenAccountBalance = async (tokenAccountAddress) => {
  try {
    const accountInfo = await getAccount(
      connection,
      new PublicKey(tokenAccountAddress)
    );
    return accountInfo.amount; // Returns amount as BigInt directly
  } catch (error) {
    throw new Error(`Failed to fetch token account balance: ${error.message}`);
  }
};

module.exports = {
  connection,
  payerKeypair,
  getBalance,
  airdropSol,
  mintToken,
  transferTokens,
  getOrCreateMintAddress,
  airdropSolIfNeeded,
  mintToken2022,
};
