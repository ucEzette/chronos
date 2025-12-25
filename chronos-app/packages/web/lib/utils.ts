import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format Unix timestamp to readable date
export function formatDate(timestamp: bigint | number) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Fetch Real Crypto Prices (Fallback to static if API fails)
export async function getCryptoPrices() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd");
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return {
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      SOL: data.solana.usd,
      USDT: data.tether.usd
    };
  } catch (e) {
    // Fallback data if API limit reached
    return { BTC: 67432.10, ETH: 3541.22, SOL: 145.50, USDT: 1.00 }; 
  }
}

// Simulated IPFS Upload (Replace with Pinata/NFT.Storage in production)
export async function uploadToIPFS(file: File | Blob | string): Promise<string> {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Return a deterministic mock CID
      const mockCid = `Qm${Math.random().toString(36).substring(2, 15)}...MockHash`; 
      resolve(mockCid);
    }, 1500);
  });
}