# Solana Token Manager

A full-stack application for managing Solana NFTs, built with Next.js, TypeScript, and Node.js. This application allows users to mint, transfer, and manage NFTs on the Solana blockchain.

## Features

- 🎨 Mint new NFTs with custom metadata
- 💫 Transfer NFTs between wallets
- 🖼️ View NFT collections
- 🔄 Automatic token account creation
- 📊 Real-time transaction status
- 🎯 Solana wallet integration
- ☁️ Cloudinary image hosting

## Tech Stack

### Frontend

- React/Next.js with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Solana Wallet Adapter
- @solana/web3.js and @solana/spl-token for blockchain interactions

### Backend

- Node.js/Express
- MongoDB for data persistence
- Cloudinary for image storage
- Solana Web3.js for blockchain interactions

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js
- npm
- MongoDB
- Solana CLI tools (optional but recommended)
- A Solana wallet (Phantom, Solflare, etc.)

## Environment Setup

### Backend (.env)

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=your_rpc_url (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/solana-token-manager.git
   cd solana-token-manager
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install

   # Create .env file and add your environment variables

   # Start the server
   npm run dev
   ```

3. **Frontend Setup**

   ```bash
   cd frontend
   npm install

   # Start the development server
   npm run dev
   ```

## Project Structure

```
solana-token-manager/
├── backend/
│   ├── controllers/
│   │   └── nftController.js
│   ├── models/
│   │   └── NFT.js
│   ├── services/
│   │   └── solanaService.js
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   └── next.config.js
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/featureName`)
3. Commit your changes (`git commit -m 'Add some featureName'`)
4. Push to the branch (`git push origin feature/featureName`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the maintainers.

---

Made with ❤️ for the Solana community
