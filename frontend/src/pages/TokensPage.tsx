import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
  Coins,
  Flame,
  X,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { useLocation } from "react-router-dom";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  createBurnInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";

interface TokenInfo {
  mintAddress: string;
  name: string;
  symbol: string;
  balance: number;
  decimals: number;
}

interface DeleteModalProps {
  token: TokenInfo;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  token,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error in delete confirmation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1F242D] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Delete Token</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2A303C] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
          <p className="text-gray-300">
            Are you sure you want to delete {token.name} from your token list?
            This will close the token account. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#2A303C] text-gray-300 rounded-lg hover:bg-[#353D4B] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg transition-all duration-200 hover:bg-red-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const TokensPage: React.FC = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenToDelete, setTokenToDelete] = useState<TokenInfo | null>(null);
  const location = useLocation();

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

      // console.log("Fetching token accounts for wallet:", publicKey.toString());

      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      // console.log("Found token accounts:", tokenAccounts.value.length);

      // Fetch details for each token
      const tokenPromises = tokenAccounts.value.map(async (tokenAccount) => {
        const parsedInfo = tokenAccount.account.data.parsed.info;
        const mintAddress = parsedInfo.mint;

        try {
          // Get mint info first
          const mintInfo = await getMint(
            connection,
            new PublicKey(mintAddress)
          );

          // Get fresh token account data to ensure accurate balance
          const tokenAccountAddress = await getAssociatedTokenAddress(
            new PublicKey(mintAddress),
            publicKey
          );

          const freshTokenAccount = await getAccount(
            connection,
            tokenAccountAddress,
            "finalized" // Use finalized commitment for accurate balance
          );

          // Calculate actual balance considering decimals
          const rawBalance = Number(freshTokenAccount.amount);
          const actualBalance = rawBalance / Math.pow(10, mintInfo.decimals);

          // console.log(`Token ${mintAddress} balance:`, {
          //   raw: rawBalance,
          //   actual: actualBalance,
          //   decimals: mintInfo.decimals,
          // });

          return {
            mintAddress,
            name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
            symbol: "TOKEN",
            balance: actualBalance,
            decimals: mintInfo.decimals,
          };
        } catch (error) {
          // console.error(
          //   `Error fetching details for token ${mintAddress}:`,
          //   error
          // );
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is TokenInfo => token !== null
      );

      // Sort tokens: non-zero balances first, then zero balances
      const sortedTokens = validTokens.sort((a, b) => {
        if (a.balance === 0 && b.balance > 0) return 1;
        if (a.balance > 0 && b.balance === 0) return -1;
        return b.balance - a.balance; // Secondary sort by balance amount
      });

      //console.log("Final processed tokens:", sortedTokens);
      setTokens(sortedTokens);
    } catch (error) {
      //console.error("Error fetching tokens:", error);
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

  const handleDeleteToken = async (token: TokenInfo) => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    const toastId = toast.loading("Processing delete transaction...");

    try {
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );
      const mintPubkey = new PublicKey(token.mintAddress);

      // Get the associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPubkey,
        publicKey
      );

      // Verify token account exists and has zero balance
      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      const currentBalance = Number(tokenAccount.amount);

      if (currentBalance > 0) {
        toast.error("Cannot delete token with non-zero balance", {
          id: toastId,
        });
        return;
      }

      // Create close account instruction
      const closeInstruction = createCloseAccountInstruction(
        associatedTokenAddress, // account to close
        publicKey, // destination
        publicKey, // authority
        [] // multisig signers (empty array if not multisig)
      );

      // Create and send transaction
      const transaction = new Transaction().add(closeInstruction);
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
      toast.loading("Waiting for confirmation...", { id: toastId });
      const confirmation = await connection.confirmTransaction(
        signature,
        "finalized"
      );

      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      toast.success("Token deleted successfully!", { id: toastId });
      await handleRefresh(); // Refresh the token list
    } catch (error) {
      //console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete token", { id: toastId });
    } finally {
      setTokenToDelete(null); // Close the modal
    }
  };

  // Refresh tokens when navigating from burn page
  useEffect(() => {
    const fromBurn = location.state?.fromBurn;
    if (fromBurn && connected && publicKey) {
      //console.log("Detected navigation from burn page, refreshing tokens");
      // Add a small delay to ensure blockchain state is updated
      setTimeout(() => {
        handleRefresh();
      }, 2000);
    }
  }, [location.state]);

  // Initial fetch and wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      fetchTokens();
    }
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
                        <button
                          onClick={() => setTokenToDelete(token)}
                          className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
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

      {tokenToDelete && (
        <DeleteModal
          token={tokenToDelete}
          onClose={() => setTokenToDelete(null)}
          onConfirm={() => handleDeleteToken(tokenToDelete)}
        />
      )}
    </div>
  );
};

export default TokensPage;
