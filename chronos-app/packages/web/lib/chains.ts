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

// ====== CHAIN INFO UTILITIES ======

export const CHAIN_INFO: Record<number, {
  name: string;
  shortName: string;
  symbol: string;
  color: string;
  bgClass: string;
}> = {
  55931: {
    name: "DataHaven Testnet",
    shortName: "DH",
    symbol: "MOCK",
    color: "cyan",
    bgClass: "bg-cyan-900/80 text-cyan-400 border-cyan-500/30"
  },
  5042002: {
    name: "Arc Testnet",
    shortName: "ARC",
    symbol: "USDC",
    color: "blue",
    bgClass: "bg-blue-900/80 text-blue-400 border-blue-500/30"
  },
  421614: {
    name: "Arbitrum Sepolia",
    shortName: "ARB",
    symbol: "ETH",
    color: "orange",
    bgClass: "bg-orange-900/80 text-orange-400 border-orange-500/30"
  }
};

export function getChainName(chainId: number): string {
  return CHAIN_INFO[chainId]?.name || `Chain ${chainId}`;
}

export function getChainShortName(chainId: number): string {
  return CHAIN_INFO[chainId]?.shortName || "??";
}

export function getChainSymbol(chainId: number): string {
  return CHAIN_INFO[chainId]?.symbol || "ETH";
}

export function getChainBadgeClass(chainId: number): string {
  return CHAIN_INFO[chainId]?.bgClass || "bg-gray-900/80 text-gray-400 border-gray-500/30";
}