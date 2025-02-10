import React, { useState } from "react";
import { Info, HelpCircle } from "lucide-react";

export default function CreateTokenPage() {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [initialSupply, setInitialSupply] = useState("");

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="bg-[#0F1419] rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Create a new token
        </h1>
        <p className="text-gray-400 mb-6 flex items-start gap-2">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          You can create a new SPL token to represent an asset or currency. The
          supply of this token is fixed and cannot be changed.
        </p>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300">Token name</label>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </div>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Enter token name"
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300">Token symbol</label>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </div>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              placeholder="Enter token symbol"
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300">Initial supply</label>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </div>
            <input
              type="text"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              placeholder="Enter initial supply"
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="button"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Create token
          </button>
        </div>
      </div>
    </div>
  );
}
