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
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { useLocation } from "react-router-dom";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import { tokenService } from "../lib/api";

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

interface TransferModalProps {
  token: TokenInfo;
  onClose: () => void;
  onConfirm: (toWallet: string, amount: string, tokenStandard: string) => Promise<void>;
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

const TransferModal: React.FC<TransferModalProps> = ({
  token,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [toWallet, setToWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenStandard, setTokenStandard] = useState("Token");

  const handleTransfer = async () => {
    if (!toWallet.trim() || !amount.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    if (amountNum > token.balance) {
      toast.error("Amount exceeds available balance");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(toWallet, amount, tokenStandard);
    } catch (error) {
      console.error("Error in transfer confirmation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1F242D] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Transfer Tokens</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#2A303C] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-[#2A303C] rounded-lg p-4 mb-6 space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Token</label>
            <p className="text-white font-medium">{token.name}</p>
            <p className="text-gray-400 text-sm">
              Balance: {token.balance.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              Recipient Address *
            </label>
            <input
              type="text"
              value={toWallet}
              onChange={(e) => setToWallet(e.target.value)}
              className="w-full bg-[#1F242D] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              placeholder="Enter recipient address"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">Amount *</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, "");
                setAmount(value);
              }}
              className="w-full bg-[#1F242D] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              placeholder="Enter amount"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              Token Standard
            </label>
            <select
              value={tokenStandard}
              onChange={(e) => setTokenStandard(e.target.value)}
              className="w-full bg-[#1F242D] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              disabled={loading}
            >
              <option value="Token">Token (SPL Token)</option>
              <option value="Token-2022">Token-2022</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#2A303C] text-gray-300 rounded-lg hover:bg-[#353D4B] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-500 text-white py-2 rounded-lg transition-all duration-200 hover:bg-purple-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const TokensPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenToDelete, setTokenToDelete] = useState<TokenInfo | null>(null);
  const [tokenToTransfer, setTokenToTransfer] = useState<TokenInfo | null>(null);
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
      // Use confirmed commitment for faster updates (finalized can take longer)
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      console.log("[TokensPage] Fetching token accounts for wallet:", publicKey.toString());

      // Get all token accounts for both Token and Token-2022 programs
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        ),
        connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_2022_PROGRAM_ID }
        ),
      ]);

      // Combine both token account lists
      const allTokenAccounts = [
        ...tokenAccounts.value,
        ...token2022Accounts.value,
      ];

      console.log("[TokensPage] Found token accounts:", {
        standard: tokenAccounts.value.length,
        token2022: token2022Accounts.value.length,
        total: allTokenAccounts.length,
      });

      // Fetch details for each token
      const tokenPromises = allTokenAccounts.map(async (tokenAccount) => {
        const parsedInfo = tokenAccount.account.data.parsed.info;
        const mintAddress = parsedInfo.mint;
        // Determine which program ID this token uses
        const programId = tokenAccount.account.owner.equals(TOKEN_2022_PROGRAM_ID)
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID;

        try {
          // Get mint info with the correct program ID
          const mintInfo = await getMint(
            connection,
            new PublicKey(mintAddress),
            "confirmed",
            programId
          );

          // Use the parsed balance from getParsedTokenAccountsByOwner
          // This is more reliable and faster than refetching
          const tokenAmount = parsedInfo.tokenAmount;
          const actualBalance = tokenAmount?.uiAmount ?? 0;
          const rawBalance = tokenAmount?.amount 
            ? BigInt(tokenAmount.amount)
            : BigInt(Math.floor(actualBalance * Math.pow(10, mintInfo.decimals)));

          console.log(`[TokensPage] Token ${mintAddress.slice(0, 8)}... balance:`, {
            raw: rawBalance.toString(),
            actual: actualBalance,
            decimals: mintInfo.decimals,
            programId: programId.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : "Token",
          });

          return {
            mintAddress,
            name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
            symbol: "TOKEN",
            balance: actualBalance,
            decimals: mintInfo.decimals,
          };
        } catch (error) {
          console.error(
            `[TokensPage] Error fetching details for token ${mintAddress.slice(0, 8)}...:`,
            error
          );
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

      console.log("[TokensPage] Final processed tokens:", sortedTokens.length, "tokens");
      if (sortedTokens.length > 0) {
        console.log("[TokensPage] Token details:", sortedTokens.map(t => ({
          mint: t.mintAddress.slice(0, 8) + "...",
          balance: t.balance,
          decimals: t.decimals
        })));
      }
      setTokens(sortedTokens);
    } catch (error) {
      console.error("[TokensPage] Error fetching tokens:", error);
      toast.error(`Failed to fetch tokens: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const toastId = toast.loading("Processing delete transaction...");

    try {
      // Validate mint address
      try {
        new PublicKey(token.mintAddress);
      } catch (error) {
        toast.error("Invalid mint address", { id: toastId });
        return;
      }

      const response = await tokenService.closeTokenAccount({
        mintAddress: token.mintAddress,
      });

      if (response.success) {
        toast.success(
          response.message || "Token account closed successfully!",
          { id: toastId }
        );
        await handleRefresh(); // Refresh the token list
      } else {
        throw new Error(response.message || "Failed to close token account");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage =
        error?.message || error?.error || "Failed to close token account";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setTokenToDelete(null); // Close the modal
    }
  };

  const handleTransferToken = async (
    toWallet: string,
    amount: string,
    tokenStandard: string
  ) => {
    if (!connected || !publicKey || !tokenToTransfer) {
      toast.error("Please connect your wallet first");
      return;
    }

    const toastId = toast.loading("Processing transfer...");

    try {
      // Validate addresses
      try {
        new PublicKey(toWallet);
        new PublicKey(tokenToTransfer.mintAddress);
      } catch (error) {
        toast.error("Invalid address format", { id: toastId });
        return;
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toast.error("Please enter a valid positive amount", { id: toastId });
        return;
      }

      if (amountNum > tokenToTransfer.balance) {
        toast.error("Amount exceeds available balance", { id: toastId });
        return;
      }

      const response = await tokenService.transferTokens({
        mintAddress: tokenToTransfer.mintAddress,
        toWallet: toWallet,
        amount: amount,
        tokenStandard: tokenStandard,
      });

      if (response.success) {
        toast.success(
          response.message || "Tokens transferred successfully!",
          { id: toastId }
        );
        setTokenToTransfer(null);
        await handleRefresh(); // Refresh the token list
      } else {
        throw new Error(response.message || "Failed to transfer tokens");
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      let errorMessage =
        error?.message || error?.error || "Failed to transfer tokens";
      
      // Add details if available (e.g., for InsufficientTokenBalanceError)
      if (error?.details) {
        const details = error.details;
        if (details.required && details.available) {
          errorMessage += ` (Required: ${details.required}, Available: ${details.available})`;
        }
      }
      
      toast.error(errorMessage, { id: toastId });
    }
  };

  // Refresh tokens when navigating from mint or burn page
  useEffect(() => {
    const fromMintPage = location.state?.fromMintPage;
    const fromBurn = location.state?.fromBurn;
    const refreshTimestamp = location.state?.refreshTimestamp;
    
    if ((fromMintPage || fromBurn) && connected && publicKey) {
      console.log("[TokensPage] Detected navigation from mint/burn page, refreshing tokens");
      // Add a delay to ensure blockchain state is updated
      // Longer delay for minting as it may take more time to propagate
      const delay = fromMintPage ? 5000 : 2000;
      
      // First refresh after initial delay
      setTimeout(() => {
        console.log("[TokensPage] First refresh after mint");
        handleRefresh();
      }, delay);
      
      // Second refresh after longer delay to catch finalized transactions
      if (fromMintPage) {
        setTimeout(() => {
          console.log("[TokensPage] Second refresh after mint (finalized check)");
          handleRefresh();
        }, delay + 5000);
      }
    }
  }, [location.state, connected, publicKey]);

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

                <div className="flex gap-2 pt-2">
                  {token.balance > 0 && (
                    <button
                      onClick={() => setTokenToTransfer(token)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-2 rounded-lg transition-all duration-200 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Send className="w-4 h-4" />
                      Transfer
                    </button>
                  )}
                  <a
                    href={`https://explorer.solana.com/address/${token.mintAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors px-3 py-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Explorer
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

      {tokenToTransfer && (
        <TransferModal
          token={tokenToTransfer}
          onClose={() => setTokenToTransfer(null)}
          onConfirm={handleTransferToken}
        />
      )}
    </div>
  );
};

export default TokensPage;
