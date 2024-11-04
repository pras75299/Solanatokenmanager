import React, { useEffect, useState } from "react";

const NFTCollection = ({ userPublicKey }) => {
  const [nfts, setNfts] = useState([]);
  const [transferAddress, setTransferAddress] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [selectedMintAddress, setSelectedMintAddress] = useState(null);

  useEffect(() => {
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
        console.error("Failed to load NFTs");
      }
    };

    fetchNFTs();
  }, [userPublicKey]);

  const handleTransfer = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/transfer-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: selectedMintAddress,
          recipientPublicKey: transferAddress,
        }),
      });

      const data = await response.json();
      setTransferMessage(data.message || "Transfer successful!");
    } catch (err) {
      setTransferMessage("Failed to transfer NFT.");
    }
  };

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
            <button onClick={() => setSelectedMintAddress(nft.mintAddress)}>
              Transfer
            </button>
          </div>
        ))}
      </div>

      {selectedMintAddress && (
        <div className="transfer-form">
          <h4>Transfer NFT</h4>
          <input
            type="text"
            placeholder="Recipient Address"
            value={transferAddress}
            onChange={(e) => setTransferAddress(e.target.value)}
          />
          <button onClick={handleTransfer}>Confirm Transfer</button>
          {transferMessage && <p>{transferMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default NFTCollection;
