"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useSignMessage, useSwitchChain } from "wagmi";
import { parseAbiItem, formatEther, createPublicClient, http } from "viem";
import { Navigation } from "../../components/Navigation";
import { Footer } from "../../components/Footer";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "../../lib/contracts"; // Updated import
import { signatureToKey, decryptFile } from "@/lib/crypto";
import { fetchIPFS } from "@/lib/ipfs";
import { getSellerSettings } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { datahaven, arcTestnet } from '@/lib/chains'; // Add these imports
import { arbitrumSepolia } from 'wagmi/chains'; // Add this import
import { Terminal, Key, ShoppingBag, Plus, Archive, Coins, Shield, CheckCircle2, AlertCircle, X, Loader2, RefreshCw, Download, Clock, Ban, ArrowUpRight, ArrowDownLeft, Trash2, Globe } from "lucide-react";

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

const formatTimeAgo = (timestamp: number | undefined) => {
  if (!timestamp || timestamp === 0) return "Pending...";

  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const diff = Math.floor((now - timestamp * 1000) / 1000);

  // Format date as dd/mm/yyyy
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  // Calculate relative time
  let relativeTime: string;
  if (diff < 60) {
    relativeTime = `${diff} seconds ago`;
  } else if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    relativeTime = `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    relativeTime = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diff / 86400);
    relativeTime = `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  return `${formattedDate} (${relativeTime})`;
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { address, chain: walletChain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Multi-Chain State
  const [unifiedItems, setUnifiedItems] = useState<any[]>([]);

  // 1. Fetch Multi-Chain Data
  const fetchMultiChainHistory = async () => {
    if (!address) return;
    setLoadingHistory(true);

    const chains = [datahaven, arcTestnet, arbitrumSepolia];
    const allEvents: any[] = [];

    await Promise.all(chains.map(async (chain) => {
      const contractAddr = CONTRACT_ADDRESSES[chain.id];
      if (!contractAddr) return;

      try {
        const client = createPublicClient({ chain, transport: http() });
        const currentBlock = await client.getBlockNumber();

        // 1. Fetch All Items on this chain
        let chainItems: any[] = [];
        try {
          chainItems = await client.readContract({
            address: contractAddr,
            abi: PAYLOCK_ABI,
            functionName: 'getMarketplaceItems',
          }) as any[];
        } catch (e) {
          console.warn(`Failed to fetch items from ${chain.name}`, e);
          return;
        }

        // 2. Scan Logs for history
        const SCAN_DEPTH = BigInt(100000);
        const CHUNK_SIZE = BigInt(5000);
        let fromBlock = currentBlock - SCAN_DEPTH > BigInt(0) ? currentBlock - SCAN_DEPTH : BigInt(0);

        const fetchLogsInChunks = async (eventName: string) => {
          let logs: any[] = [];
          for (let i = fromBlock; i < currentBlock; i += CHUNK_SIZE) {
            const to = (i + CHUNK_SIZE) > currentBlock ? currentBlock : (i + CHUNK_SIZE);
            try {
              const chunk = await client.getLogs({
                address: contractAddr,
                event: parseAbiItem(eventName) as any,
                fromBlock: i,
                toBlock: to
              });
              logs = [...logs, ...chunk];
            } catch (e) { }
          }
          return logs;
        };

        const [pLogs, dLogs, cLogs, lLogs] = await Promise.all([
          fetchLogsInChunks('event ItemPurchased(uint256 indexed id, address indexed buyer)'),
          fetchLogsInChunks('event KeyDelivered(uint256 indexed id, address indexed buyer, string encryptedKey)'),
          fetchLogsInChunks('event ItemCanceled(uint256 indexed id, address indexed seller)'),
          fetchLogsInChunks('event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)')
        ]);

        // 3. Batch fetch timestamps
        const relevantBlocks = new Set([
          ...pLogs.map(l => l.blockNumber),
          ...dLogs.map(l => l.blockNumber),
          ...cLogs.map(l => l.blockNumber),
          ...lLogs.map(l => l.blockNumber)
        ]);
        const blockTimestamps: Record<string, number> = {};
        const uniqueBlocks = Array.from(relevantBlocks);

        const BATCH_SIZE = 10;
        for (let i = 0; i < uniqueBlocks.length; i += BATCH_SIZE) {
          const batch = uniqueBlocks.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (bn) => {
            try {
              const block = await client.getBlock({ blockNumber: bn });
              if (block && block.timestamp) blockTimestamps[bn.toString()] = Number(block.timestamp);
            } catch { }
          }));
        }

        // 4. Process Items for Feed
        for (const item of chainItems) {
          const itemId = item.id.toString();
          const isMyListing = item.seller.toLowerCase() === address.toLowerCase();

          // Check Ownership (for purchases)
          let isMyPurchase = false;
          let myKey = "";
          if (!isMyListing) { // Optimize: don't check ownership if I'm the seller (usually) - actually I can buy my own stuff for testing
            try {
              const [bought, key] = await client.readContract({
                address: contractAddr,
                abi: PAYLOCK_ABI,
                functionName: 'checkOwnership',
                args: [item.id, address]
              }) as [boolean, string];
              isMyPurchase = bought;
              myKey = key;
            } catch { }
          }

          const currency = chain.id === 5042002 ? "USDC" : chain.id === 421614 ? "ETH" : "MOCK";

          // Event: I SOLD something
          if (isMyListing) {
            const sales = pLogs.filter((l: any) => l.args.id.toString() === itemId);
            sales.forEach((sale: any) => {
              const isDelivered = dLogs.some((d: any) => d.args.id.toString() === itemId && d.args.buyer === sale.args.buyer);
              const timestamp = blockTimestamps[sale.blockNumber.toString()];
              allEvents.push({
                ...item,
                uniqueId: `${chain.id}-${itemId}-SALE-${sale.args.buyer}`,
                type: 'SALE',
                buyer: sale.args.buyer,
                isDelivered,
                timestamp,
                chainId: chain.id,
                chainName: chain.name,
                currency
              });
            });

            const isCanceled = !item.isActive;
            // Only show 'Listed' event if active and not sold out? Or just show latest status
            // Let's show "Listed" or "Archived" entry
            const listingLog = lLogs.find((l: any) => l.args.id.toString() === itemId);
            const listTime = listingLog ? blockTimestamps[listingLog.blockNumber.toString()] : 0;

            // If I listed it, show it
            allEvents.push({
              ...item,
              uniqueId: `${chain.id}-${itemId}-LISTING`,
              type: isCanceled ? 'CANCELED' : 'LISTED',
              buyer: null,
              isCanceled,
              timestamp: listTime,
              chainId: chain.id,
              chainName: chain.name,
              currency
            });
          }

          // Event: I BOUGHT something
          if (isMyPurchase) {
            const purchaseLog = pLogs.find((l: any) => l.args.id.toString() === itemId && l.args.buyer.toLowerCase() === address.toLowerCase());
            const timestamp = purchaseLog ? blockTimestamps[purchaseLog.blockNumber.toString()] : 0;
            allEvents.push({
              ...item,
              uniqueId: `${chain.id}-${itemId}-BOUGHT`,
              type: 'BOUGHT',
              buyer: address,
              hasKey: !!(myKey && myKey.length > 0),
              receivedKey: myKey,
              timestamp,
              chainId: chain.id,
              chainName: chain.name,
              currency
            });
          }
        }

      } catch (e) {
        console.error(`Error processing chain ${chain.name}`, e);
      }
    }));

    setUnifiedItems(allEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchMultiChainHistory();
    const interval = setInterval(fetchMultiChainHistory, 15000); // Poll every 15s
    setMounted(true);
    return () => clearInterval(interval);
  }, [address]);


  const stats = useMemo(() => unifiedItems.reduce((acc, item) => {
    if (item.type === 'SALE') { acc.sold++; acc.revenue += Number(formatEther(item.price || BigInt(0))); }
    if (item.type === 'BOUGHT') { acc.bought++; }
    return acc;
  }, { sold: 0, revenue: 0, bought: 0 }), [unifiedItems]);

  // Handlers
  const handleDeliver = async (item: any) => {
    try {
      if (walletChain?.id !== item.chainId) {
        await switchChainAsync({ chainId: item.chainId });
      }

      setProcessingId(item.uniqueId);
      const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
      let storedKey = localKeys[item.name.trim()];

      if (!storedKey) {
        const signature = await signMessageAsync({ message: `ONEROAD_ACCESS:${item.name.trim()}` });
        storedKey = signatureToKey(signature);
      }

      const contractAddr = CONTRACT_ADDRESSES[item.chainId];

      await writeContractAsync({
        address: contractAddr,
        abi: PAYLOCK_ABI,
        functionName: 'deliverKey',
        args: [BigInt(item.id), item.buyer, storedKey] as any,
        chainId: item.chainId
      });

      setToast({ message: "Key Transmitted Successfully!", type: 'success' });
      // Short delay to let indexer/poll catch up usually, or just optimistic update?
      // For now just wait for poll
    } catch (e: any) {
      setToast({ message: e.message || "Delivery Failed", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownload = async (item: any) => {
    if (!item.hasKey) return;
    try {
      setDownloadingId(item.uniqueId);
      setToast({ message: "Fetching & Decrypting...", type: 'success' });

      const encryptedBlob = await fetchIPFS(item.ipfsCid);
      const decryptedBlob = await decryptFile(encryptedBlob, item.receivedKey);

      const url = window.URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${item.name.replace(/\s+/g, '_')}_UNLOCKED.${item.fileType?.toLowerCase() || 'dat'}`);
      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      setToast({ message: "Download Complete", type: 'success' });
    } catch (e: any) {
      setToast({ message: "Download Failed: " + e.message, type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancel = async (item: any) => {
    if (!confirm("Cancel listing?")) return;
    try {
      if (walletChain?.id !== item.chainId) {
        await switchChainAsync({ chainId: item.chainId });
      }

      setProcessingId(item.uniqueId);
      const contractAddr = CONTRACT_ADDRESSES[item.chainId];

      await writeContractAsync({
        address: contractAddr,
        abi: PAYLOCK_ABI,
        functionName: 'cancelListing',
        args: [BigInt(item.id)],
        chainId: item.chainId
      });
      setToast({ message: "Listing Cancelled!", type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || "Cancel Failed", type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020e14] text-white font-display overflow-x-hidden flex flex-col">
      <Navigation />
      <main className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 flex-1 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-primary/80 mb-1 tracking-widest uppercase"><Terminal size={14} /> Chronos_Link :: Active</div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">Dashboard <span className="text-primary/40 font-light">//</span> Activity</h2>
          </div>
          <button onClick={() => router.push('/create-listing')} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-black text-sm font-bold rounded-xl shadow-neon hover:scale-105 transition-all">
            <Plus size={18} /> Upload New File
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {/* Stats Cards (Aggregated) */}
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-primary/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-primary/10 text-primary"><Coins size={24} /></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Est. Revenue</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">~{stats.revenue.toFixed(2)}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-green-500/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-green-500/10 text-green-500"><Download size={24} /></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Purchased</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{stats.bought}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-blue-500/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><ShoppingBag size={24} /></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Total Sales</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{stats.sold}</p>
          </div>
          <div className="bg-[#0b1a24]/60 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:border-warning/50 transition-all">
            <div className="flex justify-between items-start mb-4"><div className="p-2 rounded-lg bg-warning/10 text-warning"><Key size={24} /></div></div>
            <p className="text-gray-400 text-sm font-medium uppercase">Pending</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold text-white mt-1">{unifiedItems.filter(i => i.type === 'SALE' && !i.isDelivered).length}</p>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-md shadow-2xl">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2"><Clock size={16} /> Recent Activity</h3>
            {loadingHistory && <Loader2 className="animate-spin text-primary" size={16} />}
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
                {unifiedItems.map((item, i) => {
                  const isSale = item.type === 'SALE';
                  const isBought = item.type === 'BOUGHT';
                  const isListed = item.type === 'LISTED';
                  const isCanceled = item.type === 'CANCELED' || item.isCanceled;

                  return (
                    <tr key={item.uniqueId || `${item.type}-${i}`} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg border",
                            isSale ? "bg-green-500/10 border-green-500/20 text-green-500" :
                              isBought ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                isCanceled ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                  "bg-white/10 border-white/20 text-gray-400"
                          )}>
                            {isSale ? <ArrowDownLeft size={16} /> : isBought ? <ShoppingBag size={16} /> : isCanceled ? <Ban size={16} /> : <Plus size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm">{item.name}</p>
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border",
                                item.chainId === 55931 ? "bg-cyan-900/50 text-cyan-400 border-cyan-500/30" :
                                  item.chainId === 5042002 ? "bg-blue-900/50 text-blue-400 border-blue-500/30" :
                                    "bg-orange-900/50 text-orange-400 border-orange-500/30"
                              )}>
                                <Globe size={8} /> {item.chainId === 55931 ? "DH" : item.chainId === 5042002 ? "ARC" : "ARB"}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono uppercase">{item.type} • ID #{item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-sm text-white">
                        {isSale || isBought ? (
                          <span className={isSale ? "text-green-400" : "text-red-400"}>
                            {isSale ? "+" : "-"}{formatEther(item.price)} <span className="text-xs text-white/50">{item.currency}</span>
                          </span>
                        ) : <span className="text-gray-600">-</span>}
                      </td>
                      <td className="py-4 px-6 text-center text-xs text-gray-400 font-mono">
                        {formatTimeAgo(item.timestamp)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase",
                          isCanceled ? "bg-red-500/10 text-red-500 border-red-500/20" :
                            item.isDelivered ? "bg-green-500/10 text-green-500 border-green-500/20" :
                              item.type === 'SALE' && !item.isDelivered ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                "bg-blue-500/10 text-blue-500 border-blue-500/20")}>
                          {isCanceled ? "Archived" : item.isDelivered ? "Completed" : item.type === 'SALE' ? "Pending Key" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {/* DELIVER BUTTON (For Sales) */}
                        {isSale && !item.isDelivered && !isCanceled && (
                          <button
                            onClick={() => handleDeliver(item)}
                            disabled={!!processingId}
                            className="bg-primary hover:bg-white text-black px-4 py-2 rounded-lg text-xs font-bold shadow-neon transition-all flex items-center justify-center gap-2 ml-auto hover:scale-105 active:scale-95"
                          >
                            {processingId === item.uniqueId ? <Loader2 className="animate-spin" size={14} /> : <Key size={14} />}
                            DELIVER KEY
                          </button>
                        )}

                        {/* CANCEL BUTTON (For Active Listings) */}
                        {isListed && !isCanceled && (
                          <button
                            onClick={() => handleCancel(item)}
                            disabled={!!processingId}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ml-auto hover:scale-105 active:scale-95"
                          >
                            {processingId === item.uniqueId ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            CANCEL
                          </button>
                        )}

                        {/* DOWNLOAD BUTTON (For Buyers) */}
                        {isBought && item.hasKey && (
                          <button
                            onClick={() => handleDownload(item)}
                            disabled={downloadingId === item.uniqueId}
                            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-bold border border-white/10 ml-auto flex gap-2 items-center transition-colors"
                          >
                            {downloadingId === item.uniqueId ? <Loader2 className="animate-spin" size={12} /> : <Download size={12} />}
                            Download
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
      <Footer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}