import React, { useEffect, useState } from "react";

const NFTCollection = ({ userPublicKey }) => {
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch NFTs from the backend, filtering by user's public key if provided
    const fetchNFTs = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/nfts${
            userPublicKey ? `?publicKey=${userPublicKey}` : ""
          }`
        );
        const data = await response.json();
        setNfts(data);
      } catch (err) {
        setError("Failed to load NFTs");
      }
    };

    fetchNFTs();
  }, [userPublicKey]);

  if (error) return <p>{error}</p>;

  return (
    <div>
      <h3>Your NFT Collection</h3>
      <div className="nft-collection">
        {nfts.map((nft) => (
          <div key={nft.mintAddress} className="nft-card">
            <img src={nft.uri} alt={nft.name} />
            <h4>{nft.name}</h4>
            <p>Symbol: {nft.symbol}</p>
            <p>Mint Address: {nft.mintAddress}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NFTCollection;
