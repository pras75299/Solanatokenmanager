import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl } from "@solana/web3.js";

function WalletInfo() {
  const { publicKey, disconnect } = useWallet();
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);
  const [mintMessage, setMintMessage] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [tokenStandard, setTokenStandard] = useState("Token");

  const connection = new Connection(clusterApiUrl("devnet"));

  useEffect(() => {
    if (publicKey) {
      connection
        .getBalance(publicKey)
        .then((lamports) => {
          setBalance(lamports / 1e9); // Convert lamports to SOL
        })
        .catch((err) => setError("Failed to fetch balance."));
    }
  }, [publicKey]);

  const handleMintToken = async () => {
    try {
      const response = await fetch(
        "https://solanatokenmanager.onrender.com/api/mint-token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientPublicKey: publicKey.toBase58(),
            tokenStandard,
          }),
        }
      );
      const data = await response.json();
      setMintMessage(data.message || "Minting successful!");
    } catch (err) {
      setMintMessage("Failed to mint token.");
    }
  };

  const handleTransferTokens = async () => {
    try {
      const response = await fetch(
        "https://solanatokenmanager.onrender.com/api/transfer-tokens",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toWallet: recipient,
            mintAddress: "GfqkZP1zLacfTxpdkcEgjvbmxSZJNHVuPZpvwjVJT3oL", // Replace with the actual mint address
            amount: parseFloat(transferAmount),
          }),
        }
      );
      const data = await response.json();
      setTransferMessage(data.message || "Transfer successful!");
    } catch (err) {
      setTransferMessage("Failed to transfer tokens.");
    }
  };

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!publicKey) {
    return <p>Connect your wallet to see balance and address.</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg">
        {/* Wallet Info */}
        <div className="space-y-4 text-center">
          <p className="text-gray-300 break-all">
            Wallet Address: {publicKey ? publicKey.toBase58() : "Not connected"}
          </p>
          <p className="text-gray-300">
            Balance: {balance !== null ? balance.toFixed(4) : "Loading..."} SOL
          </p>
          <button
            onClick={disconnect}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>

        {/* Token Standard Selection */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">
            Select Token Standard
          </h3>
          <select
            value={tokenStandard}
            onChange={(e) => setTokenStandard(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Token">Token</option>
            <option value="Token-2022">Token-2022</option>
          </select>
        </div>

        {/* Mint Token Section */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Mint Token</h3>
          <button
            onClick={handleMintToken}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Mint Token
          </button>
          {mintMessage && <p className="text-green-400">{mintMessage}</p>}
        </div>

        {/* Transfer Token Section */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Transfer Tokens</h3>
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Amount to Transfer"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTransferTokens}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Transfer Tokens
          </button>
          {transferMessage && (
            <p className="text-green-400">{transferMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WalletInfo;
