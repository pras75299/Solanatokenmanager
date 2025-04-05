import { Link, useLocation } from "react-router-dom";
import { Wallet, Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <nav className="relative bg-[#0F1419] border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center flex-1">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-white font-semibold text-3xl">
              Token Manager
            </span>
          </Link>

          {/* Mobile Connect Wallet */}
          <div className="md:hidden ml-4">
            <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors" />
          </div>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLink to="/dashboard" label="Dashboard" />
          <NavLink to="/mint-token" label="Mint Token" />
          <NavLink to="/tokens" label="Tokens" />
          <NavLink to="/burn" label="Burn" />
          <NavLink to="/delegate" label="Delegate" />
          <NavLink to="/mint-nft" label="Mint NFT" />
          <NavLink to="/nft-collection" label="NFT Collection" />
        </div>

        {/* Desktop Connect Wallet */}
        <div className="hidden md:block ml-6">
          <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors" />
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-[#1A1F25] transition-colors"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile sidebar */}
        <div
          ref={sidebarRef}
          className={`fixed inset-y-0 right-0 transform ${
            isOpen ? "translate-x-0" : "translate-x-full"
          } w-64 bg-[#0F1419] border-l border-gray-800 p-6 space-y-6 transition-transform duration-200 ease-in-out md:hidden z-50`}
        >
          <div className="space-y-6">
            <MobileNavLink
              to="/dashboard"
              label="Dashboard"
              onClick={() => setIsOpen(false)}
            />
            <MobileNavLink
              to="/burn"
              label="Burn"
              onClick={() => setIsOpen(false)}
            />
            <MobileNavLink
              to="/delegate"
              label="Delegate"
              onClick={() => setIsOpen(false)}
            />
            <MobileNavLink
              to="/mint-token"
              label="Mint Token"
              onClick={() => setIsOpen(false)}
            />
            <MobileNavLink
              to="/tokens"
              label="Tokens"
              onClick={() => setIsOpen(false)}
            />
            <MobileNavLink
              to="/nft-collection"
              label="NFT Collection"
              onClick={() => setIsOpen(false)}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label }) {
  return (
    <Link to={to} className="text-gray-300 hover:text-white transition-colors">
      {label}
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block text-gray-300 hover:text-white transition-colors py-2"
    >
      {label}
    </Link>
  );
}
