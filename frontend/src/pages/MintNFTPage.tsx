import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Info,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";
import { useNavigate } from "react-router-dom";

interface FormData {
  name: string;
  description: string;
  image: File | null;
  symbol: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface MintResponse {
  success: boolean;
  message?: string;
  mintAddress?: string;
  txid?: string;
  error?: string;
}

const MintNFTPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    description: "",
    image: null,
    attributes: [],
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<{
    mintAddress: string;
    txid: string;
  } | null>(null);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name for your NFT");
      return false;
    }
    if (!formData.symbol.trim()) {
      toast.error("Please enter a symbol for your NFT");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a description for your NFT");
      return false;
    }
    if (!formData.image) {
      toast.error("Please upload an image for your NFT");
      return false;
    }
    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file");
        return;
      }

      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const toastId = toast.loading("Preparing to mint NFT...");

    try {
      setLoading(true);
      setMintSuccess(false);
      setMintedNFT(null);

      console.log(
        "Starting NFT mint process for wallet:",
        publicKey.toString()
      );

      // First, upload the image
      const imageFormData = new FormData();
      const imageFile = formData.image!;

      // Ensure the file name is clean and has the correct extension
      const fileExtension = imageFile.name.split(".").pop() || "png";
      const cleanFileName = `nft-image-${Date.now()}.${fileExtension}`;

      // Create a new File object with the clean name
      const cleanFile = new File([imageFile], cleanFileName, {
        type: imageFile.type,
      });

      imageFormData.append("file", cleanFile); // Changed from "image" to "file"
      imageFormData.append("wallet", publicKey.toString());

      console.log("Uploading image...", {
        fileName: cleanFileName,
        fileType: imageFile.type,
        fileSize: imageFile.size,
      });

      const uploadResponse = await fetch(
        "https://solanatokenmanager.onrender.com/api/upload-image",
        {
          method: "POST",
          body: imageFormData,
        }
      );

      let responseText;
      try {
        responseText = await uploadResponse.text();
        console.log("Upload response text:", responseText);
      } catch (e) {
        console.error("Failed to read response text:", e);
        throw new Error("Failed to read upload response");
      }

      if (!uploadResponse.ok) {
        let errorMessage = "Failed to upload image";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use the response text directly
          errorMessage =
            responseText || uploadResponse.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let imageUrl;
      try {
        const uploadData = JSON.parse(responseText);
        imageUrl = uploadData.imageUrl || uploadData.url;
        if (!imageUrl) {
          throw new Error("No image URL in response");
        }
        console.log("Image uploaded successfully:", imageUrl);
      } catch (e) {
        console.error("Failed to parse upload response:", e);
        throw new Error("Invalid upload response format");
      }

      toast.loading("Creating NFT metadata...", { id: toastId });

      // Prepare metadata
      const metadata = {
        name: formData.name.trim(),
        symbol: formData.symbol.trim().toUpperCase(),
        description: formData.description.trim(),
        image: imageUrl,
        attributes: formData.attributes,
        properties: {
          files: [
            {
              uri: imageUrl,
              type: imageFile.type,
            },
          ],
          category: "image",
          creator: publicKey.toString(),
        },
      };

      console.log("Minting NFT with metadata:", metadata);
      toast.loading("Minting NFT...", { id: toastId });

      // Mint the NFT
      const mintResponse = await fetch(
        "https://solanatokenmanager.onrender.com/api/mint-nft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...metadata,
            ownerPublicKey: publicKey.toString(),
          }),
        }
      );

      if (!mintResponse.ok) {
        const mintResponseText = await mintResponse.text();
        let errorMessage = "Failed to mint NFT";
        try {
          const errorData = JSON.parse(mintResponseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage =
            mintResponseText || mintResponse.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const mintData: MintResponse = await mintResponse.json();
      console.log("Mint response:", mintData);

      if (!mintData.success || !mintData.mintAddress) {
        throw new Error(mintData.message || "Failed to mint NFT");
      }

      // Store the mint response data
      setMintedNFT({
        mintAddress: mintData.mintAddress,
        txid: mintData.txid || "",
      });

      setMintSuccess(true);
      toast.success("NFT minted successfully!", { id: toastId });
    } catch (error) {
      console.error("NFT minting error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mint NFT",
        { id: toastId }
      );
      setMintSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      description: "",
      image: null,
      attributes: [],
    });
    setImagePreview(null);
    setMintSuccess(false);
    setMintedNFT(null);
  };

  const viewCollection = () => {
    navigate("/nft-collection", { state: { fromMintPage: true } });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard>
        <h1 className="text-3xl font-bold text-white mb-6">Mint New NFT</h1>

        {mintSuccess && mintedNFT ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                NFT Minted Successfully!
              </h2>
              <p className="text-gray-300 mb-4">
                Your NFT has been minted and will appear in your collection.
              </p>
              <div className="bg-[#2A303C] p-4 rounded-lg text-left mb-4">
                <div className="mb-2">
                  <label className="text-gray-400 text-sm">NFT Name</label>
                  <p className="text-white font-medium">{formData.name}</p>
                </div>
                <div className="mb-2">
                  <label className="text-gray-400 text-sm">Symbol</label>
                  <p className="text-white font-medium">{formData.symbol}</p>
                </div>
                <div className="mb-2">
                  <label className="text-gray-400 text-sm">Mint Address</label>
                  <p className="text-purple-400 font-mono text-sm break-all">
                    {mintedNFT.mintAddress}
                  </p>
                </div>
                {mintedNFT.txid && (
                  <div>
                    <label className="text-gray-400 text-sm">
                      Transaction ID
                    </label>
                    <p className="text-purple-400 font-mono text-sm break-all">
                      {mintedNFT.txid}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={viewCollection}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 rounded-lg"
                >
                  View Collection
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetForm}
                  className="flex-1 bg-[#2A303C] text-white font-medium py-3 rounded-lg"
                >
                  Mint Another
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <p className="text-gray-300">
                  Create your unique NFT on the Solana blockchain. Upload an
                  image, provide details, and mint your NFT.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Enter NFT name"
                  disabled={loading}
                  maxLength={32}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Symbol *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      symbol: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Enter NFT symbol (e.g., MYNFT)"
                  disabled={loading}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors min-h-[100px]"
                  placeholder="Enter NFT description"
                  disabled={loading}
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Image *</label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, image: null });
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                      <input
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                        id="nft-image"
                        disabled={loading}
                      />
                      <label
                        htmlFor="nft-image"
                        className="flex flex-col items-center cursor-pointer"
                      >
                        <ImageIcon className="w-12 h-12 text-gray-500 mb-4" />
                        <span className="text-gray-400">
                          Click to upload image (max 5MB)
                        </span>
                      </label>
                    </div>
                  )}
                </div>
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
                    Minting...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Mint NFT
                  </>
                )}
              </motion.button>

              {!connected && (
                <p className="text-center text-sm text-gray-400 mt-2">
                  Please connect your wallet to mint NFTs
                </p>
              )}
            </form>
          </>
        )}
      </GlowingCard>
    </div>
  );
};

export default MintNFTPage;
