import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import solanaLogo from "../assets/solanalogo.png";
import GlowingCard from "../components/GlowingCard";

const DashboardPage = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const getBalance = async () => {
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      }
    };

    getBalance();
  }, [publicKey, connection]);

  const MotionLink = motion(Link);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      {!connected ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="mb-8"
          >
            <img
              src={solanaLogo}
              alt="Solana Logo"
              className="w-32 h-32 mx-auto"
            />
          </motion.div>
          <h1 className="text-3xl font-bold mb-6 text-white">
            Welcome to Solana Token Manager
          </h1>
          <p className="text-gray-400 mb-8 text-lg">
            Connect your wallet to get started
          </p>
          <WalletMultiButton className="!bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all duration-200" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <GlowingCard>
            <div className="text-left mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Wallet Connected
              </h2>
              <div className="bg-[#2A303C] rounded-lg p-4 mb-4">
                <p className="text-gray-400 mb-2">Public Key</p>
                <p className="text-white break-all">{publicKey?.toBase58()}</p>
              </div>
              <div className="bg-[#2A303C] rounded-lg p-4">
                <p className="text-gray-400 mb-2">Balance</p>
                <p className="text-white text-2xl font-bold">
                  {balance !== null
                    ? `${balance.toFixed(4)} SOL`
                    : "Loading..."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MotionLink
                to="/create-token"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-lg text-center text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
              >
                Create Token
              </MotionLink>
              <MotionLink
                to="/burn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-red-500 to-orange-500 p-4 rounded-lg text-center text-white font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-200"
              >
                Burn Token
              </MotionLink>
              <MotionLink
                to="/delegate"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-green-500 to-teal-500 p-4 rounded-lg text-center text-white font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-200"
              >
                Delegate Token
              </MotionLink>
              <MotionLink
                to="/mint-nft"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 rounded-lg text-center text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition-all duration-200"
              >
                Mint NFT
              </MotionLink>
            </div>
          </GlowingCard>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardPage;
