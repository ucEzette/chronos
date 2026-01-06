import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { datahaven, arcTestnet } from "../lib/chains"; 

export const config = getDefaultConfig({
  appName: "Chronos",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [
    datahaven,   // Chain ID 55931
    arcTestnet,  // Chain ID 5042002
  ],
  ssr: true,
});