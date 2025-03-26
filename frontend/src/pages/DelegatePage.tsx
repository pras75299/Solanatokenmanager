import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Loader2, UserPlus, Info } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";

const DelegatePage = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tokenAddress: "",
    delegateAddress: "",
    amount: "",
  });

  const handleDelegate = async (e) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      !formData.tokenAddress ||
      !formData.delegateAddress ||
      !formData.amount
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      // Delegate token logic will go here
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated delay
      toast.success("Token delegated successfully!");
      setFormData({ tokenAddress: "", delegateAddress: "", amount: "" });
    } catch (error) {
      toast.error(error.message || "Failed to delegate token");
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
            <label className="block text-gray-300 mb-2">
              Delegate Address *
            </label>
            <input
              type="text"
              value={formData.delegateAddress}
              onChange={(e) =>
                setFormData({ ...formData, delegateAddress: e.target.value })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter delegate address"
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
