import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Loader2, Coins, Info } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";

const CreateTokenPage = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    decimals: "",
    initialSupply: "",
    description: "",
  });

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      !formData.name ||
      !formData.symbol ||
      !formData.decimals ||
      !formData.initialSupply
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      // Token creation logic will go here
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated delay
      toast.success("Token created successfully!");
      setFormData({
        name: "",
        symbol: "",
        decimals: "",
        initialSupply: "",
        description: "",
      });
    } catch (error) {
      toast.error(error.message || "Failed to create token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard className="group">
        <h1 className="text-3xl font-bold text-white mb-6">Create Token</h1>

        <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
            <p className="text-gray-300">
              Create your own SPL token on the Solana blockchain. You'll need to
              specify the token's name, symbol, decimals, and initial supply.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateToken} className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Token Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter token name"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Token Symbol *</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  symbol: e.target.value.toUpperCase(),
                })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter token symbol (e.g., SOL)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Decimals *</label>
            <input
              type="text"
              value={formData.decimals}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                if (parseInt(value) <= 9) {
                  setFormData({ ...formData, decimals: value });
                }
              }}
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter decimals (0-9)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Initial Supply *</label>
            <input
              type="text"
              value={formData.initialSupply}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                setFormData({ ...formData, initialSupply: value });
              }}
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter initial supply"
              disabled={loading}
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading || !connected}
            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium py-4 rounded-lg transition-all duration-200 ${
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
              Please connect your wallet to create a token
            </p>
          )}
        </form>
      </GlowingCard>
    </div>
  );
};

export default CreateTokenPage;
