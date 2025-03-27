import React, { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Loader2, Flame, Info } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createBurnInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

const BurnPage = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tokenAddress: "",
    amount: "",
  });

  const handleBurnToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.tokenAddress || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // Validate token address
      let mintPubkey: PublicKey;
      try {
        mintPubkey = new PublicKey(formData.tokenAddress);
      } catch (error) {
        toast.error("Invalid token address");
        return;
      }

      // Get the associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      // Verify token account exists and has enough balance
      try {
        const tokenAccount = await getAccount(
          connection,
          associatedTokenAddress
        );
        const currentBalance = Number(tokenAccount.amount);
        const burnAmount = Number(formData.amount);

        if (currentBalance < burnAmount) {
          toast.error("Insufficient token balance");
          return;
        }
      } catch (error) {
        toast.error("Token account not found. Make sure you own this token.");
        return;
      }

      // Create burn instruction
      const burnInstruction = createBurnInstruction(
        associatedTokenAddress,
        mintPubkey,
        publicKey,
        Number(formData.amount)
      );

      // Create and send transaction
      const transaction = new Transaction().add(burnInstruction);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      // Sign and send transaction
      const signedTransaction = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      toast.success("Tokens burned successfully!");
      setFormData({ tokenAddress: "", amount: "" });
    } catch (error) {
      console.error("Burn error:", error);
      toast.error(error.message || "Failed to burn tokens");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard className="group">
        <h1 className="text-3xl font-bold text-white mb-6">Burn Token</h1>

        <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
            <p className="text-gray-300">
              Burning tokens permanently removes them from circulation. This
              action cannot be undone. Make sure you have the correct token
              address and amount before proceeding.
            </p>
          </div>
        </div>

        <form onSubmit={handleBurnToken} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Token Address *</label>
            <input
              type="text"
              value={formData.tokenAddress}
              onChange={(e) =>
                setFormData({ ...formData, tokenAddress: e.target.value })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter token address"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Amount *</label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                setFormData({ ...formData, amount: value });
              }}
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter amount to burn"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !connected}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium py-4 rounded-lg transition-all duration-200 ${
              (loading || !connected) && "opacity-50 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Burning...
              </>
            ) : (
              <>
                <Flame className="w-5 h-5" />
                Burn Token
              </>
            )}
          </button>

          {!connected && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Please connect your wallet to burn tokens
            </p>
          )}
        </form>
      </GlowingCard>
    </div>
  );
};

export default BurnPage;
