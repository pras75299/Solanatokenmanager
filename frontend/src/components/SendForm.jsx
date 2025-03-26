import React, { useState } from "react";

export default function SendForm() {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [usdValue, setUsdValue] = useState("0.00");

  return (
    <div className="bg-[#0F1419] rounded-lg p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Send</h2>
      <form className="space-y-6">
        <div>
          <label className="block text-gray-300 mb-2">
            Recipient's Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter an address"
            className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-gray-300 mb-2">USD Value</label>
            <input
              type="text"
              value={usdValue}
              onChange={(e) => setUsdValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#1A1F25] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <p className="text-gray-400 text-sm">
          Note: All transactions are final. Please double check the recipient's
          address before sending.
        </p>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Next
        </button>
      </form>
    </div>
  );
}
