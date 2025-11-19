import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
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
import { tokenService } from "../lib/api";

interface TokenFormData {
  tokenStandard: "Token" | "Token-2022";
}

interface MintResult {
  message: string;
  mintAddress?: string;
}

const MintTokenPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [formData, setFormData] = useState<TokenFormData>({
    tokenStandard: "Token",
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
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setMintResult(null);

      console.log("[MintTokenPage] Requesting token mint...");
      const response = await tokenService.mintToken({
        recipientPublicKey: publicKey.toString(),
        tokenStandard: formData.tokenStandard,
      });

      console.log("[MintTokenPage] Mint response:", response);

      // Check if response has success property
      if (response && response.success === true) {
        setMintResult({
          message: response.message || "Tokens minted successfully!",
        });
        toast.success(response.message || "Tokens minted successfully!");
        
        // Navigate to tokens page after a short delay to allow blockchain to update
        setTimeout(() => {
          navigate("/tokens", { 
            state: { fromMintPage: true, refreshTimestamp: Date.now() } 
          });
        }, 2000);
      } else if (response && response.success === false) {
        // Explicit failure case
        const errorMsg = response.message || response.error || "Failed to mint tokens";
        console.error("[MintTokenPage] Mint failed:", errorMsg);
        toast.error(errorMsg);
      } else {
        // Unexpected response format
        console.warn("[MintTokenPage] Unexpected response format:", response);
        // Assume success if we got a message
        if (response?.message) {
          setMintResult({
            message: response.message,
          });
          toast.success(response.message);
        } else {
          throw new Error("Unexpected response format from server");
        }
      }
    } catch (error: any) {
      console.error("[MintTokenPage] Token minting error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        error?.error ||
        "Failed to mint tokens";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard>
        {mintResult ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Tokens Minted Successfully!
              </h2>
              <button
                onClick={() => setMintResult(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Mint More Tokens
              </button>
            </div>

            <div className="bg-[#2A303C] rounded-lg p-6 space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Result</label>
                <p className="text-white font-medium">{mintResult.message}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Token Standard</label>
                <p className="text-white font-medium">
                  {formData.tokenStandard}
                </p>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-green-300">
                    Tokens have been minted successfully to your connected
                    wallet.
                  </p>
                  <p className="text-green-400/80 text-sm">
                    The backend uses a shared mint address. 1000 tokens were
                    minted to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-6">Mint Tokens</h1>

            <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Mint tokens from the backend-managed mint address. Tokens
                    will be minted to your connected wallet.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Note: The backend uses a shared mint address (all tokens are from the same token type). 1000 tokens will be minted to your account.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">
                  Token Standard *
                </label>
                <select
                  value={formData.tokenStandard}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tokenStandard: e.target.value as "Token" | "Token-2022",
                    })
                  }
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  disabled={loading}
                >
                  <option value="Token">Token (SPL Token)</option>
                  <option value="Token-2022">Token-2022</option>
                </select>
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
                    Minting Tokens...
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Mint Tokens
                  </>
                )}
              </motion.button>

              {!connected && (
                <p className="text-center text-sm text-gray-400 mt-2">
                  Please connect your wallet to mint tokens
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
