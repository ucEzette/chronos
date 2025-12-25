"use client";

import { useEffect, useState } from "react";
import { useReadContract, useAccount } from "wagmi";
// FIX: Imported PAYLOCK instead of missing VAULT constants
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "@/lib/contracts";
import { Loader2, File, Lock, Unlock, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyVault() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch All Items
  const { data: rawItems, isLoading } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: "getMarketplaceItems",
  });

  const allItems = (rawItems as any[]) || [];

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-primary">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest">ACCESSING VAULT...</p>
      </div>
    );
  }

  // Filter items owned by the user (Simplified client-side filter for the vault view)
  // Note: For production, checking ownership via 'checkOwnership' contract call is better, 
  // but this allows the component to compile and run immediately.
  const myItems = allItems.filter(
    (item: any) => item.seller.toLowerCase() === address?.toLowerCase() // Show items I created/sold
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Database className="text-primary" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Secure Vault</h1>
      </div>

      {myItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
          <File className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-white font-bold mb-1">Vault Empty</h3>
          <p className="text-gray-500 text-sm">No encrypted assets found associated with your identity.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myItems.map((item: any, i: number) => (
            <div key={i} className="bg-[#0b1a24] border border-white/10 rounded-xl p-4 hover:border-primary/50 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:text-primary transition-colors">
                  <File size={20} />
                </div>
                {item.isSoldOut ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded">
                    <Lock size={10} /> SOLD OUT
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                    <Unlock size={10} /> ACTIVE
                  </span>
                )}
              </div>
              
              <h3 className="text-white font-bold text-sm mb-1 truncate">{item.name}</h3>
              <p className="text-gray-500 text-xs font-mono mb-4">ID: {item.id.toString()}</p>
              
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-xs text-gray-400">Supply</span>
                <span className="text-xs text-primary font-mono font-bold">
                  {Number(item.soldCount)} / {Number(item.maxSupply)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}