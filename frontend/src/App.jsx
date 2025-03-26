import React, { useMemo, useEffect, useRef } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import MintNFTPage from "./pages/MintNFTPage";
import NFTCollectionPage from "./pages/NFTCollectionPage";
import WalletInfo from "./components/WalletInfo";
import ErrorBoundary from "./components/ErrorBoundary";

import DashboardPage from "./pages/DashboardPage";
import BurnPage from "./pages/BurnPage";
import DelegatePage from "./pages/DelegatePage";
import CreateTokenPage from "./pages/CreateTokenPage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { connected } = useWallet();

  if (!connected) {
    return <Navigate to="/" />;
  }

  return children;
};

// Wallet connection handler component
const WalletConnectionHandler = () => {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (connected && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/dashboard");
    }
  }, [connected, navigate]);

  return null;
};

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
                <WalletConnectionHandler />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 5000,
                    style: {
                      background: "#1A1F25",
                      color: "#fff",
                      border: "1px solid #2A303C",
                    },
                  }}
                />
                <ErrorBoundary>
                  <Navbar />
                </ErrorBoundary>
                <div className="container mx-auto px-4 py-8">
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route
                      path="/mint-nft"
                      element={
                        <ProtectedRoute>
                          <MintNFTPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/burn"
                      element={
                        <ProtectedRoute>
                          <BurnPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/delegate"
                      element={
                        <ProtectedRoute>
                          <DelegatePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/create-token"
                      element={
                        <ProtectedRoute>
                          <CreateTokenPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/nft-collection"
                      element={
                        <ProtectedRoute>
                          <NFTCollectionPage />
                        </ProtectedRoute>
                      }
                    />
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
