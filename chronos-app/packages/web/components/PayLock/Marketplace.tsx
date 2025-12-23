"use client";

// FIX: Added 'useAccount' to the imports below
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { useState, useEffect } from 'react';
import { Loader2, Search, Play, Box, Code, FileText, Music, ShoppingCart, Info, ChevronUp, Film, Mic, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
  const [search, setSearch] = useState("");

  const { data: items, isLoading, refetch } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  const allItems = (items as any[]) || [];
  
  const filtered = allItems.filter(i => {
    // Strict check for sold out status
    const isSoldOut = i.isSoldOut || (Number(i.maxSupply) > 0 && Number(i.soldCount) >= Number(i.maxSupply));
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'active') return !isSoldOut && matchesSearch;
    if (activeTab === 'sold') return isSoldOut && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-8 font-display">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-4 border-b border-white/10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary text-xs font-mono tracking-widest uppercase">
            <span className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#40E0D0]"></span>
            System Online // V.2.0.77
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter uppercase">
            Encrypted <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-600">Chronicles</span>
          </h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end w-full md:w-auto">
          <div className="relative group w-full md:w-auto">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors size-4"/>
             <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter artifacts..." className="w-full md:w-64 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-primary outline-none transition-colors font-mono"/>
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            <button onClick={() => setActiveTab('active')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", activeTab === 'active' ? "bg-primary text-black shadow-glow-primary" : "text-white/60 hover:text-white")}>Active Market</button>
            <button onClick={() => setActiveTab('sold')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", activeTab === 'sold' ? "bg-primary text-black shadow-glow-primary" : "text-white/60 hover:text-white")}>Sold Out</button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-primary font-mono text-xs uppercase tracking-widest animate-pulse">Scanning Network...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filtered.map(item => <MarketItem key={item.id.toString()} item={item} onSuccess={refetch} />)}
          {filtered.length === 0 && <div className="col-span-full py-20 text-center text-white/40 font-mono italic uppercase">No artifacts found in this sector.</div>}
        </div>
      )}
    </div>
  );
}

function MarketItem({ item, onSuccess }: { item: any, onSuccess: () => void }) {
  const { address } = useAccount(); // This will now work
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const [meta, setMeta] = useState<{ desc: string, img: string, blur: number, zoom: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Calculate Sold Out Status
  const isSoldOut = item.isSoldOut || (Number(item.maxSupply) > 0 && Number(item.soldCount) >= Number(item.maxSupply));

  useEffect(() => { if (isSuccess) onSuccess(); }, [isSuccess, onSuccess]);

  useEffect(() => {
    const fetchMeta = async () => {
      const cid = item.previewCid?.replace("ipfs://", "");
      if (!cid) return;
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await res.json();
          setMeta({
            desc: json.description || "",
            img: json.image?.replace("ipfs://", "") || "",
            blur: json.settings?.blur || 0,
            zoom: json.settings?.zoom || 100
          });
        } else {
          setMeta({ desc: "", img: cid, blur: 0, zoom: 100 });
        }
      } catch (e) { setMeta({ desc: "", img: cid, blur: 0, zoom: 100 }); }
    };
    fetchMeta();
  }, [item.previewCid]);

  const handleBuy = async () => {
    if (isSoldOut) return;
    try {
      await writeContractAsync({ address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: 'buyItem', args: [BigInt(item.id)], value: item.price });
    } catch (e) { console.error(e); }
  };

  const getIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('AUDIO') || t.includes('MP3')) return <Music size={14} className="mr-1"/>;
    if (t.includes('VIDEO') || t.includes('MP4')) return <Film size={14} className="mr-1"/>;
    if (t.includes('PDF')) return <FileText size={14} className="mr-1"/>;
    return <Code size={14} className="mr-1"/>;
  };

  const isVideo = item.fileType.toUpperCase().includes('VIDEO');
  const isAudio = item.fileType.toUpperCase().includes('AUDIO');

  return (
    <div className={cn("group relative bg-[#0b1a24]/60 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1", 
      isSoldOut ? "opacity-75 grayscale hover:grayscale-0 hover:opacity-100 border-white/5" : "hover:border-primary/50 hover:shadow-[0_0_30px_rgba(64,224,208,0.15)]")}>
      
      {/* Badges */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/30 uppercase tracking-wide">
          {getIcon(item.fileType)} {item.fileType}
        </span>
        {isSoldOut && (
          <span className="inline-flex items-center rounded-full bg-red-500/80 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white border border-red-500/50 uppercase tracking-wide shadow-lg">
            SOLD OUT
          </span>
        )}
      </div>

      {/* SOLD OUT OVERLAY */}
      {isSoldOut && (
        <div className="absolute inset-0 z-10 bg-black/40 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white/80 text-white px-4 py-1 text-xl font-black tracking-widest uppercase transform -rotate-12 bg-black/50 backdrop-blur-sm">
            SOLD OUT
          </div>
        </div>
      )}

      {/* Media Preview */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900 flex items-center justify-center">
        {meta ? (
          isVideo ? (
            <video src={`https://gateway.pinata.cloud/ipfs/${meta.img}`} controls className="w-full h-full object-cover" style={{ filter: `blur(${meta.blur}px)`, transform: `scale(${meta.zoom/100})` }}/>
          ) : isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4 relative"><Mic size={32} className="text-primary" /></div>
          ) : (
            <img src={`https://gateway.pinata.cloud/ipfs/${meta.img}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" style={{ filter: `blur(${meta.blur}px)`, transform: `scale(${meta.zoom/100})` }} onError={(e) => (e.target as HTMLImageElement).src = "https://placehold.co/600x400/000/FFF?text=ENCRYPTED"}/>
          )
        ) : <div className="w-full h-full bg-black/50 animate-pulse" />}
        {!isVideo && !isAudio && <div className="absolute inset-0 bg-gradient-to-t from-[#020609] via-transparent to-transparent opacity-80"></div>}
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div>
          <div className="flex justify-between items-start">
             <h3 className={cn("text-lg font-bold text-white transition-colors truncate font-mono uppercase", !isSoldOut && "group-hover:text-primary")}>{item.name}</h3>
             {meta?.desc && <button onClick={() => setExpanded(!expanded)} className="text-white/40 hover:text-primary transition-colors">{expanded ? <ChevronUp size={16}/> : <Info size={16}/>}</button>}
          </div>
          <p className="text-white/50 text-[10px] font-mono mt-1 uppercase tracking-tighter">
            ID: #{item.id.toString()} // SUPPLY: {Number(item.soldCount)}/{Number(item.maxSupply)}
          </p>
        </div>

        {expanded && meta?.desc && <div className="text-xs text-gray-300 font-sans leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 animate-in slide-in-from-top-2">{meta.desc}</div>}

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Price</span>
            <span className="text-lg font-bold text-white font-mono">{formatEther(item.price)} ETH</span>
          </div>
          {address?.toLowerCase() !== item.seller.toLowerCase() && (
            <button 
              onClick={handleBuy} 
              disabled={isConfirming || isSoldOut} 
              className={cn("px-5 py-2 rounded-full font-bold text-[10px] uppercase flex items-center gap-2 transition-all shadow-glow-primary", 
                isSoldOut ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/5 shadow-none" : "bg-primary hover:bg-teal-400 text-black hover:scale-105"
              )}
            >
              {isConfirming ? <Loader2 className="animate-spin" size={14} /> : isSoldOut ? <Ban size={14}/> : <ShoppingCart size={14} />} 
              {isConfirming ? "Processing..." : isSoldOut ? "Sold Out" : "Buy Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}