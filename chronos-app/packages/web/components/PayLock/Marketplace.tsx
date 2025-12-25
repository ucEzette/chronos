"use client";

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Search, Music, ShoppingCart, Info, ChevronUp, Film, Mic, Ban, 
  User, ExternalLink, ShieldCheck, FileText, Code, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchIPFS } from '@/lib/ipfs';

// --- ENTERPRISE TYPES ---
interface MarketItem {
  id: bigint;
  seller: string;
  name: string;
  previewCid: string; // Metadata CID
  ipfsCid: string;    // Encrypted File CID
  fileType: string;
  price: bigint;
  soldCount: bigint;
  maxSupply: bigint;
  isSoldOut: boolean;
}

// --- UTILS ---
const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
  const [search, setSearch] = useState("");
  const { isConnected } = useAccount();

  // 1. DATA FETCHING
  const { data: rawItems, isLoading, refetch } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  const allItems = (rawItems as MarketItem[]) || [];

  // 2. FILTERING LOGIC
  const filtered = allItems.filter(i => {
    const isSoldOut = i.isSoldOut || (Number(i.maxSupply) > 0 && Number(i.soldCount) >= Number(i.maxSupply));
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || 
                          i.seller.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'active') return !isSoldOut && matchesSearch;
    if (activeTab === 'sold') return isSoldOut && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-8 font-display">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-4 border-b border-white/10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary text-xs font-mono tracking-widest uppercase">
            <span className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#40E0D0]"></span>
            Decentralized Exchange // V.4.0-ENT
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter uppercase">
            Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-600">Artifacts</span>
          </h1>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 items-end w-full md:w-auto">
          <div className="relative group w-full md:w-auto">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors size-4"/>
             <input 
               value={search} 
               onChange={(e) => setSearch(e.target.value)} 
               placeholder="Search items or wallets..." 
               className="w-full md:w-64 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-primary outline-none transition-colors font-mono placeholder:text-white/20"
             />
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            <button onClick={() => setActiveTab('active')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", activeTab === 'active' ? "bg-primary text-black shadow-glow-primary" : "text-white/60 hover:text-white")}>Available</button>
            <button onClick={() => setActiveTab('sold')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", activeTab === 'sold' ? "bg-primary text-black shadow-glow-primary" : "text-white/60 hover:text-white")}>Sold Out</button>
          </div>
        </div>
      </div>

      {/* GRID */}
      {isLoading ? (
        <div className="py-40 text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-primary font-mono text-xs uppercase tracking-widest animate-pulse">Syncing Blockchain Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filtered.map(item => (
            <MarketItem key={item.id.toString()} item={item} onSuccess={() => refetch()} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-white/40 font-mono italic uppercase bg-white/5 rounded-2xl border border-white/5 border-dashed">
              No matching artifacts found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** MARKET ITEM CARD */
function MarketItem({ item, onSuccess }: { item: MarketItem, onSuccess: () => void }) {
  const { address } = useAccount();
  const router = useRouter();
  
  // Transaction Hooks
  const { writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const [meta, setMeta] = useState<{ desc: string, img: string, blur: number, zoom: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Status Checks
  const isSoldOut = item.isSoldOut || (Number(item.maxSupply) > 0 && Number(item.soldCount) >= Number(item.maxSupply));
  const isOwner = address && item.seller.toLowerCase() === address.toLowerCase();
  const isProcessing = isWritePending || isConfirming;

  useEffect(() => { 
    if (isSuccess) onSuccess(); 
  }, [isSuccess, onSuccess]);

  // Metadata Fetching
  useEffect(() => {
    const loadMeta = async () => {
      const cid = item.previewCid?.replace("ipfs://", "").trim();
      if (!cid) return;
      try {
        const blob = await fetchIPFS(cid); // Use the robust fetcher
        if (blob.type.includes("json")) {
          const json = JSON.parse(await blob.text());
          setMeta({
            desc: json.description || "",
            img: json.image?.replace("ipfs://", "") || "",
            blur: json.settings?.blur || 0,
            zoom: json.settings?.zoom || 100
          });
        } else {
          setMeta({ desc: "", img: cid, blur: 0, zoom: 100 }); // Legacy fallback
        }
      } catch (e) {
        setMeta({ desc: "Preview unavailable", img: cid, blur: 0, zoom: 100 });
      }
    };
    loadMeta();
  }, [item.previewCid]);

  // --- 100% FUNCTIONAL BUY ACTION ---
  const handleBuy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut || isOwner || isProcessing) return;
    
    try {
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [item.id],
        value: item.price, // Contract handles the 1% fee split internally
      });
    } catch (e) {
      console.error("Purchase Error:", e);
      alert("Transaction Failed. Check your balance or network connection.");
    }
  };

  const navigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${item.seller}`);
  };

  // Helper: Icon Factory
  const getIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('AUDIO') || t.includes('MP3')) return <Music size={14} className="mr-1"/>;
    if (t.includes('VIDEO') || t.includes('MP4')) return <Film size={14} className="mr-1"/>;
    if (t.includes('PDF')) return <FileText size={14} className="mr-1"/>;
    return <Code size={14} className="mr-1"/>;
  };

  const isVideo = item.fileType.toUpperCase().includes('VIDEO') || item.fileType.toUpperCase().includes('MP4');
  const isAudio = item.fileType.toUpperCase().includes('AUDIO') || item.fileType.toUpperCase().includes('MP3');

  return (
    <div className={cn(
      "group relative bg-[#0b1a24]/80 backdrop-blur-md border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full",
      isSoldOut ? "border-white/5 opacity-70" : "border-white/10 hover:border-primary/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] hover:-translate-y-1"
    )}>
      
      {/* SELLER BADGE */}
      <div 
        onClick={navigateToProfile}
        className="absolute top-3 left-3 z-30 flex items-center gap-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-primary/50 cursor-pointer transition-all group/seller"
      >
        <div className="size-5 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-inner"></div>
        <span className="text-[10px] font-mono font-bold text-white/80 group-hover/seller:text-primary">
          {formatAddress(item.seller)}
        </span>
        <ExternalLink size={10} className="text-white/40 group-hover/seller:text-primary opacity-0 group-hover/seller:opacity-100 transition-opacity" />
      </div>

      {/* MEDIA PREVIEW */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900 flex items-center justify-center border-b border-white/5">
        <div className="absolute top-3 right-3 z-20">
          <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/30 uppercase tracking-wide shadow-lg">
            {getIcon(item.fileType)} {item.fileType}
          </span>
        </div>

        {isSoldOut && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="border-2 border-red-500 text-red-500 px-6 py-2 text-2xl font-black tracking-widest uppercase transform -rotate-12 bg-black/80 shadow-2xl">
              SOLD OUT
            </div>
          </div>
        )}

        {meta ? (
          isVideo ? (
            <video 
              src={`https://gateway.pinata.cloud/ipfs/${meta.img}`} 
              controls 
              className="w-full h-full object-cover" 
              style={{ filter: isSoldOut ? 'grayscale(100%)' : `blur(${meta.blur}px)`, transform: `scale(${meta.zoom/100})` }}
            />
          ) : isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4 relative">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
               <Mic size={40} className="text-primary z-10 drop-shadow-glow-primary" />
            </div>
          ) : (
            <img 
              src={`https://gateway.pinata.cloud/ipfs/${meta.img}`} 
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" 
              style={{ filter: isSoldOut ? 'grayscale(100%)' : `blur(${meta.blur}px)`, transform: `scale(${meta.zoom/100})` }}
              onError={(e) => (e.target as HTMLImageElement).src = "https://placehold.co/600x400/000/FFF?text=ENCRYPTED"}
            />
          )
        ) : (
          <div className="w-full h-full bg-white/5 animate-pulse flex items-center justify-center">
            <Loader2 className="animate-spin text-white/20" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        {!isVideo && !isAudio && <div className="absolute inset-0 bg-gradient-to-t from-[#0b1a24] via-transparent to-transparent opacity-60"></div>}
      </div>

      {/* INFO & ACTION */}
      <div className="p-5 flex flex-col gap-4 flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
             <h3 className={cn("text-lg font-bold text-white transition-colors truncate font-mono uppercase leading-tight", !isSoldOut && "group-hover:text-primary")}>
               {item.name}
             </h3>
             {meta?.desc && (
               <button onClick={() => setExpanded(!expanded)} className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded">
                 {expanded ? <ChevronUp size={16}/> : <Info size={16}/>}
               </button>
             )}
          </div>
          
          {meta?.desc && !expanded && (
            <p className="text-xs text-gray-400 font-sans leading-relaxed line-clamp-2 mt-2 h-[2.5em] opacity-80">
              {meta.desc}
            </p>
          )}

          <div className="flex items-center gap-3 mt-3">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider bg-white/5 px-2 py-1 rounded">
              ID: #{item.id.toString()}
            </div>
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider bg-white/5 px-2 py-1 rounded flex items-center gap-1">
              Supply: <span className={cn("font-bold", isSoldOut ? "text-red-500" : "text-white")}>{Number(item.soldCount)}/{Number(item.maxSupply)}</span>
            </div>
          </div>
        </div>

        {expanded && meta?.desc && (
          <div className="text-xs text-gray-300 font-sans leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 animate-in slide-in-from-top-2 shadow-inner">
            {meta.desc}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[9px] text-white/40 font-bold uppercase tracking-widest mb-0.5">
              Price <span className="text-primary/50 text-[8px]">(+1% Fee)</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white font-mono tracking-tight">{formatEther(item.price)}</span>
              <span className="text-xs font-bold text-primary">ETH</span>
            </div>
          </div>

          {!isOwner ? (
            <button 
              onClick={handleBuy} 
              disabled={isProcessing || isSoldOut} 
              className={cn(
                "relative overflow-hidden px-6 py-2.5 rounded-lg font-bold text-[11px] uppercase flex items-center gap-2 transition-all shadow-lg", 
                isSoldOut 
                  ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5" 
                  : "bg-primary hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Processing...</span>
                </>
              ) : isSoldOut ? (
                <>
                  <Ban size={14}/>
                  <span>Sold Out</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>Purchase</span>
                </>
              )}
            </button>
          ) : (
            <div className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-[10px] font-bold uppercase border border-white/5 flex items-center gap-2">
              <User size={12}/> You Own This
            </div>
          )}
        </div>
      </div>
    </div>
  );
}