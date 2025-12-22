"use client";

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { useState, useEffect } from 'react';
import { Loader2, Search, Play, Rotate3d, Code, FileText, Activity, ShoppingCart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CHRONOS MARKETPLACE
 * Improved with persistent data recovery and merchant lifecycle integration.
 */
export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');
  const [search, setSearch] = useState("");

  // RESTORE DATA: Direct contract synchronization
  const { data: items, isLoading, refetch } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  const allItems = (items as any[]) || [];
  
  const filtered = allItems.filter(i => {
    // Logic to determine availability
    const isSoldOut = i.isSoldOut || Number(i.soldCount) >= Number(i.maxSupply);
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || 
                         i.ipfsCid.toLowerCase().includes(search.toLowerCase());
    
    return activeTab === 'active' ? (!isSoldOut && matchesSearch) : (isSoldOut && matchesSearch);
  });

  return (
    <div className="w-full flex flex-col gap-8 font-display">
      {/* Header Info & Search Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-4 border-b border-white/10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#00E5FF] text-xs font-mono tracking-widest uppercase">
            <span className="size-2 bg-[#00E5FF] rounded-full animate-pulse shadow-[0_0_8px_#00E5FF]"></span>
            System Online // V.2.0.77
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter uppercase">
            Encrypted <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#14b8a6]">Chronicles</span>
          </h1>
          <p className="text-white/60 max-w-lg text-sm font-mono uppercase tracking-tighter">
            Acquire rare data fragments and media logs anonymously via P2P protocol.
          </p>
        </div>

        {/* Tab Control */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 shadow-inner">
          <button 
            onClick={() => setActiveTab('active')} 
            className={cn(
              "px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", 
              activeTab === 'active' ? "bg-[#00E5FF] text-black shadow-neon" : "text-white/60 hover:text-white"
            )}
          >
            Active Market
          </button>
          <button 
            onClick={() => setActiveTab('sold')} 
            className={cn(
              "px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all", 
              activeTab === 'sold' ? "bg-[#00E5FF] text-black shadow-neon" : "text-white/60 hover:text-white"
            )}
          >
            Sold History
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 md:flex-none group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40 group-focus-within:text-[#00E5FF] transition-colors" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-[#00E5FF] outline-none transition-all font-mono text-xs" 
            placeholder="Search hash node..." 
          />
        </div>
      </div>

      {/* Item Grid */}
      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-[#00E5FF]" size={48} />
          <span className="text-xs font-mono text-[#00E5FF] animate-pulse uppercase tracking-widest">Scanning Network Nodes...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filtered.map(item => (
            <MarketItem key={item.id.toString()} item={item} onPurchaseSuccess={refetch} />
          ))}
        </div>
      ) : (
        <div className="py-40 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 mx-auto w-full">
          <p className="text-white/40 font-mono italic uppercase text-xs tracking-widest">
            No matching encrypted fragments detected in this sector.
          </p>
        </div>
      )}
    </div>
  );
}

function MarketItem({ item, onPurchaseSuccess }: { item: any, onPurchaseSuccess: () => void }) {
  const { address } = useAccount();
  const { writeContractAsync, data: hash } = useWriteContract();
  
  // Track on-chain transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Update Marketplace state after successful acquisition
  useEffect(() => {
    if (isConfirmed) onPurchaseSuccess();
  }, [isConfirmed, onPurchaseSuccess]);

  const itemId = BigInt(item.id);
  const isSoldOut = item.isSoldOut || Number(item.soldCount) >= Number(item.maxSupply);
  const isSeller = address?.toLowerCase() === item.seller.toLowerCase();

  /**
   * PURCHASE FUNCTION
   * Connects to CHRONOS Uplink to transfer ownership.
   */
  const handleBuy = async () => {
    if (!address) return;
    try {
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [itemId],
        value: item.price,
      });
    } catch (e) {
      console.error("Uplink Aborted:", e);
    }
  };

  const getFileIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'audio': return <Activity className="size-3.5 mr-1" />;
      case 'video': return <Play className="size-3.5 mr-1" />;
      case 'model': return <Rotate3d className="size-3.5 mr-1" />;
      case 'script': return <Code className="size-3.5 mr-1" />;
      default: return <FileText className="size-3.5 mr-1" />;
    }
  };

  return (
    <div className={cn(
      "group relative bg-[#08161f]/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:-translate-y-1",
      isSoldOut && "grayscale opacity-70"
    )}>
      {/* Type Badge */}
      <div className="absolute top-3 right-3 z-20">
        <span className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-[#00E5FF] border border-[#00E5FF]/30 uppercase font-mono tracking-wider">
          {getFileIcon(item.fileType)}
          {item.fileType}
        </span>
      </div>

      {/* Preview Section */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
        <img 
          src={`https://gateway.pinata.cloud/ipfs/${item.previewCid}`} 
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
          alt={item.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020609] via-transparent to-transparent" />
        
        {/* Equalizer animation for Audio items */}
        {item.fileType.toLowerCase() === 'audio' && (
          <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end justify-center gap-1 pb-4 px-4">
            {[30, 50, 80, 40, 60, 90, 45, 20].map((h, i) => (
              <div key={i} className="bar w-1 bg-[#00E5FF] rounded-full animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * -0.2}s` }}></div>
            ))}
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="border-4 border-white text-white px-6 py-2 text-2xl font-black uppercase transform -rotate-12 bg-[#00E5FF]/20 backdrop-blur-sm shadow-neon">
              SOLD OUT
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-[#00E5FF] transition-colors truncate font-mono uppercase">
            {item.name}
          </h3>
          <p className="text-white/50 text-[10px] font-mono mt-1 uppercase tracking-tighter">
            {item.ipfsCid.slice(0, 16)}... // SUPPLY: {Number(item.soldCount)}/{Number(item.maxSupply)}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Cost</span>
            <span className="text-lg font-bold text-white font-mono">{formatEther(item.price)} MOCK</span>
          </div>

          {!isSeller && (
            <button 
              onClick={handleBuy}
              disabled={isSoldOut || isConfirming || isConfirmed}
              className={cn(
                "px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2",
                isSoldOut || isConfirmed
                  ? "bg-white/5 text-white/20 border border-white/10 cursor-not-allowed" 
                  : "bg-[#00E5FF] hover:bg-cyan-300 text-black shadow-neon active:scale-95"
              )}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="animate-spin size-3" />
                  UPLINKING...
                </>
              ) : isConfirmed ? (
                <>
                  <ShieldCheck size={14} />
                  ACQUIRED
                </>
              ) : isSoldOut ? (
                "UNAVAILABLE"
              ) : (
                <><ShoppingCart size={14} /> BUY NOW</>
              )}
            </button>
          )}

          {isSeller && (
            <div className="text-[10px] font-mono text-[#14b8a6] border border-[#14b8a6]/30 bg-[#14b8a6]/10 px-3 py-1 rounded-full uppercase font-bold">
              Your Listing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}