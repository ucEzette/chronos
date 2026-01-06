"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent, usePublicClient, useReadContracts, useSignMessage } from "wagmi";
import { parseAbiItem, formatEther } from "viem";
import { Navigation } from "../../components/Navigation";
import { Footer } from "../../components/Footer"; // Import Footer
import { PAYLOCK_ABI, getContractAddress } from "../../lib/contracts"; 
import { signatureToKey } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { Terminal, Key, ShoppingBag, Plus, Archive, Coins, Shield, CheckCircle2, AlertCircle, X, Loader2, RefreshCw, Download, Clock, Ban, ArrowUpRight, ArrowDownLeft } from "lucide-react";

// --- Components ---
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn("fixed bottom-10 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-xl animate-in slide-in-from-right shadow-2xl", type === 'success' ? "bg-primary/10 border-primary/30 text-primary shadow-glow-primary" : "bg-red-500/10 border-red-500/30 text-red-400")}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <p className="text-sm font-bold font-mono uppercase tracking-wider">{message}</p>
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

// Helper for relative time
const formatTimeAgo = (timestamp: number | undefined) => {
  if (!timestamp) return "Pending...";
  const diff = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter(); 
  const { address, chain } = useAccount(); 
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Event State
  const [salesEvents, setSalesEvents] = useState<any[]>([]);
  const [deliveryEvents, setDeliveryEvents] = useState<any[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<any[]>([]);
  const [listingEvents, setListingEvents] = useState<any[]>([]);
  const [blockTimestamps, setBlockTimestamps] = useState<Record<string, number>>({});

  // Dynamic Contract Address
  const activeContract = getContractAddress(chain?.id);

  // 1. Read Current Items
  const { data: rawItems, refetch: refetchItems } = useReadContract({
    address: activeContract, 
    abi: PAYLOCK_ABI, 
    functionName: 'getMarketplaceItems',
  });
  const allItems = (rawItems as any[]) || [];

  const { data: ownershipData } = useReadContracts({
    contracts: allItems.map((item) => ({
      address: activeContract, 
      abi: PAYLOCK_ABI, 
      functionName: 'checkOwnership', 
      args: [item.id, address],
    })),
    query: { enabled: !!address && allItems.length > 0 }
  });

  useWatchContractEvent({ 
    address: activeContract, 
    abi: PAYLOCK_ABI, 
    eventName: 'ItemPurchased', 
    onLogs: () => { refetchItems(); fetchHistory(); } 
  });
  
  // 2. Fetch Comprehensive History & Timestamps
  const fetchHistory = async () => {
    if (!publicClient || !activeContract) return;
    setLoadingHistory(true);
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const BLOCK_RANGE = BigInt(5000); // 5k limit for Arc safety
      const fromBlock = (currentBlock - BLOCK_RANGE) > BigInt(0) ? (currentBlock - BLOCK_RANGE) : BigInt(0);
      
      const [pLogs, dLogs, cLogs, lLogs] = await Promise.all([
        publicClient.getLogs({ address: activeContract, event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'), fromBlock }),
        publicClient.getLogs({ address: activeContract, event: parseAbiItem('event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)'), fromBlock }),
        publicClient.getLogs({ address: activeContract, event: parseAbiItem('event ItemCanceled(uint256 indexed id, address indexed seller)'), fromBlock }),
        publicClient.getLogs({ address: activeContract, event: parseAbiItem('event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)'), fromBlock })
      ]);

      // Collect all unique block numbers to fetch timestamps efficiently
      const allBlockNumbers = new Set([
        ...pLogs.map(l => l.blockNumber),
        ...dLogs.map(l => l.blockNumber),
        ...cLogs.map(l => l.blockNumber),
        ...lLogs.map(l => l.blockNumber)
      ]);

      const timestampMap: Record<string, number> = {};
      await Promise.all(Array.from(allBlockNumbers).map(async (bn) => {
        try {
          const block = await publicClient.getBlock({ blockNumber: bn });
          timestampMap[bn.toString()] = Number(block.timestamp);
        } catch(e) { console.warn("Timestamp fetch failed", e); }
      }));

      setBlockTimestamps(timestampMap);
      setSalesEvents(pLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer, block: l.blockNumber })));
      setDeliveryEvents(dLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer, block: l.blockNumber })));
      setCancelledEvents(cLogs.map(l => ({ id: l.args.id?.toString(), block: l.blockNumber })));
      setListingEvents(lLogs.map(l => ({ id: l.args.id?.toString(), block: l.blockNumber })));

    } catch (e) {
      console.error("Error fetching history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { 
    if (publicClient && activeContract) { fetchHistory(); }
    setMounted(true); 
  }, [publicClient, activeContract, chain?.id]); 

  // 3. Unified Feed Logic (Includes ALL Types)
  const unifiedFeed = useMemo(() => {
    if (!address) return [];
    const feed: any[] = [];
    
    // Map items for easier lookup
    const itemMap = new Map(allItems.map(i => [i.id.toString(), i]));

    allItems.forEach((item: any, index: number) => {
      const itemId = item.id.toString();
      
      // -- SELLER PERSPECTIVE --
      if (item.seller.toLowerCase() === address.toLowerCase()) {
        
        // 1. Sold Events
        const itemSales = salesEvents.filter(s => s.id === itemId);
        itemSales.forEach(sale => {
          const isDelivered = deliveryEvents.some(d => d.id === itemId && d.buyer === sale.buyer);
          feed.push({ 
            ...item, 
            type: 'SALE', 
            buyer: sale.buyer, 
            isDelivered, 
            timestamp: blockTimestamps[sale.block?.toString()] 
          });
        });

        // 2. Listing Created Event (Only if not already sold out/cancelled to avoid dupes visually, or show all if desired)
        const creation = listingEvents.find(l => l.id === itemId);
        if (creation) {
           feed.push({ 
             ...item, 
             type: 'LISTED', 
             buyer: null, 
             timestamp: blockTimestamps[creation.block?.toString()] 
           });
        }

        // 3. Cancelled Events
        const cancellation = cancelledEvents.find(c => c.id === itemId);
        if (cancellation) {
          feed.push({
            ...item,
            type: 'CANCELED',
            buyer: null,
            timestamp: blockTimestamps[cancellation.block?.toString()]
          });
        }
      }

      // -- BUYER PERSPECTIVE --
      const ownership = ownershipData?.[index]?.result as [boolean, string] | undefined;
      // Also check sales events to get the timestamp of purchase
      const myPurchaseEvent = salesEvents.find(s => s.id === itemId && s.buyer.toLowerCase() === address.toLowerCase());
      
      if (ownership && ownership[0] === true) {
        feed.push({ 
          ...item, 
          type: 'BOUGHT', 
          buyer: address,
          timestamp: myPurchaseEvent ? blockTimestamps[myPurchaseEvent.block?.toString()] : undefined
        });
      }
    });

    // Sort by timestamp descending (newest first)
    return feed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [allItems, salesEvents, deliveryEvents, listingEvents, cancelledEvents, blockTimestamps, address, ownershipData]);

  // Stats Calculation
  const stats = useMemo(() => unifiedFeed.reduce((acc, item) => {
    if (item.type === 'SALE') { acc.sold++; acc.revenue += Number(formatEther(item.price || BigInt(0))); }
    if (item.type === 'BOUGHT') { acc.bought++; }
    return acc;
  }, { sold: 0, revenue: 0, bought: 0 }), [unifiedFeed]);

  const handleDeliver = async (item: any) => {
    try {
      setProcessingId(item.id.toString());
      // 1. Retrieve Key (Local -> Signature)
      const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
      let storedKey = localKeys[item.name.trim()];
      
      if (!storedKey) {
        const signature = await signMessageAsync({ message: `CHRONOS_ACCESS:${item.name.trim()}` });
        storedKey = signatureToKey(signature);
      }
      
      // 2. Deliver via Contract
      await writeContractAsync({ 
        address: activeContract, 
        abi: PAYLOCK_ABI, 
        functionName: 'deliverKey', 
        args: [BigInt(item.id), item.buyer, storedKey] as any 
      });
      
      setToast({message: "Key Transmitted Successfully!", type: 'success'});
      fetchHistory(); // Refresh feed
    } catch (e: any) { 
      setToast({message: e.message || "Delivery Failed", type: 'error'}); 
    } finally { 
      setProcessingId(null); 
    }
  };

  if (!mounted) return null;
  const currencySymbol = chain?.id === 5042002 ? "USDC" : "MOCK";

  return (
    <div className="min-h-screen bg-[#020e14] text-white font-display overflow-x-hidden">
      <Navigation />
      <main className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary/80 mb-1 tracking-widest uppercase"><Terminal size={14}/> Chronos_Link :: Active</div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">Dashboard <span className="text-primary/40 font-light">//</span> Activity</h2>
          </div>
          <button onClick={() => router.push('/create-listing')} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-black text-sm font-bold rounded-xl shadow-neon hover:scale-105 transition-all">
            <Plus size={18}/> Upload New File
          </button>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-primary/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-primary/10 text-primary"><Coins size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Revenue</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{stats.revenue.toFixed(2)} {currencySymbol}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-green-500/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-green-500/10 text-green-500"><Download size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Purchased</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{stats.bought}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-blue-500/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><ShoppingBag size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Total Sales</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{stats.sold}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-warning/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-warning/10 text-warning"><Key size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Pending</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{unifiedFeed.filter(i => i.type === 'SALE' && !i.isDelivered).length}</p>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-md shadow-2xl">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2"><Clock size={16}/> Recent Activity</h3>
            {loadingHistory && <Loader2 className="animate-spin text-primary" size={16}/>}
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-primary/5 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono">
                  <th className="py-4 px-6">Event / Item</th>
                  <th className="py-4 px-6 text-right">Value</th>
                  <th className="py-4 px-6 text-center">Date</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unifiedFeed.map((item, i) => {
                  const isSale = item.type === 'SALE';
                  const isBought = item.type === 'BOUGHT';
                  const isListed = item.type === 'LISTED';
                  const isCanceled = item.type === 'CANCELED';

                  return (
                    <tr key={`${item.type}-${i}`} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg border", 
                            isSale ? "bg-green-500/10 border-green-500/20 text-green-500" :
                            isBought ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                            isCanceled ? "bg-red-500/10 border-red-500/20 text-red-500" :
                            "bg-white/10 border-white/20 text-gray-400"
                          )}>
                            {isSale ? <ArrowDownLeft size={16}/> : isBought ? <ShoppingBag size={16}/> : isCanceled ? <Ban size={16}/> : <Plus size={16}/>}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{item.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono uppercase">{item.type} • ID #{item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-sm text-white">
                        {isSale || isBought ? (
                          <span className={isSale ? "text-green-400" : "text-red-400"}>
                            {isSale ? "+" : "-"}{formatEther(item.price)} {currencySymbol}
                          </span>
                        ) : <span className="text-gray-600">-</span>}
                      </td>
                      <td className="py-4 px-6 text-center text-xs text-gray-400 font-mono">
                        {formatTimeAgo(item.timestamp)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase", 
                          item.isDelivered ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                          item.type === 'CANCELED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          item.type === 'SALE' && !item.isDelivered ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : 
                          "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
                          {item.type === 'CANCELED' ? "Archived" : item.isDelivered ? "Completed" : item.type === 'SALE' ? "Pending Key" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {/* ACTIVE ACTION BUTTON */}
                        {isSale && !item.isDelivered && !item.isCanceled && (
                          <button 
                            onClick={() => handleDeliver(item)} 
                            disabled={!!processingId} 
                            className="bg-primary hover:bg-white text-black px-4 py-2 rounded-lg text-xs font-bold shadow-neon transition-all flex items-center justify-center gap-2 ml-auto hover:scale-105 active:scale-95"
                          >
                            {processingId === item.id.toString() ? <Loader2 className="animate-spin" size={14}/> : <Key size={14}/>} 
                            DELIVER KEY
                          </button>
                        )}
                        {isBought && item.hasKey && (
                           <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold border border-white/10 ml-auto flex gap-2 items-center">
                             <Download size={12}/> Download
                           </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {unifiedFeed.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-500 font-mono text-xs uppercase">No activity found on this chain.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer /> {/* Render Footer */}  
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}