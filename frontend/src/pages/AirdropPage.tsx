import React, { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Loader2, Droplet } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard"; // Assuming this component exists

const AirdropPage = () => {
  const { publicKey, connected } = useWallet();
  const [isAirdropping, setIsAirdropping] = useState(false);

  const handleAirdrop = useCallback(async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsAirdropping(true);
    const toastId = toast.loading("Requesting airdrop...");

    try {
      const response = await fetch(
        `https://solanatokenmanager.onrender.com/api/airdrop/${publicKey.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // No body needed for this POST request as per the route definition
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Airdrop request failed");
      }

      toast.success(data.message || "Airdrop successful!", { id: toastId });
    } catch (error: any) {
      toast.error(`Airdrop failed: ${error.message || "Unknown error"}`, {
        id: toastId,
      });
      console.error("Airdrop error:", error);
    } finally {
      setIsAirdropping(false);
    }
  }, [connected, publicKey]);

  return (
    <div className="max-w-md mx-auto p-6">
      <GlowingCard>
        <div className="p-6 space-y-6">
          <h1 className="text-3xl font-bold text-white text-center">
            Solana Airdrop
          </h1>

          <p className="text-gray-400 text-center text-sm">
            Request 1 SOL to your connected wallet. This typically only works on
            Devnet or Testnet.
          </p>

          {!connected ? (
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
                disabled={isAirdropping || !connected}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium py-3 rounded-lg transition-all duration-200 ${
                  (isAirdropping || !connected) &&
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
