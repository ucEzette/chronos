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
  },
  blockExplorers: {
    default: { name: "DHScan", url: "https://testnet.dhscan.io" },
  },
  testnet: true,
});

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});