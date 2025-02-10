import React, { useState } from "react";
import { Info } from "lucide-react";

export default function BurnPage() {
  const [amount, setAmount] = useState("");

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="bg-[#0F1419] rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Burn</h1>
        <p className="text-gray-400 mb-6 flex items-start gap-2">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          You can burn your tokens to remove them from the blockchain. This
          action is permanent and can't be undone.
        </p>

        <div className="space-y-6">
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

          <button
            type="button"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Burn
          </button>
        </div>
      </div>
    </div>
  );
}
