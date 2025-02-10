import React, { useState } from "react";
import { Info } from "lucide-react";

export default function DelegatePage() {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("");

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="bg-[#0F1419] rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Delegate</h1>
        <p className="text-gray-400 mb-6 flex items-start gap-2">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          Delegate your tokens to another user or smart contract.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
            >
              <option value="">Select a token</option>
              <option value="sol">SOL</option>
              <option value="usdc">USDC</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Recipient wallet address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter recipient's address"
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Amount</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
