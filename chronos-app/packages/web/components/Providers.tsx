"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { ReactNode } from "react";
import { type Chain } from "viem";

// 1. Define DataHaven Testnet Chain
const datahaven = {
  id: 55931,
  name: 'DataHaven Testnet',
  nativeCurrency: { name: 'MOCK Token', symbol: 'MOCK', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://services.datahaven-testnet.network/testnet'] },
    public: { http: ['https://services.datahaven-testnet.network/testnet'] },
  },
  blockExplorers: {
    default: { name: 'DHScan', url: 'https://testnet.dhscan.io/' },
  },
  testnet: true,
} as const satisfies Chain;

// 2. Define Arc Testnet Chain
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
} as const satisfies Chain;

// 3. Configure Wagmi with BOTH Chains
export const config = createConfig({
  chains: [datahaven, arcTestnet], // Add both chains here
  connectors: [metaMask()],
  transports: {
    [datahaven.id]: http(),
    [arcTestnet.id]: http(),
  },
  ssr: true,
});

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