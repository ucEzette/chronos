"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { metaMask, injected, walletConnect } from "wagmi/connectors";
import { ReactNode } from "react";
import { type Chain } from "viem";
import { CartProvider } from "./CartContext";

// WalletConnect Project ID (get one at https://cloud.walletconnect.com/)
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

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

// 3. Configure Wagmi with BOTH Chains and Multiple Connectors
export const config = createConfig({
  chains: [datahaven, arcTestnet],
  connectors: [
    // Injected connector (detects browser wallet - Phantom, Rabby, etc.)
    injected({ shimDisconnect: true }),
    // MetaMask specific
    metaMask({ dappMetadata: { name: "CHRONOS" } }),
    // WalletConnect for mobile and other wallets
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: "CHRONOS",
        description: "Decentralized Digital Marketplace",
        url: "https://chronos.app",
        icons: ["https://chronos.app/chronos-logo.png"]
      }
    }),
  ],
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
        <CartProvider>
          {children}
        </CartProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}