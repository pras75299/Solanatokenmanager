import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Loader2, UserPlus, Info } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { PublicKey } from "@solana/web3.js";
import { tokenService } from "../lib/api";

const DelegatePage = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mintAddress: "",
    delegatePublicKey: "",
    amount: "",
  });

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      !formData.mintAddress ||
      !formData.delegatePublicKey ||
      !formData.amount
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const toastId = toast.loading("Processing delegation...");

    try {
      setLoading(true);

      // Validate addresses
      try {
        new PublicKey(formData.mintAddress);
        new PublicKey(formData.delegatePublicKey);
      } catch (error) {
        toast.error("Invalid address format", { id: toastId });
        return;
      }

      // Validate amount
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid positive amount", { id: toastId });
        return;
      }

      const response = await tokenService.delegateToken({
        mintAddress: formData.mintAddress,
        delegatePublicKey: formData.delegatePublicKey,
        amount: formData.amount,
      });

      if (response.success) {
        toast.success(
          response.message || "Token delegated successfully!",
          { id: toastId }
        );
        setFormData({ mintAddress: "", delegatePublicKey: "", amount: "" });
      } else {
        throw new Error(response.message || "Failed to delegate token");
      }
    } catch (error: any) {
      console.error("Delegate error:", error);
      const errorMessage =
        error?.message || error?.error || "Failed to delegate token";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard className="group">
        <h1 className="text-3xl font-bold text-white mb-6">Delegate Token</h1>

        <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
            <p className="text-gray-300">
              Delegating tokens allows another address to use your tokens for
              specific purposes while maintaining your ownership. You can revoke
              the delegation at any time.
            </p>
          </div>
        </div>

        <form onSubmit={handleDelegate} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Mint Address *</label>
            <input
              type="text"
              value={formData.mintAddress}
              onChange={(e) =>
                setFormData({ ...formData, mintAddress: e.target.value })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter mint address"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Delegate Public Key *
            </label>
            <input
              type="text"
              value={formData.delegatePublicKey}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  delegatePublicKey: e.target.value,
                })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter delegate public key"
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
              placeholder="Enter amount to delegate"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !connected}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium py-4 rounded-lg transition-all duration-200 ${
              (loading || !connected) && "opacity-50 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Delegating...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Delegate Token
              </>
            )}
          </button>

          {!connected && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Please connect your wallet to delegate tokens
            </p>
          )}
        </form>
      </GlowingCard>
    </div>
  );
};

export default DelegatePage;
