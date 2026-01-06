"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAccount, useWriteContract, useReadContract, useSwitchChain } from "wagmi";
import { formatEther, parseAbiItem, createPublicClient, http } from "viem";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts"; 
import { getIPFSUrl } from "@/lib/ipfs"; 
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, Download, Shield, Clock, User, Globe, Share2, 
  Check, Play, Pause, FileText, Lock, AlertTriangle, Loader2
} from "lucide-react";

export default function ItemDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address, chain: currentChain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const itemId = BigInt(params?.id as string || "0");
  const targetChainId = Number(searchParams?.get('chain') || "55931"); // Default to DataHaven

  // State
  const [meta, setMeta] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 1. Fetch Item Data
  const contractAddr = CONTRACT_ADDRESSES[targetChainId];
  const { data: rawItems, isLoading: isItemLoading } = useReadContract({
    address: contractAddr,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
    chainId: targetChainId,
  });

  const { data: ownershipData } = useReadContract({
    address: contractAddr,
    abi: PAYLOCK_ABI,
    functionName: 'checkOwnership',
    args: [itemId, address || "0x0000000000000000000000000000000000000000"],
    chainId: targetChainId,
    query: { enabled: !!address }
  });

  const item = (rawItems as any[])?.find(i => i.id === itemId);
  const isOwner = ownershipData?.[0] === true;

  // 2. Fetch Metadata
  useEffect(() => {
    if (!item?.previewCid) return;
    const loadMeta = async () => {
      try {
        const url = getIPFSUrl(item.previewCid);
        if (!url) return;
        const res = await fetch(url);
        if (res.headers.get("content-type")?.includes("application/json")) {
          const json = await res.json();
          setMeta({
            ...json,
            image: getIPFSUrl(json.image),
            animation_url: getIPFSUrl(json.animation_url)
          });
        } else {
          setMeta({ image: url }); // Fallback
        }
      } catch (e) { console.error(e); }
    };
    loadMeta();
  }, [item]);

  if (isItemLoading || !item) return (
    <div className="min-h-screen bg-[#020e14] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  // Logic
  const type = item.fileType.toUpperCase();
  const sold = Number(item.soldCount);
  const max = Number(item.maxSupply);
  const isSoldOut = item.isSoldOut || sold >= max;
  
  const handleBuy = async () => {
    if (currentChain?.id !== targetChainId) {
      try { await switchChainAsync({ chainId: targetChainId }); } 
      catch { alert("Please switch network manually."); return; }
    }
    
    setIsBuying(true);
    try {
      await writeContractAsync({
        address: contractAddr,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [itemId],
        value: item.price
      });
      alert("Purchase Successful!");
      router.refresh();
    } catch (e: any) {
      alert("Error: " + (e.reason || e.message));
    } finally {
      setIsBuying(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePlay = () => {
    if (type.includes("VIDEO") && videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); }
    else if (type.includes("AUDIO") && audioRef.current) { isPlaying ? audioRef.current.pause() : audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-[#020e14] text-white font-display flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:py-12">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} /> Back to Market
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* LEFT: PREVIEW */}
          <div className="space-y-6">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl group">
               {meta?.animation_url && type.includes("VIDEO") ? (
                  <video ref={videoRef} src={meta.animation_url} className="w-full h-full object-cover" loop muted={!isPlaying} poster={meta?.image}/>
                ) : meta?.image ? (
                  <img src={meta.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5"><FileText size={60} className="text-white/20"/></div>
                )}
                
                {/* Audio Element */}
                {meta?.animation_url && type.includes("AUDIO") && <audio ref={audioRef} src={meta.animation_url} loop />}

                {/* Play Button Overlay */}
                {(type.includes("VIDEO") || type.includes("AUDIO")) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                    <button onClick={togglePlay} className="bg-primary/90 text-black p-4 rounded-full shadow-neon hover:scale-110 transition-transform">
                      {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}
                    </button>
                  </div>
                )}
            </div>

            {/* Chain Info */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-blue-500/10 text-blue-400"><Globe size={20}/></div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold">Network</p>
                    <p className="text-sm font-bold">{targetChainId === 55931 ? "DataHaven Testnet" : "Arc Testnet"}</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-bold">Contract</p>
                  <p className="text-sm font-mono text-primary truncate w-24">{contractAddr.slice(0,6)}...{contractAddr.slice(-4)}</p>
               </div>
            </div>
          </div>

          {/* RIGHT: DETAILS */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex justify-between items-start">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2">{item.name}</h1>
                <button onClick={handleShare} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  {copied ? <Check size={18} className="text-green-500"/> : <Share2 size={18}/>}
                </button>
              </div>
              <p className="text-primary font-mono text-sm mb-4">ID: #{item.id.toString()} • {type.replace('.','')}</p>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-black font-bold">
                  <User size={20}/>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Creator</p>
                  <p className="text-sm font-mono">{item.seller.slice(0,6)}...{item.seller.slice(-4)}</p>
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-sm font-bold uppercase text-gray-400 mb-3 flex items-center gap-2"><FileText size={14}/> Artifact Manifest</h3>
              <p className="text-gray-300 leading-relaxed text-sm">
                {meta?.description || item.description || "No encrypted data description provided by the seller."}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Supply</p>
                  <p className="text-xl font-mono font-bold">{sold} / {max}</p>
               </div>
               <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Status</p>
                  <p className={cn("text-xl font-mono font-bold uppercase", isSoldOut ? "text-red-500" : "text-green-500")}>
                    {isSoldOut ? "Sold Out" : "Active"}
                  </p>
               </div>
            </div>

            {/* Action Area */}
            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex justify-between items-end mb-6">
                <span className="text-sm text-gray-400 font-bold uppercase">Price</span>
                <span className="text-4xl font-black text-white tracking-tight">{formatEther(item.price)} <span className="text-lg text-primary">MOCK</span></span>
              </div>

              {isOwner ? (
                <button disabled className="w-full py-4 bg-green-500/20 text-green-400 border border-green-500/50 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 cursor-not-allowed">
                  <Check size={20}/> You Own This Artifact
                </button>
              ) : (
                <button 
                  onClick={handleBuy}
                  disabled={isSoldOut || isBuying}
                  className={cn("w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-neon hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg", 
                    isSoldOut ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-primary text-black hover:bg-white")}
                >
                  {isBuying ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
                  {isSoldOut ? "Artifact Unavailable" : "Acquire Secure Key"}
                </button>
              )}
              
              <p className="text-center text-[10px] text-gray-600 mt-4 uppercase tracking-widest flex items-center justify-center gap-1">
                <Shield size={10}/> Secured by Chronos Smart Contract
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}