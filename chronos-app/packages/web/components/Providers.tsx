"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, metaMask, safe } from "wagmi/connectors";
import { ReactNode } from "react";

// Define the DataHaven Testnet Chain
const datahavenTestnet = {
  id: 55931, // Replace with actual Chain ID if different (e.g., 55931)
  name: "DataHaven Testnet",
  nativeCurrency: { name: "MOCK", symbol: "MOCK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://services.datahaven-testnet.network/testnet"] }, // Replace with real RPC
  },
} as const;

// 1. Create Wagmi Config
const config = createConfig({
  chains: [datahavenTestnet, mainnet, sepolia],
  connectors: [injected(), metaMask(), safe()],
  transports: {
    [datahavenTestnet.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// 2. Create Query Client
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}