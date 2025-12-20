"use client";

import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Loader2, ShoppingBag, Tag } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function ActivityHistory() {
  const { address } = useAccount();
  const { data: items, isLoading } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-muted" /></div>;

  const allItems = (items as any[]) || [];

  const history = allItems.filter(item => 
    item.seller.toLowerCase() === address?.toLowerCase() || 
    item.buyer.toLowerCase() === address?.toLowerCase()
  ).sort((a, b) => Number(b.id) - Number(a.id));

  if (history.length === 0) return <div className="text-center text-muted py-10">No history found.</div>;

  return (
    <div className="space-y-3">
      {history.map((item) => {
        const isSeller = item.seller.toLowerCase() === address?.toLowerCase();
        
        let statusLabel = "";
        let statusColor = "";
        
        if (!item.isSold) {
          statusLabel = "Listed (Active)";
          statusColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
        } else if (item.isSold && !item.isKeyDelivered) {
          statusLabel = "Sold (Pending Delivery)";
          statusColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        } else {
          statusLabel = "Completed";
          statusColor = "bg-green-500/10 text-green-500 border-green-500/20";
        }

        return (
          <div key={item.id} className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSeller ? 'bg-zinc-800 text-white' : 'bg-purple-500/10 text-purple-500'}`}>
                {isSeller ? <Tag size={18} /> : <ShoppingBag size={18} />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{item.name}</h4>
                <div className="flex gap-2 text-xs text-muted">
                  <span>{isSeller ? "You Listed" : "You Bought"}</span>
                  <span>•</span>
                  <span>{formatEther(item.price)} MOCK</span>
                </div>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
              {statusLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}