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
  burn,
  approve,
  closeAccount,
  createMint,
  mintTo,
  getAccount,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} = require("@solana/spl-token");
const { metaplex, payerKeypair } = require("./metaplex");
const dotenv = require("dotenv");
dotenv.config();

// Connect to Solana devnet
const connection = new Connection(clusterApiUrl("devnet"));

//metamask

// mintNFT
// solanaService.js

const mintNFT = async (recipientPublicKey, metadata) => {
  try {
    const recipientKey = new PublicKey(recipientPublicKey);

    const { uri, name, symbol } = metadata;

    // Call the Metaplex `create` method without `.run()`
    const nft = await metaplex.nfts().create({
      uri,
      name,
      symbol,
      sellerFeeBasisPoints: 500, // 5% royalties
      creators: [
        {
          address: payerKeypair.publicKey,
          share: 100,
        },
      ],
      updateAuthority: payerKeypair,
    });

    console.log(
      "NFT created with Token Metadata program:",
      nft.mintAddress.toString()
    );
    return `NFT minted successfully, Mint Address: ${nft.mintAddress.toString()}`;
  } catch (error) {
    console.error("NFT Minting Error:", error.message);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
};

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
//const payerKeypair = Keypair.fromSecretKey(secretKey);
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

const transferNFT = async (mintAddress, senderKeypair, recipientPublicKey) => {
  try {
    // Ensure mintAddress and recipientPublicKey are PublicKey instances
    const mintPublicKey = new PublicKey(mintAddress);
    const recipientPublicKeyInstance = new PublicKey(recipientPublicKey);

    // Find the NFT by mint address
    const nft = await metaplex
      .nfts()
      .findByMint({ mintAddress: mintPublicKey });

    // Execute the transfer
    const transferResult = await metaplex.nfts().transfer({
      nftOrSft: nft,
      toOwner: recipientPublicKeyInstance,
    });

    console.log("NFT Transfer successful:", transferResult.response.signature);
    return `NFT Transfer successful, transaction signature: ${transferResult.response.signature}`;
  } catch (error) {
    console.error("NFT Transfer Error:", error.message);
    throw new Error(`Failed to transfer NFT: ${error.message}`);
  }
};

const burnToken = async (mintAddress, ownerWallet, amount) => {
  try {
    const mintPublicKey = new PublicKey(mintAddress);

    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      ownerWallet,
      mintPublicKey,
      ownerWallet.publicKey
    );

    const accountInfo = await getAccount(connection, ownerTokenAccount.address);
    const balance = accountInfo.amount;
    const amountBigInt = BigInt(amount) * BigInt(10 ** 9);

    if (balance < amountBigInt) {
      throw new Error(
        `Insufficient token balance: Available balance is ${
          balance / BigInt(10 ** 9)
        } tokens, requested ${amount} tokens`
      );
    }

    const transactionSignature = await burn(
      connection,
      ownerWallet,
      ownerTokenAccount.address,
      mintPublicKey,
      ownerWallet,
      amountBigInt
    );

    console.log("Burn Transaction Signature:", transactionSignature);
    return `Burn successful, transaction signature: ${transactionSignature}`;
  } catch (error) {
    console.error("Error in burnToken:", error.message);
    throw new Error(`Failed to burn token: ${error.message}`);
  }
};

const delegateToken = async (
  mintAddress,
  ownerWallet,
  delegatePublicKey,
  amount
) => {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const delegateKey = new PublicKey(delegatePublicKey);

    // Ensure we have the owner's associated token account for this mint
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      ownerWallet,
      mintPublicKey,
      ownerWallet.publicKey // ownerWallet is the authority here
    );

    // Convert amount to BigInt with the appropriate decimals (assuming 9 decimals)
    const amountBigInt = BigInt(amount) * BigInt(10 ** 9);

    // Approve delegation
    const transactionSignature = await approve(
      connection,
      ownerWallet,
      ownerTokenAccount.address,
      delegateKey,
      ownerWallet, // Owner is the signer
      amountBigInt
    );

    console.log("Delegation Transaction Signature:", transactionSignature);
    return `Delegation successful, transaction signature: ${transactionSignature}`;
  } catch (error) {
    console.error("Error in delegateToken:", error.message);
    throw new Error(`Failed to delegate token: ${error.message}`);
  }
};

const closeTokenAccount = async (mintAddress, ownerWallet) => {
  try {
    const mintPublicKey = new PublicKey(mintAddress);

    // Get or create the associated token account for this mint and wallet
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      ownerWallet,
      mintPublicKey,
      ownerWallet.publicKey // Closing account needs the owner's public key
    );

    // Close the token account
    const transactionSignature = await closeAccount(
      connection,
      ownerWallet,
      tokenAccount.address, // The token account to close
      ownerWallet.publicKey, // The destination of remaining balance, if any
      ownerWallet
    );

    return `Token account closed successfully, transaction signature: ${transactionSignature}`;
  } catch (error) {
    console.error("Error in closeTokenAccount:", error);
    throw new Error(`Failed to close token account: ${error.message}`);
  }
};

const getNFTMetadata = async (mintAddress) => {
  try {
    // Convert mintAddress to PublicKey
    const mintPublicKey = new PublicKey(mintAddress);

    // Fetch the NFT data using Metaplex
    const nft = await metaplex
      .nfts()
      .findByMint({ mintAddress: mintPublicKey });

    if (!nft) {
      throw new Error("NFT not found on Solana");
    }

    // Basic metadata that we always return
    const baseMetadata = {
      name: nft.name || "Unnamed NFT",
      symbol: nft.symbol || "NFT",
      uri: nft.uri,
      description: "Metadata unavailable",
      attributes: [],
    };

    // If the URI is a placeholder image or doesn't exist, return basic metadata
    if (!nft.uri || nft.uri.includes("placehold.co")) {
      return baseMetadata;
    }

    // For non-placeholder URIs, try to fetch metadata with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(nft.uri, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(
          `Failed to fetch metadata from URI (${response.status}): ${nft.uri}`
        );
        return baseMetadata;
      }

      const metadata = await response.json();

      // Validate and merge metadata
      return {
        name: metadata.name || baseMetadata.name,
        symbol: metadata.symbol || baseMetadata.symbol,
        uri: metadata.image || nft.uri,
        description: metadata.description || baseMetadata.description,
        attributes: Array.isArray(metadata.attributes)
          ? metadata.attributes
          : [],
      };
    } catch (error) {
      // Log the specific fetch error but don't throw
      console.warn(
        `Failed to fetch metadata from URI ${nft.uri}:`,
        error.message
      );
      return baseMetadata;
    }
  } catch (error) {
    console.error("Error in getNFTMetadata:", error);
    throw new Error(`Failed to fetch NFT metadata: ${error.message}`);
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
  mintNFT,
  transferNFT,
  burnToken,
  delegateToken,
  closeTokenAccount,
  getNFTMetadata,
};
