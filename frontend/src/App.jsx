import React, { useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <header className="App-header">
              <h1>Solana Token Manager</h1>
              <WalletMultiButton />
              <WalletInfo />
            </header>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletInfo() {
  const { publicKey, disconnect } = useWallet();
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);
  const [mintMessage, setMintMessage] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

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
      const response = await fetch("http://localhost:5000/api/mint-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientPublicKey: publicKey.toBase58() }),
      });
      const data = await response.json();
      setMintMessage(data.message || "Minting successful!");
    } catch (err) {
      setMintMessage("Failed to mint token.");
    }
  };

  const handleTransferTokens = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/transfer-tokens",
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
    <div>
      <p>Wallet Address: {publicKey.toBase58()}</p>
      <p>Balance: {balance !== null ? balance.toFixed(4) : "Loading..."} SOL</p>
      <button onClick={disconnect}>Disconnect Wallet</button>

      {/* Mint Token Section */}
      <div>
        <h3>Mint Token</h3>
        <button onClick={handleMintToken}>Mint Token</button>
        {mintMessage && <p>{mintMessage}</p>}
      </div>

      {/* Transfer Token Section */}
      <div>
        <h3>Transfer Tokens</h3>
        <input
          type="text"
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount to Transfer"
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
        />
        <button onClick={handleTransferTokens}>Transfer Tokens</button>
        {transferMessage && <p>{transferMessage}</p>}
      </div>
    </div>
  );
}

export default App;
