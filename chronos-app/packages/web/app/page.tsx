"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "@/lib/contracts";
import { Navigation } from "../components/Navigation";
import { fetchIPFS } from "@/lib/ipfs"; 
import { getCryptoPrices } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { 
  Search, Music, Video, FileText, Lock, Play, Database, 
  ChevronDown, Archive, ChevronUp, User, Info, Box, Pause, RefreshCw, Share2, Check
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
      {/* ... (Background Effects same as previous) ... */}
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
  const [showDetails, setShowDetails] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!item.previewCid) return;
      try {
        const cid = item.previewCid.replace("ipfs://", "");
        const blob = await fetchIPFS(cid);
        try { const text = await blob.text(); const json = JSON.parse(text); setMeta({ ...json, image: json.image ? `https://gateway.pinata.cloud/ipfs/${json.image.replace("ipfs://", "")}` : null, animation_url: json.animation_url ? `https://gateway.pinata.cloud/ipfs/${json.animation_url.replace("ipfs://", "")}` : null }); } 
        catch { setMeta({ image: `https://gateway.pinata.cloud/ipfs/${cid}` }); }
      } catch (e) { console.error("Meta error", e); }
    };
    loadMetadata();
  }, [item.previewCid]);

  const type = item.fileType.toUpperCase();
  const sold = Number(item.soldCount);
  const max = Number(item.maxSupply);
  const remaining = max - sold;
  const isSoldOut = item.isSoldOut || sold >= max;
  const supplyPercentage = Math.floor((sold / max) * 100);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type.includes("VIDEO") && videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); setIsPlaying(!isPlaying); }
    else if (type.includes("AUDIO") && audioRef.current) { isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); }
  };

  // FIX: Buy Logic
  const handleBuy = async () => {
    if(isSoldOut) return;
    if(!confirm(`Buy ${item.name} for ${formatEther(item.price)} MOCK?`)) return;
    
    setIsBuying(true);
    try {
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [BigInt(item.id)],
        value: item.price // Send required value
      });
      alert("Purchase Successful! Check Dashboard.");
    } catch (e: any) {
      alert("Purchase failed: " + (e.reason || e.message));
    } finally {
      setIsBuying(false);
    }
  };

  // FEATURE: Share Link
  const handleShare = () => {
    const url = `${window.location.origin}/?id=${item.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-[#0b1a24]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-neon flex flex-col">
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button onClick={handleShare} className="p-1 rounded bg-black/60 text-white hover:text-primary transition-colors" title="Copy Link">
            {copied ? <Check size={14}/> : <Share2 size={14}/>}
        </button>
        <span className="inline-flex items-center rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/30 shadow-sm">{type}</span>
      </div>
      
      {/* ... [Media Preview Same as Before] ... */}
      <div className={cn("relative aspect-video w-full overflow-hidden bg-gray-900 group-hover:brightness-110 transition-all shrink-0", isSoldOut && "grayscale opacity-60")}>
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80 z-10 pointer-events-none" />
        {meta?.animation_url && type.includes("VIDEO") ? <video ref={videoRef} src={meta.animation_url} className="w-full h-full object-cover" loop muted={!isPlaying} poster={meta?.image}/> : meta?.image ? <img src={meta.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/5"><FileText size={40} className="text-white/20"/></div>}
        {meta?.animation_url && type.includes("AUDIO") && <audio ref={audioRef} src={meta.animation_url} loop />}
        {!isSoldOut && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"><button onClick={togglePlay} className="bg-primary text-black rounded-full p-4 shadow-neon hover:scale-110 transition-transform active:scale-95">{isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}</button></div>}
        {isSoldOut && <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-30 pointer-events-none"><div className="border-4 border-white text-white px-6 py-2 text-2xl font-black tracking-widest uppercase -rotate-12 mix-blend-overlay">SOLD OUT</div></div>}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-grow">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate">{item.name}</h3>
          <Link href={`/profile/${item.seller}`} className="text-xs font-mono text-primary/70 hover:text-primary flex items-center gap-1 mt-1 w-fit transition-colors">
             <User size={12}/> Seller: {item.seller.slice(0,6)}...{item.seller.slice(-4)}
          </Link>
        </div>
        <div className="w-full bg-black/40 rounded-full h-1.5 mt-1 overflow-hidden relative border border-white/5"><div className={cn("h-full absolute left-0 top-0 transition-all", isSoldOut ? "bg-red-500" : "bg-secondary shadow-[0_0_10px_#2979FF]")} style={{ width: `${supplyPercentage}%` }}></div></div>
        <div className="flex justify-between text-[10px] font-mono text-white/60 -mt-1"><span>Supply: {remaining} / {max} Left</span><span>{supplyPercentage}% Sold</span></div>
        
        {showDetails && <div className="bg-white/5 p-3 rounded-lg text-xs text-white/70 animate-in slide-in-from-top-2 font-mono border border-white/10"><h4 className="flex items-center gap-1 font-bold text-white mb-1 uppercase"><Info size={12}/> Description</h4><p className="mb-2 leading-relaxed opacity-80">{meta?.description || "No description."}</p></div>}
        
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="flex flex-col"><span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Price</span><span className="text-lg font-mono font-bold text-white tracking-tight">{formatEther(item.price)} MOCK</span></div>
          <div className="flex gap-2">
            <button onClick={() => setShowDetails(!showDetails)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10">{showDetails ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
            <button 
                onClick={handleBuy}
                disabled={isSoldOut || isBuying} 
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-2 uppercase tracking-wide flex-1 justify-center active:scale-95", isSoldOut ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5" : "bg-primary hover:bg-white text-black shadow-neon hover:shadow-white/20")}
            >
                {isBuying ? <RefreshCw className="animate-spin" size={14}/> : isSoldOut ? "Unavailable" : "Buy Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [prices, setPrices] = useState({ BTC: 0, ETH: 0, SOL: 0 });
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("NEWEST");
  const [view, setView] = useState<'ACTIVE' | 'SOLD'>('ACTIVE');

  // Fetch Real Prices
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

  const { data: rawItems } = useReadContract({ address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: "getMarketplaceItems" });
  const allItems = (rawItems as any[]) || [];

  const filteredItems = useMemo(() => {
    let items = allItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || item.fileType.toUpperCase().includes(filter);
      const isSoldOut = item.isSoldOut || Number(item.soldCount) >= Number(item.maxSupply);
      const matchesView = view === 'ACTIVE' ? !isSoldOut : isSoldOut;
      return matchesSearch && matchesFilter && matchesView;
    });
    if (sort === "NEWEST") items = items.reverse();
    if (sort === "PRICE_LOW") items = items.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "PRICE_HIGH") items = items.sort((a, b) => Number(b.price) - Number(a.price));
    return items;
  }, [allItems, filter, search, sort, view]);

  if (!mounted) return null;
  if (showSplash) return <SplashScreen onEnter={() => setShowSplash(false)} />;

  return (
    <div className="min-h-screen bg-background text-white font-display overflow-x-hidden">
      <Navigation />
      <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
        
        {/* Toggle Controls */}
        <div className="md:hidden flex w-full mb-8">
          <div className="flex flex-1 items-center justify-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 w-full">
            <button onClick={() => setView('ACTIVE')} className={cn("flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all", view === 'ACTIVE' ? "bg-primary text-black shadow-neon" : "text-white/60 hover:text-white")}>Active Market</button>
            <button onClick={() => setView('SOLD')} className={cn("flex-1 px-4 py-2 rounded-full text-xs font-bold transition-all", view === 'SOLD' ? "bg-white/20 text-white shadow-lg" : "text-white/60 hover:text-white")}>Sold History</button>
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12 border-b border-white/10 pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary text-xs font-mono tracking-widest uppercase animate-pulse"><span className="w-2 h-2 bg-primary rounded-full shadow-neon" /> System Online // V.2.0.77</div>
            <h1 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter">ENCRYPTED <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">CHRONICLES</span></h1>
            <p className="text-white/60 max-w-xl text-sm md:text-base font-light leading-relaxed">Secure peer-to-peer file transfer protocol.</p>
          </div>
          <div className="flex flex-col items-end gap-6 w-full md:w-auto">
            <div className="hidden md:flex items-center justify-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
              <button onClick={() => setView('ACTIVE')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", view === 'ACTIVE' ? "bg-primary text-black shadow-neon" : "text-white/60 hover:text-white hover:bg-white/5")}>Active Market</button>
              <button onClick={() => setView('SOLD')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", view === 'SOLD' ? "bg-white/20 text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5")}>Sold History</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="relative group flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} /><input type="text" placeholder="Filter..." className="w-full sm:w-64 bg-surface border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary/50" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <div className="relative"><select value={sort} onChange={(e) => setSort(e.target.value)} className="appearance-none w-full sm:w-48 bg-surface border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 cursor-pointer"><option value="NEWEST">Newest</option><option value="PRICE_LOW">Price: Low</option><option value="PRICE_HIGH">Price: High</option></select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={16} /></div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">{["ALL", "AUDIO", "VIDEO", "DATA", "ARCHIVE"].map((f) => (<button key={f} onClick={() => setFilter(f)} className={cn("px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all border whitespace-nowrap", filter === f ? "bg-primary/20 text-primary border-primary shadow-neon" : "bg-surface text-white/60 border-white/10 hover:border-white/30 hover:text-white")}>{f}</button>))}</div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
          {filteredItems.length > 0 ? (filteredItems.map((item, i) => (<MarketplaceCard key={i} item={item} />))) : (<div className="col-span-full flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5"><div className="p-4 rounded-full bg-white/5 text-white/20 mb-4"><Archive size={48} /></div><h3 className="text-xl font-bold text-white mb-2">No Artifacts Found</h3><p className="text-white/40 text-sm max-w-md mx-auto">{view === 'ACTIVE' ? "No active listings found." : "No sold-out items found."}</p></div>)}
        </div>
      </main>

      {/* TICKER FOOTER */}
       <footer className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-md border-t border-white/10 py-2 z-50 overflow-hidden">
        <div className="flex whitespace-nowrap w-full animate-[shimmer_30s_linear_infinite]">
          <div className="flex gap-12 items-center px-4 text-xs font-mono text-white/60">
            <span className="flex items-center gap-2"><span className="text-primary">•</span> MOCK: $1.00</span>
            <span className="flex items-center gap-2"><span className="text-secondary">•</span> BTC: ${prices.BTC.toLocaleString()}</span>
            <span className="flex items-center gap-2"><span className="text-success">•</span> ETH: ${prices.ETH.toLocaleString()}</span>
            <span className="flex items-center gap-2"><span className="text-primary">•</span> SOL: ${prices.SOL.toLocaleString()}</span>
            <span className="flex items-center gap-2"><span className="text-secondary">•</span> NODES: 4,521</span>
            <span className="flex items-center gap-2"><span className="text-success">•</span> GAS: 12 GWEI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}