// src/components/MintNFT.js
import React, { useState } from "react";

const MintNFT = () => {
  const [recipientPublicKey, setRecipientPublicKey] = useState("");
  const [uri, setUri] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [mintMessage, setMintMessage] = useState("");

  const handleMintNFT = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/mint-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPublicKey,
          metadata: {
            uri,
            name,
            symbol,
          },
        }),
      });

      const data = await response.json();
      setMintMessage(data.message || "Minting successful!");
    } catch (err) {
      setMintMessage("Failed to mint NFT.");
    }
  };

  return (
    <div>
      <h3>Mint an NFT</h3>
      <form onSubmit={handleMintNFT}>
        <div>
          <label>Recipient Public Key:</label>
          <input
            type="text"
            value={recipientPublicKey}
            onChange={(e) => setRecipientPublicKey(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Metadata URI:</label>
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Symbol:</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
          />
        </div>
        <button type="submit">Mint NFT</button>
      </form>
      {mintMessage && <p>{mintMessage}</p>}
    </div>
  );
};

export default MintNFT;
