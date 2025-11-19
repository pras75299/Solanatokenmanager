import React, { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Loader2, Droplet, AlertCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { tokenService } from "../lib/api";
import { getApiBaseUrl } from "../config/env";

const AirdropPage = () => {
  const { publicKey, connected } = useWallet();
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(true);

  // Check backend connectivity
  const checkBackend = useCallback(async () => {
    try {
      setCheckingBackend(true);
      await tokenService.checkHealth();
      setBackendConnected(true);
      toast.success("Backend server connected!");
    } catch (error) {
      console.error("[AirdropPage] Backend health check failed:", error);
      setBackendConnected(false);
    } finally {
      setCheckingBackend(false);
    }
  }, []);

  // Check backend connectivity on mount
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  const handleAirdrop = useCallback(async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (isAirdropping) {
      return;
    }

    setIsAirdropping(true);

    try {
      console.log("[AirdropPage] Requesting airdrop for:", publicKey.toString());
      const response = await tokenService.requestAirdrop(
        publicKey.toString()
      );
      console.log("[AirdropPage] Airdrop response:", response);
      toast.success(response?.message ?? "Airdrop successful!");
    } catch (error: any) {
      console.error("[AirdropPage] Airdrop error details:", error);
      // Extract error message from various possible locations
      const description =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.error ||
        error?.message ||
        "Unknown error while requesting airdrop";
      toast.error(description);
    } finally {
      setIsAirdropping(false);
    }
  }, [connected, publicKey, isAirdropping]);

  return (
    <div className="max-w-md mx-auto p-6">
      <GlowingCard>
        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold text-white text-center">
            Solana Airdrop
          </h1>

          <p className="text-gray-400 text-center text-sm">
            Request 2 SOL to your connected wallet. This typically only works on
            Devnet or Testnet.
          </p>

          {checkingBackend ? (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-gray-400 text-sm">Checking backend connection...</p>
            </div>
          ) : backendConnected === false ? (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">Backend Server Not Connected</p>
                  <p className="text-red-300 text-sm mb-2">
                    Unable to reach backend server at <code className="bg-black/20 px-1 rounded">{getApiBaseUrl()}</code>
                  </p>
                  <p className="text-red-300 text-xs mb-3">
                    Please ensure the backend server is running. Check the console for more details.
                  </p>
                </div>
              </div>
              <button
                onClick={checkBackend}
                disabled={checkingBackend}
                className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingBackend ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                  </>
                )}
              </button>
            </div>
          ) : !connected ? (
            <div className="text-center py-4">
              <p className="text-yellow-500">
                Please connect your wallet to request an airdrop.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Connected Wallet
                </label>
                <div className="bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm truncate">
                  {publicKey?.toString()}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAirdrop}
                disabled={isAirdropping || !connected || !backendConnected}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium py-3 rounded-lg transition-all duration-200 ${
                  (isAirdropping || !connected || !backendConnected) &&
                  "opacity-50 cursor-not-allowed"
                }`}
              >
                {isAirdropping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Droplet className="w-5 h-5" />
                    Airdrop 2 SOL
                  </>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </GlowingCard>
    </div>
  );
};

export default AirdropPage;
