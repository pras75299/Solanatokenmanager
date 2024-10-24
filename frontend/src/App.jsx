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
    </div>
  );
}

export default App;
