import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, ExternalLink, Copy, Coins } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";

interface TokenInfo {
  mintAddress: string;
  name: string;
  symbol: string;
  balance: number;
  decimals: number;
}

const TokensPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const fetchTokens = async () => {
    if (!connected || !publicKey) {
      setTokens([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      // Fetch details for each token
      const tokenPromises = tokenAccounts.value.map(async (tokenAccount) => {
        const parsedInfo = tokenAccount.account.data.parsed.info;
        const mintAddress = parsedInfo.mint;
        const balance = parsedInfo.tokenAmount.uiAmount;

        try {
          const mintInfo = await getMint(
            connection,
            new PublicKey(mintAddress)
          );

          // Try to get token metadata from your backend or use default values
          return {
            mintAddress,
            name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
            symbol: "TOKEN",
            balance,
            decimals: mintInfo.decimals,
          };
        } catch (error) {
          console.error(`Error fetching mint info for ${mintAddress}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is TokenInfo => token !== null
      );
      setTokens(validTokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      toast.error("Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTokens();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTokens();
  }, [publicKey, connected]);

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <GlowingCard>
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-white mb-4">Your Tokens</h1>
            <p className="text-gray-400">
              Please connect your wallet to view your tokens
            </p>
          </div>
        </GlowingCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Your Tokens</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#2A303C] rounded-lg text-gray-300 hover:text-white transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </motion.button>
      </div>

      {loading ? (
        <GlowingCard>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        </GlowingCard>
      ) : tokens.length === 0 ? (
        <GlowingCard>
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No Tokens Found
            </h2>
            <p className="text-gray-400">
              You don't have any tokens in your wallet yet
            </p>
          </div>
        </GlowingCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tokens.map((token) => (
            <GlowingCard key={token.mintAddress}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {token.name}
                    </h3>
                    <p className="text-gray-400">{token.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        token.balance === 0 ? "text-red-400" : "text-white"
                      }`}
                    >
                      {token.balance.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-400 text-sm">
                        Decimals: {token.decimals}
                      </p>
                      {token.balance === 0 && (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
                          No Balance
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Mint Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-[#1F242D] rounded-lg p-2 flex items-center justify-between">
                      <code className="text-purple-400 text-sm font-mono break-all">
                        {token.mintAddress}
                      </code>
                      <button
                        onClick={() => copyToClipboard(token.mintAddress)}
                        className="ml-2 p-1.5 hover:bg-[#2A303C] rounded-md transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={`https://explorer.solana.com/address/${token.mintAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Solana Explorer
                  </a>
                </div>
              </div>
            </GlowingCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default TokensPage;
