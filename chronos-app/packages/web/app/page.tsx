"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount, useWriteContract, useSwitchChain } from "wagmi";
// FIX: Added 'parseAbiItem' and 'AbiEvent' to imports
import { formatEther, createPublicClient, http, parseAbiItem, type AbiEvent } from "viem"; 
import Link from "next/link";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts"; 
import { datahaven, arcTestnet } from "@/lib/chains"; 
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import { fetchIPFS, getIPFSUrl } from "@/lib/ipfs"; 
import { getCryptoPrices } from "@/lib/utils";
import { cn } from "@/lib/utils";
// FIX: Added 'ChevronUp' to imports
import { 
  Search, Video, FileText, Play, Archive, ChevronDown, ChevronUp,
  User, Info, Pause, RefreshCw, Share2, Check, Globe, AlertTriangle, ExternalLink
} from "lucide-react";

// --- SPLASH SCREEN ---
function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); setLoaded(true); return 100; }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="fixed inset-0 bg-[#050b14] flex flex-col items-center justify-center relative overflow-hidden z-[100] font-display text-primary select-none px-4">
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <h1 className="text-4xl md:text-5xl font-black tracking-[0.2em] mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.5)] text-center">CHRONOS</h1>
        {!loaded ? (
          <div className="w-full mb-8"><div className="h-1.5 bg-primary/20 rounded-full overflow-hidden relative"><div className="h-full bg-primary shadow-[0_0_20px_rgba(0,229,255,0.8)] transition-all duration-300 ease-out relative" style={{ width: `${Math.min(progress, 100)}%` }}></div></div></div>
        ) : (
          <button onClick={onEnter} className="relative group w-full px-10 py-3 bg-transparent border-2 border-primary text-primary font-bold uppercase tracking-wider overflow-hidden transition-all duration-300 hover:bg-primary hover:text-[#050b14] active:scale-95 animate-in fade-in zoom-in-95 rounded-sm"><span className="relative z-10">Enter Protocol</span><div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:animate-[shimmer_0.5s_linear]"></div></button>
        )}
      </div>
    </div>
  );
}

// --- MARKETPLACE CARD ---
function MarketplaceCard({ item }: { item: any }) {
  const [meta, setMeta] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!item.previewCid) return;
      try {
        const url = getIPFSUrl(item.previewCid);
        if (!url) return;

        try {
          const res = await fetch(url);
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            setMeta({
              ...json,
              image: getIPFSUrl(json.image),
              animation_url: getIPFSUrl(json.animation_url)
            });
            return;
          }
        } catch {}
        setMeta({ image: url });
      } catch (e) { console.error("Metadata error", e); }
    };
    loadMetadata();
  }, [item.previewCid]);

  const type = item.fileType.toUpperCase();
  const sold = Number(item.soldCount);
  const max = Number(item.maxSupply);
  const remaining = max - sold;
  
  // Status Logic
  const isCanceled = !item.isActive; 
  const isSoldOut = !isCanceled && (item.isSoldOut || sold >= max);
  const supplyPercentage = Math.floor((sold / max) * 100);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (type.includes("VIDEO") && videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); setIsPlaying(!isPlaying); }
    else if (type.includes("AUDIO") && audioRef.current) { isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); }
  };

  return (
    <div className="group relative bg-[#0b1a24]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-neon flex flex-col h-full">
      <div className="absolute top-3 right-3 z-20 flex gap-2 pointer-events-none">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border shadow-sm backdrop-blur-md", item.chainId === 55931 ? "bg-cyan-900/80 text-cyan-400 border-cyan-500/30" : "bg-blue-900/80 text-blue-400 border-blue-500/30")}>
          <Globe size={10}/> {item.chainId === 55931 ? "DH" : "ARC"}
        </span>
        <span className="inline-flex items-center rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/30 shadow-sm">{type.replace('.', '')}</span>
      </div>
      
      <Link href={`/item/${item.id}?chain=${item.chainId}`} className="cursor-pointer block">
        <div className={cn("relative aspect-video w-full overflow-hidden bg-gray-900 group-hover:brightness-110 transition-all shrink-0", (isSoldOut || isCanceled) && "grayscale opacity-60")}>
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80 z-10 pointer-events-none" />
          
          {meta?.animation_url && type.includes("VIDEO") ? (
            <video ref={videoRef} src={meta.animation_url} className="w-full h-full object-cover" loop muted={!isPlaying} poster={meta?.image}/>
          ) : meta?.image ? (
            <img src={meta.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => (e.target as HTMLImageElement).src = "https://placehold.co/600x400/000/FFF?text=No+Preview"} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5"><FileText size={40} className="text-white/20"/></div>
          )}
          
          {meta?.animation_url && type.includes("AUDIO") && <audio ref={audioRef} src={meta.animation_url} loop />}
          
          {!isSoldOut && !isCanceled && (type.includes("VIDEO") || type.includes("AUDIO")) && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <button onClick={togglePlay} className="bg-primary text-black rounded-full p-4 shadow-neon hover:scale-110 transition-transform active:scale-95">
                {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}
              </button>
            </div>
          )}
          
          {(isSoldOut || isCanceled) && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-30 pointer-events-none">
                <div className={cn("border-4 px-6 py-2 text-2xl font-black tracking-widest uppercase -rotate-12 mix-blend-overlay", isCanceled ? "border-red-500 text-red-500" : "border-white text-white")}>
                    {isCanceled ? "ARCHIVED" : "SOLD OUT"}
                </div>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col gap-3 flex-grow">
        <div>
          <Link href={`/item/${item.id}?chain=${item.chainId}`}>
             <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate cursor-pointer">{item.name}</h3>
          </Link>
          <Link href={`/profile/${item.seller}`} className="text-xs font-mono text-primary/70 hover:text-primary flex items-center gap-1 mt-1 w-fit transition-colors">
             <User size={12}/> Seller: {item.seller.slice(0,6)}...{item.seller.slice(-4)}
          </Link>
        </div>
        
        <div className="w-full bg-black/40 rounded-full h-1.5 mt-1 overflow-hidden relative border border-white/5"><div className={cn("h-full absolute left-0 top-0 transition-all", isSoldOut ? "bg-red-500" : isCanceled ? "bg-gray-600" : "bg-secondary shadow-[0_0_10px_#2979FF]")} style={{ width: `${supplyPercentage}%` }}></div></div>
        <div className="flex justify-between text-[10px] font-mono text-white/60 -mt-1"><span>Supply: {remaining} / {max} Left</span><span>{supplyPercentage}% Sold</span></div>
        
        <div className="bg-white/5 p-2 rounded-lg border border-white/10 min-h-[3.5rem]">
           <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
             {meta?.description || item.description || "No description provided."}
           </p>
        </div>
        
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Price</span>
            <span className="text-lg font-mono font-bold text-white tracking-tight">{formatEther(item.price)} {item.currency}</span>
          </div>
          <Link 
            href={`/item/${item.id}?chain=${item.chainId}`}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-2 uppercase tracking-wide flex-1 justify-center active:scale-95 text-center", (isSoldOut || isCanceled) ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5" : "bg-primary hover:bg-white text-black shadow-neon hover:shadow-white/20")}
          >
            {isCanceled ? "Archived" : isSoldOut ? "Sold Out" : "View & Buy"}
          </Link>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function MarketplacePage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [prices, setPrices] = useState({ BTC: 0, ETH: 0, SOL: 0 });
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("NEWEST");
  const [view, setView] = useState<'ACTIVE' | 'SOLD' | 'ARCHIVED'>('ACTIVE');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Prices Ticker
  useEffect(() => {
    getCryptoPrices().then(setPrices);
    const i = setInterval(() => getCryptoPrices().then(setPrices), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    setMounted(true);
    const hasSeenSplash = sessionStorage.getItem("chronos_splash_seen");
    if (isConnected && !hasSeenSplash) { setShowSplash(true); sessionStorage.setItem("chronos_splash_seen", "true"); } 
    else if (!isConnected) { sessionStorage.removeItem("chronos_splash_seen"); setShowSplash(false); }
  }, [isConnected]);

  // --- MULTI-CHAIN DATA AGGREGATION ---
  useEffect(() => {
    const fetchMultiChainData = async () => {
      if (allItems.length === 0) setIsLoading(true);
      
      const chains = [datahaven, arcTestnet];
      const aggregatedItems: any[] = [];

      await Promise.all(chains.map(async (chain) => {
        try {
          const client = createPublicClient({ chain, transport: http() });
          const contractAddr = CONTRACT_ADDRESSES[chain.id];
          
          if (!contractAddr || contractAddr === "0x...") {
             console.warn(`Contract address missing for ${chain.name}`);
             return;
          }

          // 1. Fetch Items
          const items = await client.readContract({
            address: contractAddr,
            abi: PAYLOCK_ABI,
            functionName: 'getMarketplaceItems',
          }) as any[];

          // 2. Fetch Listing Events (Chunked to prevent RPC 413 Errors)
          const currentBlock = await client.getBlockNumber();
          const SCAN_DEPTH = BigInt(50000); 
          const CHUNK_SIZE = BigInt(3000);  
          let fromBlock = currentBlock - SCAN_DEPTH > BigInt(0) ? currentBlock - SCAN_DEPTH : BigInt(0);
          
          const itemBlockMap = new Map();
          
          // Helper to chunk the requests
          const fetchChunks = async () => {
            for (let i = fromBlock; i < currentBlock; i += CHUNK_SIZE) {
              const to = (i + CHUNK_SIZE) > currentBlock ? currentBlock : (i + CHUNK_SIZE);
              try {
                const logs = await client.getLogs({
                  address: contractAddr,
                  event: parseAbiItem('event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)') as AbiEvent,
                  fromBlock: i,
                  toBlock: to
                });
                
                logs.forEach(log => {
                  // FIX: Explicitly cast 'log' to any to access args.id without TS error
                  const args = (log as any).args;
                  if(args && args.id) {
                    itemBlockMap.set(args.id.toString(), log.blockNumber);
                  }
                });
              } catch (e) {
                // console.warn(`Chunk failed on ${chain.name} (${i}-${to}), skipping...`);
              }
            }
          };
          
          await fetchChunks();

          // Fetch Timestamps
          const uniqueBlocks = Array.from(new Set(itemBlockMap.values())) as bigint[];
          const blockTimestamps: Record<string, number> = {};
          const recentBlocks = uniqueBlocks.sort().slice(-50); 
          
          await Promise.all(recentBlocks.map(async (bn) => {
             try {
                const block = await client.getBlock({ blockNumber: bn });
                blockTimestamps[bn.toString()] = Number(block.timestamp);
             } catch {}
          }));

          const taggedItems = items.map(item => {
            const blockNum = itemBlockMap.get(item.id.toString());
            const timestamp = blockNum ? blockTimestamps[blockNum.toString()] : (Date.now()/1000); 
            
            return {
              ...item,
              chainId: chain.id,
              chainName: chain.name,
              currency: chain.nativeCurrency.symbol,
              timestamp: timestamp || 0
            };
          });

          aggregatedItems.push(...taggedItems);
        } catch (e) {
          console.error(`Error fetching from ${chain.name}:`, e);
        }
      }));

      setAllItems(aggregatedItems);
      setIsLoading(false);
    };

    fetchMultiChainData();
    const intervalId = setInterval(fetchMultiChainData, 15000); 
    return () => clearInterval(intervalId);
  }, []);

  // --- FILTER & SORT LOGIC ---
  const filteredItems = useMemo(() => {
    let items = allItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || item.fileType.toUpperCase().includes(filter);
      
      const soldCount = Number(item.soldCount);
      const maxSupply = Number(item.maxSupply);
      const isActive = item.isActive; 
      
      const isSoldOut = soldCount >= maxSupply || item.isSoldOut;
      const isCanceled = !isActive;

      let matchesView = false;
      if (view === 'ACTIVE') matchesView = isActive && !isSoldOut;
      else if (view === 'SOLD') matchesView = isActive && isSoldOut;
      else if (view === 'ARCHIVED') matchesView = isCanceled; 

      if (item.isActive === undefined) {
         matchesView = view === 'ACTIVE' ? !item.isSoldOut : item.isSoldOut;
      }

      return matchesSearch && matchesFilter && matchesView;
    });

    const sorted = [...items];
    if (sort === "NEWEST") sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    else if (sort === "PRICE_LOW") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "PRICE_HIGH") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    
    return sorted;
  }, [allItems, filter, search, sort, view]);

  if (!mounted) return null;
  if (showSplash) return <SplashScreen onEnter={() => setShowSplash(false)} />;

  return (
    <div className="min-h-screen bg-background text-white font-display overflow-x-hidden flex flex-col">
      <Navigation />
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
        {/* Toggle Controls */}
        <div className="md:hidden flex w-full mb-6">
          <div className="flex flex-1 items-center justify-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full">
            <button onClick={() => setView('ACTIVE')} className={cn("flex-1 px-4 py-3 rounded-lg text-xs font-bold transition-all", view === 'ACTIVE' ? "bg-primary text-black shadow-neon" : "text-white/60 hover:text-white")}>Active</button>
            <button onClick={() => setView('SOLD')} className={cn("flex-1 px-4 py-3 rounded-lg text-xs font-bold transition-all", view === 'SOLD' ? "bg-white/20 text-white shadow-lg" : "text-white/60 hover:text-white")}>Sold</button>
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-10 border-b border-white/10 pb-8">
          <div className="space-y-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 text-primary text-[10px] md:text-xs font-mono tracking-widest uppercase animate-pulse"><span className="w-2 h-2 bg-primary rounded-full shadow-neon" /> System Online // V.2.0.77</div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-none tracking-tighter">ENCRYPTED <br className="md:hidden"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">CHRONOS</span></h1>
            <p className="text-white/60 max-w-xl text-sm leading-relaxed">Secure peer-to-peer file transfer protocol.</p>
          </div>
          
          <div className="flex flex-col w-full lg:w-auto gap-4">
            <div className="hidden md:flex items-center justify-end gap-1 bg-white/5 p-1 rounded-full border border-white/10">
              <button onClick={() => setView('ACTIVE')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", view === 'ACTIVE' ? "bg-primary text-black shadow-neon" : "text-white/60 hover:text-white hover:bg-white/5")}>Active Market</button>
              <button onClick={() => setView('SOLD')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", view === 'SOLD' ? "bg-white/20 text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5")}>Sold History</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input type="text" placeholder="Filter artifacts..." className="w-full sm:w-64 bg-surface border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="appearance-none w-full sm:w-48 bg-surface border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 cursor-pointer transition-all">
                  <option value="NEWEST">Newest</option>
                  <option value="PRICE_LOW">Price: Low</option>
                  <option value="PRICE_HIGH">Price: High</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-nowrap gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {["ALL", "AUDIO", "VIDEO", "DATA", "ARCHIVE"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all border whitespace-nowrap", filter === f ? "bg-primary/20 text-primary border-primary shadow-neon" : "bg-surface text-white/60 border-white/10 hover:border-white/30 hover:text-white")}>{f}</button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-fr pb-20">
          {isLoading && allItems.length === 0 ? (
             <div className="col-span-full py-40 text-center"><RefreshCw className="animate-spin mx-auto text-primary mb-4" size={40}/><p className="text-white/60 font-mono text-sm">Scanning Multi-Chain Ledger...</p></div>
          ) : filteredItems.length > 0 ? (
             filteredItems.map((item, i) => (<MarketplaceCard key={`${item.chainId}-${i}`} item={item} />))
          ) : (
             <div className="col-span-full flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5"><div className="p-4 rounded-full bg-white/5 text-white/20 mb-4"><Archive size={48} /></div><h3 className="text-xl font-bold text-white mb-2">No Artifacts Found</h3><p className="text-white/40 text-sm max-w-md mx-auto">{view === 'ACTIVE' ? "No active listings found on any network." : "No sold-out items found."}</p></div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}