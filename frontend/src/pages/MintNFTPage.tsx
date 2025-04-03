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
  cloudinaryUrl: string | null;
  symbol: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface MintResponse {
  success: boolean;
  message?: string;
  data?: {
    mintAddress: string;
    txid?: string;
    nft?: {
      recipientPublicKey: string;
      mintAddress: string;
      uri: string;
      name: string;
      symbol: string;
    };
  };
  mintAddress?: string; // For backward compatibility
  txid?: string; // For backward compatibility
  error?: string;
}

const MintNFTPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    description: "",
    image: null,
    cloudinaryUrl: null,
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

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    try {
      const imageFormData = new FormData();
      const fileExtension = file.name.split(".").pop() || "png";
      const cleanFileName = `nft-image-${Date.now()}.${fileExtension}`;
      const cleanFile = new File([file], cleanFileName, { type: file.type });

      imageFormData.append("file", cleanFile);
      imageFormData.append("wallet", publicKey?.toString() || "unknown");

      const uploadResponse = await fetch(
        "https://solanatokenmanager.onrender.com/api/upload-image",
        {
          method: "POST",
          body: imageFormData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Server upload error response:", errorText);
        throw new Error(
          `Failed to upload image: Server responded with status ${uploadResponse.status}`
        );
      }

      const uploadData = await uploadResponse.json();

      if (!uploadData.success || !uploadData.imageUrl) {
        console.error("Invalid upload success response:", uploadData);
        throw new Error("Failed to get valid image URL from upload response");
      }
      if (!uploadData.imageUrl.includes("cloudinary.com")) {
        console.error(
          "Server returned a non-Cloudinary URL:",
          uploadData.imageUrl
        );
        throw new Error("Server returned an invalid image URL format");
      }

      return uploadData.imageUrl;
    } catch (error) {
      console.error("Error during uploadImageToCloudinary:", error);
      throw error;
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file");
        return;
      }

      try {
        setUploadingImage(true);
        const localPreview = URL.createObjectURL(file);
        setImagePreview(localPreview);

        const toastId = toast.loading("Uploading image...");
        const cloudinaryUrl = await uploadImageToCloudinary(file);

        setFormData({
          ...formData,
          image: file,
          cloudinaryUrl: cloudinaryUrl,
        });

        URL.revokeObjectURL(localPreview);
        setImagePreview(cloudinaryUrl);

        toast.success("Image uploaded successfully", { id: toastId });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload image"
        );
        setFormData({
          ...formData,
          image: null,
          cloudinaryUrl: null,
        });
        setImagePreview(null);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Image preview component
  const ImagePreview = () => {
    if (!imagePreview) return null;

    return (
      <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-4">
        <img
          src={imagePreview}
          alt="Preview"
          className="w-full h-full object-cover"
          onError={() => {
            // Fallback to Cloudinary URL if preview fails
            if (formData.cloudinaryUrl) {
              setImagePreview(formData.cloudinaryUrl);
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (imagePreview.startsWith("blob:")) {
              URL.revokeObjectURL(imagePreview);
            }
            setFormData({
              ...formData,
              image: null,
              cloudinaryUrl: null,
            });
            setImagePreview(null);
          }}
          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          aria-label="Remove image"
        >
          ×
        </button>
        {uploadingImage && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>
    );
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

    if (!formData.cloudinaryUrl) {
      toast.error("Image not yet uploaded or upload failed.");
      return;
    }

    const toastId = toast.loading("Preparing to mint NFT...");

    try {
      setLoading(true);
      setMintSuccess(false);
      setMintedNFT(null);

      const metadata = {
        name: formData.name.trim(),
        symbol: formData.symbol.trim().toUpperCase(),
        description: formData.description.trim(),
        uri: formData.cloudinaryUrl,
        image: formData.cloudinaryUrl,
        attributes: formData.attributes,
        properties: {
          files: [
            {
              uri: formData.cloudinaryUrl,
              type: formData.image?.type || "image/jpeg",
            },
          ],
          category: "image",
          creator: publicKey.toString(),
        },
      };

      toast.loading("Minting NFT...", { id: toastId });

      const mintResponse = await fetch(
        "https://solanatokenmanager.onrender.com/api/mint-nft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientPublicKey: publicKey.toString(),
            metadata: metadata,
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

      // Extract mint address from the response data
      let mintAddress;
      if (mintData.data?.mintAddress) {
        // If the response follows the new format
        mintAddress = mintData.data.mintAddress;
      } else if (mintData.message) {
        // Try to extract from message if it's in the old format
        const mintAddressMatch = mintData.message.match(
          /Mint Address: ([^\s,]+)/
        );
        if (mintAddressMatch) {
          mintAddress = mintAddressMatch[1];
        }
      }

      if (!mintAddress) {
        console.error(
          "Could not extract mint address from response:",
          mintData
        );
        throw new Error("Could not extract mint address from minting response");
      }

      // Store the mint response data
      setMintedNFT({
        mintAddress: mintAddress,
        txid: mintData.data?.txid || mintData.txid || "",
      });

      setMintSuccess(true);
      toast.success("NFT minted successfully!", { id: toastId });
    } catch (error) {
      console.error("NFT minting process error:", error);

      // Default error message
      let displayErrorMessage =
        "Failed to mint NFT due to an unexpected error.";

      // Use the specific error message from the backend if available
      if (error instanceof Error && error.message) {
        // Avoid displaying the confusing "NFT minted successfully" message as an error
        if (!error.message.includes("NFT minted successfully")) {
          displayErrorMessage = error.message;
        }
      }

      // Display the determined error message
      toast.error(displayErrorMessage, { id: toastId });
      setMintSuccess(false); // Ensure success state is false on error
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
      cloudinaryUrl: null,
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
                    <ImagePreview />
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
