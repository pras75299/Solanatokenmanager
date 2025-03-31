import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Loader2, Send, Info, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { useLocation } from "react-router-dom";

interface NFT {
  mintAddress: string;
  name: string;
  symbol: string;
  uri: string;
  description?: string;
}

const NFTCollectionPage = () => {
  const { publicKey, connected } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferAddress, setTransferAddress] = useState("");
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();

  const fetchNFTs = async () => {
    if (!connected || !publicKey) {
      setNfts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching NFTs for wallet:", publicKey.toString());

      // First, get the NFT mint addresses for the wallet
      const response = await fetch(
        `https://solanatokenmanager.onrender.com/api/nfts/${publicKey.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch NFTs. API response:", errorText);
        throw new Error("Failed to fetch NFTs");
      }

      const data = await response.json();
      console.log("NFT data from API:", data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("No NFTs found for this wallet");
        setNfts([]);
        setLoading(false);
        return;
      }

      // For each NFT, fetch its metadata
      const nftPromises = data.map(async (nftData: any) => {
        try {
          console.log("Fetching metadata for NFT:", nftData.mintAddress);
          const metadataResponse = await fetch(
            `https://solanatokenmanager.onrender.com/api/nft-metadata/${nftData.mintAddress}`
          );

          if (!metadataResponse.ok) {
            console.error(
              `Metadata fetch failed for ${nftData.mintAddress}:`,
              await metadataResponse.text()
            );
            throw new Error(
              `Failed to fetch metadata for NFT ${nftData.mintAddress}`
            );
          }

          const metadata = await metadataResponse.json();
          console.log("Received metadata:", metadata);

          return {
            mintAddress: nftData.mintAddress,
            name: metadata.name || "Unnamed NFT",
            symbol: metadata.symbol || "NFT",
            uri: metadata.image || "",
            description: metadata.description || "",
          };
        } catch (error) {
          console.error(
            `Error fetching metadata for NFT ${nftData.mintAddress}:`,
            error
          );
          return null;
        }
      });

      const nftResults = await Promise.all(nftPromises);
      const validNfts = nftResults.filter(
        (
          nft
        ): nft is {
          mintAddress: string;
          name: string;
          symbol: string;
          uri: string;
          description: string;
        } => nft !== null
      ) as NFT[];
      console.log("Valid NFTs after metadata fetch:", validNfts.length);
      setNfts(validNfts);
    } catch (error) {
      toast.error("Failed to load NFTs");
      console.error("Failed to load NFTs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, [publicKey, connected]);

  // Refresh NFTs when navigating from the mint page
  useEffect(() => {
    const fromMintPage = location.state?.fromMintPage;
    if (fromMintPage && connected && publicKey) {
      console.log("Detected navigation from mint page, refreshing NFTs");
      fetchNFTs();
    }
  }, [location]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNFTs();
    setRefreshing(false);
  };

  const handleTransfer = async () => {
    if (!selectedNFT || !transferAddress.trim()) {
      toast.error("Please select an NFT and enter a recipient address");
      return;
    }

    try {
      setIsTransferring(true);
      const response = await fetch(
        "https://solanatokenmanager.onrender.com/api/transfer-nft",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mintAddress: selectedNFT.mintAddress,
            recipientPublicKey: transferAddress,
          }),
        }
      );

      if (!response.ok) throw new Error("Transfer failed");

      const data = await response.json();
      toast.success(data.message || "NFT transferred successfully!");
      setSelectedNFT(null);
      setTransferAddress("");
      fetchNFTs(); // Refresh NFT list
    } catch (error) {
      toast.error("Failed to transfer NFT");
      console.error("Transfer error:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  // Add a function to handle metadata refresh for a specific NFT
  const handleNFTRefresh = async (mintAddress: string) => {
    try {
      const response = await fetch(
        `https://solanatokenmanager.onrender.com/api/refresh-metadata/${mintAddress}`
      );

      if (!response.ok) {
        throw new Error("Failed to refresh NFT metadata");
      }

      // Refetch all NFTs to get the updated data
      await fetchNFTs();
      toast.success("NFT metadata refreshed");
    } catch (error) {
      toast.error("Failed to refresh NFT metadata");
      console.error("Refresh error:", error);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <GlowingCard>
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              NFT Collection
            </h1>
            <p className="text-gray-400">
              Please connect your wallet to view your NFTs
            </p>
          </div>
        </GlowingCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">NFT Collection</h1>
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
      ) : nfts.length === 0 ? (
        <GlowingCard>
          <div className="text-center py-8">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No NFTs Found
            </h2>
            <p className="text-gray-400">
              You don't have any NFTs in your collection yet
            </p>
          </div>
        </GlowingCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <GlowingCard key={nft.mintAddress}>
              <div className="space-y-4">
                <div className="aspect-square rounded-lg overflow-hidden bg-[#2A303C] relative">
                  <img
                    src={nft.uri}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/400x400?text=NFT";
                    }}
                  />
                  <button
                    onClick={() => handleNFTRefresh(nft.mintAddress)}
                    className="absolute top-2 right-2 bg-gray-800/80 p-2 rounded-full hover:bg-gray-700/80 transition-colors"
                    title="Refresh metadata"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {nft.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">{nft.symbol}</p>
                  <p className="text-gray-500 text-xs break-all">
                    {nft.mintAddress}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedNFT(nft)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-2 rounded-lg transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                  Transfer
                </motion.button>
              </div>
            </GlowingCard>
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <GlowingCard className="w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-white">Transfer NFT</h2>
              <button
                onClick={() => setSelectedNFT(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300 text-sm">
                  Enter the recipient's Solana wallet address to transfer your
                  NFT. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Selected NFT</label>
                <div className="flex items-center gap-3 bg-[#2A303C] p-3 rounded-lg">
                  <img
                    src={selectedNFT.uri}
                    alt={selectedNFT.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/400x400?text=NFT";
                    }}
                  />
                  <div>
                    <p className="text-white font-medium">{selectedNFT.name}</p>
                    <p className="text-gray-400 text-sm">
                      {selectedNFT.symbol}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="Enter recipient's wallet address"
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTransfer}
                disabled={isTransferring || !transferAddress.trim()}
                className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 rounded-lg transition-all duration-200 ${
                  (isTransferring || !transferAddress.trim()) &&
                  "opacity-50 cursor-not-allowed"
                }`}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Confirm Transfer
                  </>
                )}
              </motion.button>
            </div>
          </GlowingCard>
        </div>
      )}
    </div>
  );
};

export default NFTCollectionPage;
