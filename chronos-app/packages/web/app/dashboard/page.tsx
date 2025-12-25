"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // Added Router
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent, usePublicClient, useReadContracts, useSignMessage } from "wagmi";
import { parseAbiItem, formatEther } from "viem";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { signatureToKey } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { 
  Terminal, Key, ShoppingBag, Plus, Archive, Coins, Shield, 
  CheckCircle2, AlertCircle, X, Loader2, RefreshCw, Download
} from "lucide-react";

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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter(); // Initialize Router
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [salesEvents, setSalesEvents] = useState<any[]>([]);
  const [deliveryEvents, setDeliveryEvents] = useState<any[]>([]);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());

  // 1. Reads
  const { data: rawItems, refetch: refetchItems } = useReadContract({
    address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: 'getMarketplaceItems',
  });
  const allItems = (rawItems as any[]) || [];

  const { data: ownershipData } = useReadContracts({
    contracts: allItems.map((item) => ({
      address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: 'checkOwnership', args: [item.id, address],
    })),
    query: { enabled: !!address && allItems.length > 0 }
  });

  useWatchContractEvent({ address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, eventName: 'ItemPurchased', onLogs: () => { refetchItems(); fetchHistory(); } });
  
  const fetchHistory = async () => {
    if (!publicClient) return;
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = (currentBlock - BigInt(50000)) > BigInt(0) ? (currentBlock - BigInt(50000)) : BigInt(0);
    const [pLogs, dLogs, cLogs] = await Promise.all([
      publicClient.getLogs({ address: PAYLOCK_ADDRESS, event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'), fromBlock }),
      publicClient.getLogs({ address: PAYLOCK_ADDRESS, event: parseAbiItem('event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)'), fromBlock }),
      publicClient.getLogs({ address: PAYLOCK_ADDRESS, event: parseAbiItem('event ItemCanceled(uint256 indexed id, address indexed seller)'), fromBlock })
    ]);
    setSalesEvents(pLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer })));
    setDeliveryEvents(dLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer })));
    setCancelledIds(new Set(cLogs.map(l => l.args.id?.toString() || "")));
  };

  useEffect(() => { fetchHistory(); setMounted(true); }, [publicClient]);

  // 2. Unified Feed
  const unifiedFeed = useMemo(() => {
    if (!address) return [];
    const feed: any[] = [];
    allItems.forEach((item: any, index: number) => {
      const itemId = item.id.toString();
      
      // SELLER LOGIC
      if (item.seller.toLowerCase() === address.toLowerCase()) {
        const itemSales = salesEvents.filter(s => s.id === itemId);
        itemSales.forEach(sale => {
          const isDelivered = deliveryEvents.some(d => d.id === itemId && d.buyer === sale.buyer);
          feed.push({ ...item, type: 'SALE', buyer: sale.buyer, isDelivered, isCancelled: cancelledIds.has(itemId) });
        });
        if ((Number(item.soldCount) < Number(item.maxSupply) && !item.isSoldOut)) {
           feed.push({ ...item, type: 'LISTING', buyer: null, isDelivered: false, isCancelled: cancelledIds.has(itemId) });
        }
      }

      // BUYER LOGIC (For 'Items Bought' tracking)
      const ownership = ownershipData?.[index]?.result as [boolean, string] | undefined;
      if (ownership && ownership[0] === true) {
        feed.push({ ...item, type: 'ACQUISITION', buyer: address });
      }
    });
    return feed.reverse();
  }, [allItems, salesEvents, deliveryEvents, address, cancelledIds, ownershipData]);

  const stats = useMemo(() => unifiedFeed.reduce((acc, item) => {
    if (item.isCancelled) return acc;
    if (item.type === 'SALE') { acc.sold++; acc.revenue += Number(formatEther(item.price || BigInt(0))); }
    if (item.type === 'ACQUISITION') { acc.bought++; }
    return acc;
  }, { sold: 0, revenue: 0, bought: 0 }), [unifiedFeed]);

  const handleDeliver = async (item: any) => {
    try {
      setProcessingId(item.id.toString());
      const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
      let storedKey = localKeys[item.name.trim()];
      if (!storedKey) {
        const signature = await signMessageAsync({ message: `CHRONOS_ACCESS:${item.name.trim()}` });
        storedKey = signatureToKey(signature);
      }
      await writeContractAsync({ address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: 'deliverKey', args: [BigInt(item.id), item.buyer, storedKey] as any });
      setToast({message: "Key Transmitted!", type: 'success'});
      fetchHistory();
    } catch (e: any) { setToast({message: e.message || "Failed", type: 'error'}); } finally { setProcessingId(null); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020e14] text-white font-display overflow-x-hidden">
      <Navigation />
      <main className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary/80 mb-1 tracking-widest uppercase"><Terminal size={14}/> Chronos_Link :: Active</div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">Seller Dashboard <span className="text-primary/40 font-light">//</span> Time_Merchant</h2>
          </div>
          
          {/* FIX: Router Push to Create Listing */}
          <button 
            onClick={() => router.push('/create-listing')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-black text-sm font-bold rounded-lg shadow-neon hover:scale-105 transition-all w-full md:w-auto justify-center"
          >
            <Plus size={18}/> Upload New File
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {/* Stats Cards */}
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-primary/10 text-primary"><Coins size={24}/></div><span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">+2.1%</span></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Total Sold Volume</p>
            <p className="text-3xl font-mono font-bold text-white mt-1 group-hover:text-primary transition-colors">{stats.revenue.toFixed(2)} MOCK</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-green-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-green-500/10 text-green-500"><Download size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Items Bought</p>
            <p className="text-3xl font-mono font-bold text-white mt-1 group-hover:text-green-500 transition-colors">{stats.bought}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-secondary/50 transition-all group">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-secondary/10 text-secondary"><ShoppingBag size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Files Sold</p>
            <p className="text-3xl font-mono font-bold text-white mt-1 group-hover:text-secondary transition-colors">{stats.sold}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-warning/50 transition-all group">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-warning/10 text-warning"><Key size={24}/></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Pending Keys</p>
            <p className="text-3xl font-mono font-bold text-white mt-1 group-hover:text-warning transition-colors">{unifiedFeed.filter(i => i.type === 'SALE' && !i.isDelivered).length}</p>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-primary/5 border-b border-white/10">
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono">Order ID</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono">Item Name</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono text-right">Price</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono text-center">Status</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unifiedFeed.map((item, i) => {
                  if (item.type === 'ACQUISITION') return null;
                  return (
                    <tr key={i} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 text-sm font-mono text-gray-500">#{item.id.toString().padStart(4, '0')}</td>
                      <td className="py-4 px-6 text-sm font-medium text-white group-hover:text-primary transition-colors">{item.name}</td>
                      <td className="py-4 px-6 text-sm font-mono font-bold text-white text-right">{formatEther(item.price)} MOCK</td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm", 
                          item.isDelivered ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                          item.isCancelled ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                          item.type === 'SALE' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-primary/10 text-primary border-primary/20")}>
                          {item.isCancelled ? "CANCELED" : item.isDelivered ? "DELIVERED" : item.type === 'SALE' ? "WAITING" : "LISTED"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!item.isDelivered && !item.isCancelled && item.type === 'SALE' && (
                          <button onClick={() => handleDeliver(item)} disabled={!!processingId} className="bg-primary hover:bg-white text-black px-4 py-1.5 rounded text-xs font-bold shadow-neon transition-all flex items-center justify-center gap-2 ml-auto">
                            {processingId === item.id.toString() ? <Loader2 className="animate-spin" size={14}/> : <Key size={14}/>} DELIVER
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}