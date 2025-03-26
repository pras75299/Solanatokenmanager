import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Loader2, Upload, Image as ImageIcon, Info } from "lucide-react";
import toast from "react-hot-toast";
import GlowingCard from "../components/GlowingCard";

interface FormData {
  name: string;
  description: string;
  image: File | null;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

const MintNFTPage: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    image: null,
    attributes: [],
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
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

    if (!formData.name || !formData.description || !formData.image) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // First, upload the image to get the URI
      const imageFormData = new FormData();
      imageFormData.append("image", formData.image);

      const uploadResponse = await fetch(
        "https://solanatokenmanager.onrender.com/api/upload-image",
        {
          method: "POST",
          body: imageFormData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const { imageUrl } = await uploadResponse.json();

      // Now mint the NFT with the image URL
      const mintResponse = await fetch(
        "https://solanatokenmanager.onrender.com/api/mint-nft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            image: imageUrl,
            attributes: formData.attributes,
            ownerPublicKey: publicKey.toString(),
          }),
        }
      );

      if (!mintResponse.ok) {
        throw new Error("Failed to mint NFT");
      }

      const mintData = await mintResponse.json();
      toast.success("NFT minted successfully!");

      // Reset form
      setFormData({ name: "", description: "", image: null, attributes: [] });
      setImagePreview(null);
    } catch (error) {
      console.error("Minting error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to mint NFT"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <GlowingCard>
        <h1 className="text-3xl font-bold text-white mb-6">Mint New NFT</h1>

        <div className="bg-[#2A303C] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
            <p className="text-gray-300">
              Create your unique NFT on the Solana blockchain. Upload an image,
              provide a name and description to mint your NFT.
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
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full bg-[#2A303C] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors min-h-[100px]"
              placeholder="Enter NFT description"
              disabled={loading}
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
      </GlowingCard>
    </div>
  );
};

export default MintNFTPage;
