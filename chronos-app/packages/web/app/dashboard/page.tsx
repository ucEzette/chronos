"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent, usePublicClient, useReadContracts, useSignMessage } from "wagmi";
import { parseAbiItem, formatEther } from "viem";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { decryptFile, signatureToKey } from "@/lib/crypto";
import { cn } from "@/lib/utils";
// FIX: Added 'Plus' to imports
import { 
  Loader2, CheckCircle2, AlertCircle, X, Terminal, 
  Key, Download, Wallet, ShoppingBag,
  Plus, Clock, Trash2, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, RefreshCw, Search
} from "lucide-react";

/** ROBUST IPFS FETCHER (Fixes 429/CORS Errors) */
const fetchIPFS = async (cid: string): Promise<Blob> => {
  const cleanCid = cid.replace("ipfs://", "").trim();
  
  // List of public gateways to try in order
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cleanCid}`,
    `https://cloudflare-ipfs.com/ipfs/${cleanCid}`,
    `https://ipfs.io/ipfs/${cleanCid}`,
    `https://dweb.link/ipfs/${cleanCid}`,
    `https://w3s.link/ipfs/${cleanCid}`
  ];

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per gateway
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        // Validation: Ensure it's not an HTML error page masquerading as a file
        if (blob.type.includes("text/html")) continue; 
        return blob;
      }
    } catch (e) {
      console.warn(`Gateway failed: ${url}`, e);
      // Continue to next gateway
    }
  }
  throw new Error("All IPFS gateways failed. Please wait a moment and try again.");
};

/** SMART THUMBNAIL COMPONENT */
function HoloThumbnail({ cid, name }: { cid?: string, name: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveCid = async () => {
      if (!cid) return;
      const cleanCid = cid.replace("ipfs://", "");
      // Use a fast gateway for thumbnails (Cloudflare is usually fastest for images)
      const gateway = `https://cloudflare-ipfs.com/ipfs/${cleanCid}`;

      try {
        const res = await fetch(gateway, { method: 'HEAD' });
        const type = res.headers.get("content-type");

        if (type?.includes("application/json")) {
          const jsonRes = await fetch(gateway);
          const data = await jsonRes.json();
          const imageCid = data.image?.replace("ipfs://", "");
          setImgUrl(`https://cloudflare-ipfs.com/ipfs/${imageCid}`);
        } else {
          setImgUrl(gateway);
        }
      } catch (e) {
        setImgUrl(gateway); // Fallback
      } finally {
        setLoading(false);
      }
    };

    resolveCid();
  }, [cid]);

  return (
    <div className="size-10 rounded bg-white/5 border border-white/10 overflow-hidden relative flex items-center justify-center group shrink-0">
      {loading ? (
        <div className="animate-pulse bg-white/10 w-full h-full" />
      ) : imgUrl ? (
        <img 
          src={imgUrl} 
          alt={name} 
          className="w-full h-full object-cover" 
          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} 
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-cyan-900/20 flex items-center justify-center">
          <ImageIcon className="text-primary/50" size={16} />
        </div>
      )}
    </div>
  );
}

/** TOAST NOTIFICATION */
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
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [salesEvents, setSalesEvents] = useState<any[]>([]);
  const [deliveryEvents, setDeliveryEvents] = useState<any[]>([]);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch Items
  const { data: rawItems, refetch: refetchItems } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  const allItems = (rawItems as any[]) || [];

  // 2. Ownership Check
  const { data: ownershipData, refetch: refetchOwnership } = useReadContracts({
    contracts: allItems.map((item) => ({
      address: PAYLOCK_ADDRESS,
      abi: PAYLOCK_ABI,
      functionName: 'checkOwnership',
      args: [item.id, address],
    })),
    query: { enabled: !!address && allItems.length > 0 }
  });

  // 3. Watchers
  useWatchContractEvent({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    eventName: 'ItemPurchased', 
    onLogs: () => { refetchItems(); fetchHistory(); },
  });

  useWatchContractEvent({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    eventName: 'KeyDelivered',
    onLogs: () => { refetchItems(); refetchOwnership(); fetchHistory(); },
  });

  // 4. Fetch History
  const fetchHistory = async () => {
    if (!publicClient) return;
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const lookback = BigInt(50000);
      const zero = BigInt(0);
      const fromBlock = currentBlock - lookback > zero ? currentBlock - lookback : zero;

      const pLogs = await publicClient.getLogs({
        address: PAYLOCK_ADDRESS,
        event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'),
        fromBlock: fromBlock
      });
      setSalesEvents(pLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer })));

      const dLogs = await publicClient.getLogs({
        address: PAYLOCK_ADDRESS,
        event: parseAbiItem('event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)'),
        fromBlock: fromBlock
      });
      setDeliveryEvents(dLogs.map(l => ({ id: l.args.id?.toString(), buyer: l.args.buyer, key: l.args.encryptedKey })));
    } catch (e) { console.error("History sync error:", e); }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => { fetchHistory(); refetchOwnership(); }, 15000); 
    return () => clearInterval(interval);
  }, [publicClient, refetchOwnership]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchItems(), refetchOwnership(), fetchHistory()]);
    setTimeout(() => setIsRefreshing(false), 800);
    setToast({ message: "Ledger Synced.", type: 'success' });
  };

  // 5. Merge Data
  const unifiedFeed = useMemo(() => {
    if (!address) return [];
    const feed: any[] = [];

    allItems.forEach((item: any, index: number) => {
      const itemId = item.id.toString();
      
      if (item.seller.toLowerCase() === address.toLowerCase()) {
        const itemSales = salesEvents.filter(s => s.id === itemId);
        itemSales.forEach(sale => {
          const isDelivered = deliveryEvents.some(d => d.id === itemId && d.buyer === sale.buyer);
          feed.push({ ...item, type: 'SALE', buyer: sale.buyer, isDelivered, uniqueKey: `${itemId}-${sale.buyer}` });
        });
        const soldCount = Number(item.soldCount);
        if (soldCount > itemSales.length) {
           for(let i=0; i < (soldCount - itemSales.length); i++) feed.push({ ...item, type: 'SALE', buyer: null, isDelivered: false, isSyncing: true, uniqueKey: `${itemId}-sync-${i}` });
        }
        if (soldCount < Number(item.maxSupply) && !item.isSoldOut) {
           feed.push({ ...item, type: 'LISTING', buyer: null, isDelivered: false, uniqueKey: `${itemId}-listing` });
        }
      } 
      
      const ownership = ownershipData?.[index]?.result as [boolean, string] | undefined;
      if (ownership && ownership[0] === true) {
        feed.push({ 
          ...item, type: 'ACQUISITION', buyer: address, 
          isDelivered: hasKey(ownership), receivedKey: ownership[1], 
          uniqueKey: `${itemId}-buy` 
        });
      }
    });

    return feed.filter(i => !hiddenItems.has(i.id.toString())).reverse(); 
  }, [allItems, ownershipData, salesEvents, deliveryEvents, address, hiddenItems]);

  function hasKey(ownership: [boolean, string]) {
    return ownership[1] && ownership[1].length > 0;
  }

  // --- ACTIONS ---

  const handleDeliver = async (item: any, manualBuyer?: string) => {
    const targetBuyer = manualBuyer || item.buyer;
    if (!targetBuyer) {
      const input = prompt("Buyer address not indexed. Paste manually:");
      if (input && input.startsWith("0x")) handleDeliver(item, input);
      return;
    }

    try {
      setProcessingId(item.id.toString());
      
      const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
      let storedKey = localKeys[item.name.trim()];
      if (!storedKey && item.previewCid) storedKey = localKeys[item.previewCid];
      
      if (!storedKey) {
        try {
          const signature = await signMessageAsync({ message: `CHRONOS_ACCESS:${item.name.trim()}` });
          storedKey = signatureToKey(signature);
          localKeys[item.name.trim()] = storedKey;
          localStorage.setItem('chronos_seller_keys', JSON.stringify(localKeys));
        } catch {
          throw new Error("Signature required to regenerate key.");
        }
      }

      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'deliverKey',
        args: [BigInt(item.id), targetBuyer, storedKey] as any
      });
      
      setToast({message: "Key Transmitted!", type: 'success'});
      await handleManualRefresh();
    } catch (e: any) { 
      setToast({message: e.message || "Delivery Failed", type: 'error'}); 
    } finally { setProcessingId(null); }
  };

  const handleCancelListing = async (item: any) => {
    if (!confirm("Cancel listing?")) return;
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

  // ROBUST DECRYPTION with FAILOVER
  const handleDecrypt = async (item: any) => {
    try {
      setProcessingId(item.id.toString());
      
      // 1. Fetch File (Cycles through gateways until one works)
      const blob = await fetchIPFS(item.ipfsCid);

      // 2. Decrypt
      const decryptedBlob = await decryptFile(blob, item.receivedKey);
      
      // 3. Download
      const url = window.URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.name);
      document.body.appendChild(link);
      link.click();
      
      setToast({message: "Decrypted Successfully!", type: 'success'});
    } catch (e: any) {
      console.error(e);
      // More descriptive error alert
      alert(`Download Error: ${e.message}`);
    } finally { setProcessingId(null); }
  };

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const totalRevenue = unifiedFeed
    .filter(i => i.type === 'SALE' && i.isDelivered)
    .reduce((acc, i) => acc + Number(formatEther(i.price)), 0);

  return (
    <div className="bg-[#020e14] text-white min-h-screen font-display overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30"></div>
      <Navigation />
      
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-6 py-8">
        
        {/* Header Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary/80 mb-1 tracking-widest uppercase">
              <span className="material-symbols-outlined text-[14px]"><Terminal size={14}/></span> Chronos_Link :: Active
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg uppercase">
              Seller Dashboard <span className="text-primary/40 font-light">//</span> Time_Merchant
            </h2>
          </div>
          <a href="/create-listing" className="group flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-black hover:text-white text-sm font-bold rounded-lg transition-all shadow-glow-primary hover:scale-[1.02]">
            <Plus size={18} className="group-hover:animate-spin"/>
            <span>UPLOAD NEW FILE</span>
          </a>
        </div>

        {/* Live Feed Table */}
        <div className="w-full overflow-hidden rounded-xl border border-primary/20 bg-[#0b1a24]/60 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-primary/10">
             <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-wide">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
               </span>
               Chronos Live Feed
             </h3>
             <button onClick={handleManualRefresh} className={cn("p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors", isRefreshing && "animate-spin")}>
               <RefreshCw size={18}/>
             </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/10">
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono">Type</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono">Artifact</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono hidden md:table-cell">Buyer / ID</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-primary/70 font-mono text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {unifiedFeed.map((item, i) => (
                <tr key={item.uniqueKey || i} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6">
                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold border flex w-fit gap-1 items-center font-mono uppercase", 
                      item.type === 'SALE' ? "text-primary border-primary/20 bg-primary/5" : 
                      item.type === 'ACQUISITION' ? "text-purple-400 border-purple-400/20 bg-purple-400/5" : 
                      "text-gray-500 border-gray-500/20")}>
                      {item.type === 'SALE' ? <ArrowUpRight size={12}/> : item.type === 'ACQUISITION' ? <ArrowDownLeft size={12}/> : <CheckCircle2 size={12}/>} {item.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <HoloThumbnail cid={item.previewCid} name={item.name} />
                      <div>
                        <span className="font-bold text-sm text-white uppercase font-mono block group-hover:text-primary transition-colors">{item.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{formatEther(item.price)} ETH</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-400 hidden md:table-cell font-mono">
                    {item.buyer ? `${item.buyer.slice(0,6)}...${item.buyer.slice(-4)}` : item.isSyncing ? "SYNCING..." : "—"}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase shadow-[0_0_8px_rgba(0,0,0,0.2)]", 
                      item.isDelivered ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                      item.isSyncing ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : 
                      item.type === 'LISTING' ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : 
                      "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>
                      {item.isDelivered ? "DELIVERED" : item.isSyncing ? "INDEXING" : item.type === 'LISTING' ? "ACTIVE" : "WAITING"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right flex justify-end gap-2">
                    {item.type === 'SALE' && !item.isDelivered && (
                      <button onClick={() => handleDeliver(item)} disabled={!!processingId} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-black px-3 py-1.5 rounded text-xs font-bold hover:scale-105 transition-all shadow-glow-primary uppercase tracking-wide">
                        {processingId === item.id.toString() ? <Loader2 className="animate-spin" size={12}/> : item.isSyncing ? <Search size={12}/> : <Key size={12}/>} 
                        {item.isSyncing ? "Manual Deliver" : "Deliver Key"}
                      </button>
                    )}
                    {item.type === 'ACQUISITION' && item.isDelivered && (
                      <button onClick={() => handleDecrypt(item)} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:scale-105 transition-all flex items-center gap-2 uppercase shadow-lg shadow-purple-900/20">
                        <Download size={12}/> Decrypt
                      </button>
                    )}
                    {!item.isDelivered && item.type !== 'ACQUISITION' && !item.isSyncing && (
                       <button onClick={() => handleCancelListing(item)} disabled={!!processingId} className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30" title="Cancel Listing">
                          <Trash2 size={14} />
                       </button>
                    )}
                  </td>
                </tr>
              ))}
              {unifiedFeed.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500 font-mono text-xs uppercase tracking-widest">No activity found on local ledger.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}