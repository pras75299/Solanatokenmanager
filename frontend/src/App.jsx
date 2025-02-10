import React, { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";

import Navbar from "./components/Navbar";
import MintNFT from "./components/MintNFT";
import NFTCollection from "./components/NFTCollection";
import WalletInfo from "./components/WalletInfo";
import ErrorBoundary from "./components/ErrorBoundary";

import DashboardPage from "./pages/DashboardPage";
import BurnPage from "./pages/BurnPage";
import DelegatePage from "./pages/DelegatePage";
import CreateTokenPage from "./pages/CreateTokenPage";

const App = () => {
  // Network setup
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Wallet setup
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Router>
              <div className="min-h-screen bg-[#0F1419]">
                <ErrorBoundary>
                  <Navbar />
                </ErrorBoundary>
                <div className="container mx-auto px-4 py-8">
                  DashboardPage
                  <Routes>
                    <Route path="/" element={<WalletInfo />} />
                    <Route path="/mint-nft" element={<MintNFT />} />
                    <Route path="/collection" element={<NFTCollection />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/burn" element={<BurnPage />} />
                    <Route path="/delegate" element={<DelegatePage />} />
                    <Route path="/create-token" element={<CreateTokenPage />} />
                  </Routes>
                </div>
              </div>
            </Router>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
};

export default App;
