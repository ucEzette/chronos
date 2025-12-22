"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent, usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { decryptFile } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { 
  Loader2, CheckCircle2, AlertCircle, X, Terminal, 
  Check, Key, Download, TrendingUp, Wallet, Package, ShoppingBag,
  Plus, Clock, Trash2, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, FileDigit, RefreshCw, ShoppingCart, Search
} from "lucide-react";

/** HOLO THUMBNAIL COMPONENT */
function HoloThumbnail({ cid, name }: { cid?: string, name: string }) {
  const [imgState, setImgState] = useState<'LOADING' | 'ERROR' | 'LOADED'>('LOADING');
  
  // Clean CID: Remove any accidental ipfs:// prefixes if present
  const cleanCid = cid?.replace("ipfs://", "") || "";
  const isMockCid = !cleanCid || cleanCid.includes("Hash") || cleanCid.includes("Test");
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cleanCid}`;

  if (isMockCid) {
    return (
      <div className="size-10 rounded bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 flex items-center justify-center relative overflow-hidden group">
        <span className="text-[8px] font-black text-primary/50 group-hover:hidden">MOCK</span>
        <ImageIcon className="text-white hidden group-hover:block" size={16} />
      </div>
    );
  }

  return (
    <div className="size-10 rounded bg-black/40 border border-white/10 overflow-hidden relative flex items-center justify-center">
      {imgState === 'LOADING' && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
      {imgState !== 'ERROR' && (
        <img 
          src={gatewayUrl}
          alt={name}
          className={cn("w-full h-full object-cover transition-opacity duration-500", imgState === 'LOADED' ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setImgState('LOADED')}
          onError={() => setImgState('ERROR')}
        />
      )}
      {imgState === 'ERROR' && <FileDigit size={16} className="text-red-400/50" />}
    </div>
  );
}

/** SYSTEM TOAST */
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn("fixed bottom-10 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-xl animate-in slide-in-from-right", type === 'success' ? "bg-neon-lime/10 border-neon-lime/30 text-neon-lime" : "bg-red-500/10 border-red-500/30 text-red-400")}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <p className="text-sm font-bold font-mono uppercase">{message}</p>
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  
  const [activeTab, setActiveTab] = useState<'feed' | 'settings'>('feed');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [salesEvents, setSalesEvents] = useState<any[]>([]);
  const [deliveryEvents, setDeliveryEvents] = useState<any[]>([]);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch Contract Items
  const { data: rawItems, refetch } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  // 2. Real-Time Events
  useWatchContractEvent({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    eventName: 'ItemPurchased', 
    onLogs: () => { console.log("New Sale!"); refetch(); fetchHistory(); },
  });

  useWatchContractEvent({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    eventName: 'KeyDelivered',
    onLogs: () => { console.log("Key Delivered!"); refetch(); fetchHistory(); },
  });

  // 3. Fetch Historical Logs
  const fetchHistory = async () => {
    if (!publicClient) return;
    try {
      const pLogs = await publicClient.getLogs({
        address: PAYLOCK_ADDRESS,
        event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'),
        fromBlock: 'earliest'
      });
      setSalesEvents(pLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer })));

      const dLogs = await publicClient.getLogs({
        address: PAYLOCK_ADDRESS,
        event: parseAbiItem('event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)'),
        fromBlock: 'earliest'
      });
      setDeliveryEvents(dLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer, key: l.args.encryptedKey })));
    } catch (e) { console.error("History sync error:", e); }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Sync every 10s
    return () => clearInterval(interval);
  }, [publicClient]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), fetchHistory()]);
    setTimeout(() => setIsRefreshing(false), 800);
    setToast({ message: "Dashboard updated.", type: 'success' });
  };

  // 4. MERGE DATA (The Core Logic Fix)
  const unifiedFeed = useMemo(() => {
    if (!rawItems || !address) return [];
    
    const feed: any[] = [];
    const items = rawItems as any[]; // Array of Contract Items

    items.forEach((item: any) => {
      const itemId = item.id.toString();
      
      // Filter logs relevant to this item
      const itemSales = salesEvents.filter(s => s.id === itemId);
      
      // --- SELLER LOGIC ---
      if (item.seller.toLowerCase() === address.toLowerCase()) {
        
        // A. Add Rows for CONFIRMED SALES
        itemSales.forEach(sale => {
          const isDelivered = deliveryEvents.some(d => d.id === itemId && d.buyer === sale.buyer);
          feed.push({ 
            ...item, 
            type: 'SALE', 
            buyer: sale.buyer, 
            isDelivered, 
            uniqueKey: `${itemId}-sale-${sale.buyer}` 
          });
        });

        // B. Add "Syncing" Rows (If soldCount > logs found)
        const knownSales = itemSales.length;
        const actualSold = Number(item.soldCount);
        if (actualSold > knownSales) {
           for(let i=0; i < (actualSold - knownSales); i++) {
             feed.push({ 
               ...item, 
               type: 'SALE', 
               buyer: null, // Unknown yet
               isDelivered: false, 
               isSyncing: true,
               uniqueKey: `${itemId}-sync-${i}` 
             });
           }
        }

        // C. Add UNSOLD Listing Row (If supply remains)
        if (Number(item.soldCount) < Number(item.maxSupply) && !item.isSoldOut) {
           feed.push({ 
             ...item, 
             type: 'LISTING', 
             buyer: null, 
             isDelivered: false,
             uniqueKey: `${itemId}-listing` 
           });
        }
      } 
      
      // --- BUYER LOGIC ---
      // Check if current user bought this item
      const myPurchase = itemSales.find(s => s.buyer.toLowerCase() === address.toLowerCase());
      
      // Fallback: Check contract state directly if logs failed (using soldCount is tricky for specific buyer, relying on logs is safer, but we can check if we have a key)
      const myDelivery = deliveryEvents.find(d => d.id === itemId && d.buyer.toLowerCase() === address.toLowerCase());

      if (myPurchase || myDelivery) {
        feed.push({ 
          ...item, 
          type: 'ACQUISITION', 
          buyer: address, 
          isDelivered: !!myDelivery, 
          receivedKey: myDelivery?.key,
          uniqueKey: `${itemId}-buy`
        });
      }
    });

    return feed.filter(i => !hiddenItems.has(i.id.toString())).reverse(); 
  }, [rawItems, salesEvents, deliveryEvents, address, hiddenItems]);

  const handleDeliver = async (item: any, manualBuyer?: string) => {
    const targetBuyer = manualBuyer || item.buyer;
    
    if (!targetBuyer) {
      const input = prompt("Buyer address not indexed yet. Paste buyer address to deliver immediately:");
      if (input && input.startsWith("0x")) handleDeliver(item, input);
      return;
    }

    try {
      setProcessingId(item.id.toString());
      
      // Get Key from Local Storage
      const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
      const storedKey = localKeys[item.name]; 
      
      if (!storedKey) {
        const manualKey = prompt(`Key for "${item.name}" not found locally. Paste Temporal Key:`);
        if (!manualKey) throw new Error("Key required");
      }

      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'deliverKey',
        args: [BigInt(item.id), targetBuyer, storedKey || localKeys[item.name]] as any
      });
      
      setToast({message: "Key sent!", type: 'success'});
      await handleManualRefresh();
    } catch (e) { 
      console.error(e); 
      setToast({message: "Delivery failed.", type: 'error'}); 
    } finally { setProcessingId(null); }
  };

  const handleCancelListing = async (item: any) => {
    if (!confirm("Cancel this listing?")) return;
    try {
      setProcessingId(`cancel-${item.id}`);
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'cancelListing',
        args: [BigInt(item.id)] as any,
      });
      setHiddenItems(prev => new Set(prev).add(item.id.toString()));
      setToast({ message: "Listing cancelled.", type: 'success' });
      await handleManualRefresh();
    } catch (e) {
      setToast({ message: "Cancellation failed.", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecrypt = async (item: any) => {
    try {
      setProcessingId(item.id.toString());
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`);
      const blob = await response.blob();
      const decryptedBlob = await decryptFile(blob, item.receivedKey);
      
      const url = window.URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.name);
      document.body.appendChild(link);
      link.click();
      setToast({message: "Decrypted!", type: 'success'});
    } catch (e) {
      alert("Decryption Error. Check key or file.");
    } finally { setProcessingId(null); }
  };

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="bg-[#020e14] text-white min-h-screen font-display">
      <Navigation />
      
      <main className="relative z-10 flex-1 w-full max-w-[1280px] mx-auto px-6 py-8">
        <div className="flex justify-between items-end mb-8 mt-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black uppercase tracking-tight">Command Center</h2>
            <button onClick={handleManualRefresh} className={cn("p-2 rounded-lg border border-white/10 hover:bg-white/5 text-primary", isRefreshing && "animate-spin")}><RefreshCw size={18}/></button>
          </div>
          <a href="/create-listing" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-teal-600 text-black font-black uppercase text-xs rounded-xl hover:scale-[1.02] transition-all"><Plus size={18}/> <span>Create_Listing</span></a>
        </div>

        <div className="rounded-xl border border-glass-border bg-glass-surface overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-primary/5 text-[10px] text-primary/70 uppercase tracking-widest border-b border-glass-border">
              <tr><th className="p-4">Type</th><th className="p-4">Artifact</th><th className="p-4">Counterparty</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {unifiedFeed.map((item, i) => (
                <tr key={item.uniqueKey || i} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold border flex w-fit gap-1 items-center font-mono", item.type === 'SALE' ? "text-primary border-primary/20 bg-primary/5" : item.type === 'ACQUISITION' ? "text-purple-400 border-purple-400/20 bg-purple-400/5" : "text-gray-500 border-gray-500/20")}>
                      {item.type === 'SALE' ? <ArrowUpRight size={12}/> : item.type === 'ACQUISITION' ? <ArrowDownLeft size={12}/> : <CheckCircle2 size={12}/>} {item.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Using direct previewCid from contract struct */}
                      <HoloThumbnail cid={item.previewCid} name={item.name} />
                      <span className="font-bold text-sm text-white uppercase font-mono">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-gray-400 tracking-wider">
                    {item.buyer ? `${item.buyer.slice(0,6)}...${item.buyer.slice(-4)}` : item.isSyncing ? "SYNCING..." : "—"}
                  </td>
                  <td className="p-4 text-center">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase", item.isDelivered ? "bg-neon-lime/10 text-neon-lime border-neon-lime/20" : item.isSyncing ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>
                      {item.isDelivered ? "COMPLETED" : item.isSyncing ? "INDEXING" : item.type === 'LISTING' ? "ACTIVE" : "PENDING"}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    {item.type === 'SALE' && !item.isDelivered && (
                      <button onClick={() => handleDeliver(item)} disabled={!!processingId} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-black px-3 py-1 rounded text-xs font-bold hover:scale-105 transition-all shadow-glow-primary">
                        {processingId === item.id.toString() ? <Loader2 className="animate-spin" size={12}/> : item.isSyncing ? <Search size={12}/> : <Key size={12}/>} 
                        {item.isSyncing ? "Manual Deliver" : "Deliver Key"}
                      </button>
                    )}
                    {item.type === 'ACQUISITION' && item.isDelivered && (
                      <button onClick={() => handleDecrypt(item)} className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold hover:scale-105 transition-all flex items-center gap-2">
                        <Download size={12}/> Decrypt
                      </button>
                    )}
                    
                    {!item.isDelivered && item.type !== 'ACQUISITION' && !item.isSyncing && (
                       <button onClick={() => handleCancelListing(item)} disabled={!!processingId} className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors" title="Cancel Listing">
                          <Trash2 size={14} />
                       </button>
                    )}
                  </td>
                </tr>
              ))}
              {unifiedFeed.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500 font-mono text-xs uppercase tracking-widest">No activity found.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}