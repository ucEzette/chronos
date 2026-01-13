import { defineChain } from "viem";

export const datahaven = defineChain({
  id: 55931,
  name: "DataHaven",
  nativeCurrency: {
    decimals: 18,
    name: "MOCK",
    symbol: "MOCK",
  },
  rpcUrls: {
    default: { http: ["https://services.datahaven-testnet.network/testnet"] },
    public: { http: ["https://services.datahaven-testnet.network/testnet"] },
  },
  blockExplorers: {
    default: { name: "DHScan", url: "https://testnet.dhscan.io" },
  },
  testnet: true,
});

export const arcTestnet = defineChain({
  id: 5042002, // Verified Arc Chain ID
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC", // Verified Native Token
    symbol: "USDC",
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] }, // Verified RPC
    public: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" }, // Verified Explorer
  },
  testnet: true,
});

// Arbitrum Sepolia (Custom RPC to fix CORS)
export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://arbitrum-sepolia.publicnode.com"],
    },
    public: {
      http: ["https://arbitrum-sepolia.publicnode.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
});