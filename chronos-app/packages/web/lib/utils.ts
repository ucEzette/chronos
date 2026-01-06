import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format Unix timestamp to readable date
export function formatDate(timestamp: bigint | number) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Fetch Real Crypto Prices
export async function getCryptoPrices() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd");
    if (!res.ok) throw new Error("API Limit");
    const data = await res.json();
    return {
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      SOL: data.solana.usd,
      USDT: data.tether.usd
    };
  } catch (e) {
    // Fallback if API fails
    return { BTC: 64230.50, ETH: 3450.12, SOL: 148.00, USDT: 1.00 }; 
  }
}

// IPFS Upload Utility (Simulated for Demo Stability)
// In production, replace the setTimeout with a real fetch call to Pinata API
export async function uploadToIPFS(file: File | Blob | string): Promise<string> {
  return new Promise((resolve) => {
    console.log("Uploading to Decentralized Storage...");
    setTimeout(() => {
      // Deterministic mock hash for demo purposes
      const mockHash = `Qm${Math.random().toString(36).substring(2, 12)}SecureHash${Date.now()}`;
      resolve(mockHash);
    }, 2000);
  });
}