# ONEROAD

<div align="center">
  <img src="public/oneroad-logo.jpg" alt="ONEROAD Logo" width="120" />
  
  **Decentralized Digital Marketplace for Encrypted File Trading**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)](https://soliditylang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  
  [Live Demo](https://oneroad.app) · [Documentation](#documentation) · [Report Bug](https://github.com/oneroad/issues)
</div>

---

## Overview

ONEROAD is a decentralized peer-to-peer marketplace for trading encrypted digital files on the blockchain. Sellers list encrypted content, buyers purchase with cryptocurrency, and decryption keys are automatically delivered through smart contracts.

### Key Features

- 🔐 **End-to-End Encryption** — AES-256 encryption for all files
- ⛓️ **Multi-Chain Support** — DataHaven Testnet & Arc Testnet
- 🛡️ **Smart Contract Escrow** — Funds held until key delivery
- 💰 **Instant Crypto Payments** — No middlemen, no delays
- 📊 **Admin Analytics** — Real-time platform metrics
- 🔔 **Notification System** — Real-time updates with Supabase
- 🎨 **Modern UI** — Glassmorphism design with dark mode

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | Tailwind CSS, CSS Variables |
| **Blockchain** | Wagmi v2, Viem, Solidity |
| **Storage** | IPFS (Filebase), DataHaven |
| **Real-time** | Supabase (optional) |
| **Icons** | Lucide React |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/oneroad.git
cd oneroad/chronos-app/packages/web

# Install dependencies
npm install

# Copy environment file
cp env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Configuration

### Environment Variables

Create a `.env.local` file with the following:

```env
# Storage Provider (mock | filebase | ocean)
NEXT_PUBLIC_STORAGE_PROVIDER=mock

# Filebase IPFS (for production)
FILEBASE_ACCESS_KEY=your_key
FILEBASE_SECRET_KEY=your_secret
FILEBASE_BUCKET=oneroad-files

# WalletConnect (required for mobile wallets)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Admin Dashboard Password
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password

# Supabase (optional - for real-time sync)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Smart Contracts

| Network | Contract Address |
|---------|-----------------|
| DataHaven Testnet | `0x9d660A95fbe0DA15f579f5c122961f6b5D813339` |
| Arc Testnet | `0xA6EE007309798c3cBEA7e317dec49f8EC76A151A` |

---

## Project Structure

```
packages/web/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin analytics dashboard
│   ├── create-listing/    # Create new listing
│   ├── dashboard/         # User dashboard
│   ├── item/[id]/         # Item details page
│   ├── marketplace/       # Marketplace browse
│   └── profile/[address]/ # User profiles
├── components/            # Reusable React components
├── lib/                   # Utilities and helpers
│   ├── contracts.ts       # Smart contract ABIs
│   ├── crypto.ts          # Encryption utilities
│   ├── favorites.ts       # Favorites system
│   └── reviews.ts         # Review system
└── public/               # Static assets
```

---

## Smart Contract Architecture

### PayLock Contract

The PayLock contract handles all marketplace interactions:

```solidity
// Core Functions
listItem(name, ipfsCid, previewCid, fileType, price, maxSupply)
buyItem(itemId)                    // Buyer purchases, funds escrowed
deliverKey(itemId, buyer, key)     // Seller releases decryption key
cancelListing(itemId)              // Cancel before any sales

// Admin Functions
setFee(newFee)                     // Set service fee (0-20%)
withdrawFees()                     // Withdraw accumulated fees
```

### Fee Structure

| Fee Type | Amount | Configurable |
|----------|--------|--------------|
| Listing Fee | **FREE** | N/A |
| Service Fee | **5%** | Yes (0-20% max) |

---

## Admin Dashboard

Access the admin dashboard at `/admin` to view:

- Total listings and active count
- Sales volume and revenue
- Unique sellers and buyers
- Chain-by-chain breakdown
- Recent transactions
- Fee configuration

**Default password:** `admin123` (change in production via `NEXT_PUBLIC_ADMIN_PASSWORD`)

---

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding a New Chain

1. Define chain in `lib/chains.ts`
2. Add contract address to `lib/contracts.ts`
3. Update `Providers.tsx` with new chain config

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Security Considerations

- ⚠️ Never expose private keys in client-side code
- ⚠️ Always use environment variables for sensitive data
- ⚠️ Change default admin password in production
- ⚠️ Enable Row Level Security (RLS) in Supabase
- ⚠️ Audit smart contracts before mainnet deployment

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- 📧 Email: support@oneroad.app
- 💬 Discord: [Join Server](https://discord.gg/oneroad)
- 🐦 Twitter: [@oneroad_app](https://twitter.com/oneroad_app)

---

<div align="center">
  <p>Built with ❤️ by the ONEROAD Team</p>
  <p>© 2024 ONEROAD Protocol. All rights reserved.</p>
</div>
