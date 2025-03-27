import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import {
  Loader2,
  Coins,
  Info,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";

interface TokenFormData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
}

interface CreatedToken {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  mintAddress: string;
}

const MintTokenPage: React.FC = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [formData, setFormData] = useState<TokenFormData>({
    name: "",
    symbol: "",
    decimals: 9,
    totalSupply: 1000000,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // Connect to Solana devnet
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      // Create a new mint account
      const mintKeypair = Keypair.generate();
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      // Create the mint account
      const createMintAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      });

      // Initialize the mint
      const initializeMintInstruction = createInitializeMintInstruction(
        mintKeypair.publicKey,
        formData.decimals,
        publicKey,
        publicKey,
        TOKEN_PROGRAM_ID
      );

      // Get the token account of the wallet address
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );

      // Create the associated token account if it doesn't exist
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAccount,
        publicKey,
        mintKeypair.publicKey
      );

      // Mint tokens to the associated token account
      const mintToInstruction = createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAccount,
        publicKey,
        formData.totalSupply * Math.pow(10, formData.decimals)
      );

      // Create and send transaction
      const transaction = new Transaction().add(
        createMintAccountInstruction,
        initializeMintInstruction,
        createAccountInstruction,
        mintToInstruction
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      transaction.sign(mintKeypair);

      try {
        // Sign and send the transaction
        const signedTransaction = await signTransaction(transaction);
        const txid = await connection.sendRawTransaction(
          signedTransaction.serialize()
        );

        // Wait for transaction confirmation
        const confirmation = await connection.confirmTransaction(
          txid,
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error("Transaction failed to confirm");
        }

        // Set the created token details
        setCreatedToken({
          name: formData.name,
          symbol: formData.symbol,
          decimals: formData.decimals,
          totalSupply: formData.totalSupply,
          mintAddress: mintKeypair.publicKey.toString(),
        });

        toast.success("Token created successfully!");

        // Reset form
        setFormData({
          name: "",
          symbol: "",
          decimals: 9,
          totalSupply: 1000000,
        });
      } catch (txError) {
        console.error("Transaction error:", txError);
        throw new Error(
          "Failed to create token. Please check your wallet's SOL balance and try again."
        );
      }
    } catch (error) {
      console.error("Token creation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create token"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard>
        {createdToken ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Token Created Successfully!
              </h2>
              <button
                onClick={() => setCreatedToken(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Create Another Token
              </button>
            </div>

            <div className="bg-[#2A303C] rounded-lg p-6 space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Token Name</label>
                <p className="text-white font-medium">{createdToken.name}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Token Symbol</label>
                <p className="text-white font-medium">{createdToken.symbol}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Decimals</label>
                <p className="text-white font-medium">
                  {createdToken.decimals}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Total Supply</label>
                <p className="text-white font-medium">
                  {createdToken.totalSupply.toLocaleString()}{" "}
                  {createdToken.symbol}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Mint Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-purple-400 bg-[#1F242D] px-3 py-1 rounded text-sm flex-1 overflow-x-auto">
                    {createdToken.mintAddress}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdToken.mintAddress)}
                    className="p-2 hover:bg-[#1F242D] rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <a
                  href={`https://explorer.solana.com/address/${createdToken.mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Solana Explorer
                </a>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-green-300">
                    Your token has been created successfully on the Solana
                    devnet.
                  </p>
                  <p className="text-green-400/80 text-sm">
                    The initial supply has been minted to your connected wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-6">
              Create New Token
            </h1>

            <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Create your fungible token on the Solana blockchain. Specify
                    the token name, symbol, decimals, and total supply.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Note: Tokens will be created on the Solana devnet. Make sure
                    you have enough SOL in your devnet wallet.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">Token Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Enter token name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Token Symbol *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      symbol: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Enter token symbol (e.g., SOL)"
                  disabled={loading}
                  maxLength={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">
                    Decimals
                    <span className="text-gray-500 text-sm ml-1">(0-9)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.decimals}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        decimals: Math.max(
                          0,
                          Math.min(9, parseInt(e.target.value))
                        ),
                      })
                    }
                    min="0"
                    max="9"
                    className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter decimals"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Total Supply
                    <span className="text-gray-500 text-sm ml-1">(min: 1)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.totalSupply}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalSupply: Math.max(1, parseInt(e.target.value) || 0),
                      })
                    }
                    min="1"
                    className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter total supply"
                    disabled={loading}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !connected}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 rounded-lg transition-all duration-200 ${
                  (loading || !connected) && "opacity-50 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Token...
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Create Token
                  </>
                )}
              </motion.button>

              {!connected && (
                <p className="text-center text-sm text-gray-400 mt-2">
                  Please connect your wallet to create tokens
                </p>
              )}
            </form>
          </>
        )}
      </GlowingCard>
    </div>
  );
};

export default MintTokenPage;
