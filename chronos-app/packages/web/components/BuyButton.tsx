"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../lib/contracts";
import { Loader2, ShoppingCart } from "lucide-react";

export function BuyButton({ itemId, price }: { itemId: bigint, price: string }) {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    try {
      setLoading(true);
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [itemId],
        value: parseEther(price), // Sends ETH with the transaction
      });
      alert("Purchase successful! Wait for seller to deliver key.");
      window.location.reload(); // Refresh to update UI
    } catch (e) {
      console.error(e);
      alert("Purchase failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleBuy} 
      disabled={loading}
      className="flex items-center gap-2 bg-neon-lime text-black px-4 py-2 rounded font-bold text-xs uppercase hover:scale-105 transition-transform"
    >
      {loading ? <Loader2 className="animate-spin" size={14} /> : <ShoppingCart size={14} />}
      Buy Now
    </button>
  );
}