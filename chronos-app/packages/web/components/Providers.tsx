"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { ReactNode } from "react";
import { type Chain } from "viem";

// 1. Define the DataHaven Testnet Chain
const datahaven = {
  id: 55931,
  name: 'DataHaven Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://services.datahaven-testnet.network/testnet'] },
  },
  blockExplorers: {
    default: { name: 'DHScan', url: 'https://testnet.dhscan.io/' },
  },
} as const satisfies Chain;

// 2. Configure Wagmi to use DataHaven
export const config = createConfig({
  chains: [datahaven], // Only allowing DataHaven ensures users connect to the right network
  connectors: [metaMask()],
  transports: {
    [datahaven.id]: http(),
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