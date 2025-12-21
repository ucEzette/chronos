"use client";

import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Loader2, ShoppingBag, Tag, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { formatEther } from 'viem';

export function ActivityHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 1. Get All Items from Contract
  const { data: items, isLoading: isLoadingItems } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  // 2. Fetch "My Purchases" via Blockchain Events
  useEffect(() => {
    if (!address || !publicClient) return;

    const fetchMyPurchases = async () => {
      setIsLoadingHistory(true);
      try {
        const currentBlock = await publicClient.getBlockNumber();
        
        // FIX: Use BigInt() wrapper instead of 'n' suffix
        const lookback = BigInt(100000);
        const zero = BigInt(0);
        
        const startBlock = currentBlock > lookback ? currentBlock - lookback : zero;

        const logs = await publicClient.getContractEvents({
           address: PAYLOCK_ADDRESS,
           abi: PAYLOCK_ABI,
           eventName: 'ItemPurchased',
           args: { buyer: address }, 
           // FIX: Use BigInt comparison
           fromBlock: startBlock === zero ? 'earliest' : startBlock
        });
        
        const ids = new Set(logs.map(l => l.args.id!.toString()));
        setPurchasedIds(ids);
      } catch (e) {
        console.error("Error fetching history:", e);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchMyPurchases();
  }, [address, publicClient]);

  if (isLoadingItems || isLoadingHistory) {
    return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;
  }

  const allItems = (items as any[]) || [];

  // FILTER 1: Things I Sold (I am the seller)
  const myListings = allItems.filter(i => i.seller.toLowerCase() === address?.toLowerCase());

  // FILTER 2: Things I Bought (ID matches my purchase events)
  const myPurchases = allItems.filter(i => purchasedIds.has(i.id.toString()));

  const hasHistory = myListings.length > 0 || myPurchases.length > 0;

  if (!hasHistory) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted opacity-50">
        <Clock size={48} className="mb-4" />
        <p>No activity found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      
      {/* SECTION: My Purchases */}
      {myPurchases.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShoppingBag size={16} className="text-green-400"/> Bought ({myPurchases.length})
          </h3>
          {myPurchases.map(item => (
            <div key={`bought-${item.id}`} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{item.name}</p>
                <p className="text-xs text-muted font-mono">Seller: {item.seller.slice(0,6)}...</p>
              </div>
              <div className="text-right">
                <span className="text-red-400 font-mono text-xs flex items-center gap-1 justify-end">
                   -{formatEther(item.price)} MOCK <ArrowUpRight size={12}/>
                </span>
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase font-bold">
                  Purchased
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION: My Sales */}
      {myListings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag size={16} className="text-blue-400"/> Sold / Listed ({myListings.length})
          </h3>
          {myListings.map(item => {
            const soldCount = Number(item.soldCount);
            const earnings = Number(formatEther(item.price)) * soldCount;
            
            return (
              <div key={`sold-${item.id}`} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-xs text-muted font-mono">Price: {formatEther(item.price)} MOCK</p>
                </div>
                <div className="text-right">
                  <span className="text-green-400 font-mono text-xs flex items-center gap-1 justify-end">
                     +{earnings.toFixed(4)} MOCK <ArrowDownLeft size={12}/>
                  </span>
                  <p className="text-[10px] text-muted">
                    {soldCount} / {Number(item.maxSupply)} units sold
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}