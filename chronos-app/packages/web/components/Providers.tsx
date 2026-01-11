"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, createStorage, useReconnect } from "wagmi";
import { metaMask, injected, walletConnect } from "wagmi/connectors";
import { ReactNode, useEffect } from "react";
import { type Chain } from "viem";
import { CartProvider } from "./CartContext";
import { NotificationProvider } from "./NotificationContext";

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

// Create storage for persistence
const storage = createStorage({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'oneroad-wallet', // Unique key for this app
});

// 3. Configure Wagmi with BOTH Chains and Multiple Connectors
export const config = createConfig({
  chains: [datahaven, arcTestnet],
  connectors: [
    // Injected connector - DO NOT shimDisconnect to prevent unwanted disconnects
    injected({
      shimDisconnect: false, // CRITICAL: Prevents wallet from disconnecting on page reload
    }),
    // MetaMask specific
    metaMask({
      dappMetadata: { name: "ONEROAD" },
    }),
    // WalletConnect for mobile and other wallets
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: "ONEROAD",
        description: "Decentralized Digital Marketplace",
        url: "https://oneroad.app",
        icons: ["https://oneroad.app/oneroad-logo.jpg"]
      }
    }),
  ],
  transports: {
    // Reduce polling to prevent rate limiting (429 errors)
    [datahaven.id]: http(undefined, {
      batch: true,
      retryCount: 5,
      retryDelay: 1500,
    }),
    [arcTestnet.id]: http(undefined, {
      batch: true,
      retryCount: 5,
      retryDelay: 1500,
    }),
  },
  // Reduce polling frequency to prevent rate limiting
  pollingInterval: 30_000, // 30 seconds
  // Persist wallet connection
  storage,
  // SSR support
  ssr: true,
  // Sync connected chain with localStorage
  syncConnectedChain: true,
});

// Create a stable query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 5 * 60_000, // 5 minutes (was cacheTime in v4)
      retry: 2,
    },
  },
});

// Import NetworkGuard for auto network switching
import { NetworkGuard } from './NetworkGuard';

// Wallet reconnect component - uses hook inside WagmiProvider
function WalletReconnect({ children }: { children: ReactNode }) {
  const { reconnect } = useReconnect();

  useEffect(() => {
    // Attempt to reconnect on mount
    reconnect();
  }, [reconnect]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <WalletReconnect>
          <NotificationProvider>
            <CartProvider>
              <NetworkGuard>
                {children}
              </NetworkGuard>
            </CartProvider>
          </NotificationProvider>
        </WalletReconnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
}