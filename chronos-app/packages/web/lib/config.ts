import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains' // Replace with DataHaven chain definition in production

export const dataHavenChain = {
  id: 6969, // Replace with real ID
  name: 'DataHaven Testnet',
  nativeCurrency: { name: 'HAVE', symbol: 'HAVE', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_DATAHAVEN_RPC_URL!] },
  },
} as const;

export const config = createConfig({
  chains: [dataHavenChain],
  transports: {
    [dataHavenChain.id]: http(),
  },
});