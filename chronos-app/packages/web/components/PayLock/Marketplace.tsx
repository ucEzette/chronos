"use client";

import { useReadContract, useAccount, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Loader2, Lock, Download, Share2, Play, Pause, Music, FileText } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// --- Audio Player Component ---
const AudioPreview = ({ src }: { src: string }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  return (
    <div className="h-32 w-full bg-zinc-800 rounded-lg flex flex-col items-center justify-center relative group cursor-pointer mb-4" onClick={toggle}>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} />
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
        {playing ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </div>
      <p className="text-xs font-bold text-muted mt-3">10s Preview</p>
    </div>
  );
};

// --- Main Item Component ---
function MarketItem({ item }: { item: any }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState("idle");

  const isSeller = item.seller.toLowerCase() === address?.toLowerCase();
  const isBuyer = item.buyer.toLowerCase() === address?.toLowerCase();
  const isOwner = isSeller || isBuyer;

  const copyLink = () => {
    const url = `${window.location.origin}/item/${item.id}`;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  const handleBuy = async () => {
    try {
      setStatus("buying");
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [item.id],
        value: item.price,
      });
      setStatus("bought");
    } catch (e) { console.error(e); setStatus("idle"); }
  };

  const handleDeliver = async () => {
    try {
      const originalKey = localStorage.getItem(`paylock_key_${item.ipfsCid}`);
      if (!originalKey) return alert("Key not found on this device!");
      setStatus("delivering");
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'deliverKey',
        args: [item.id, originalKey],
      });
      setStatus("delivered");
    } catch (e) { console.error(e); setStatus("idle"); }
  };

  // Render logic for different file types
  const renderPreview = () => {
    const previewUrl = `https://gateway.pinata.cloud/ipfs/${item.previewCid}`;
    
    // 1. Audio Snippet
    if (item.fileType.includes("audio") && item.previewCid) {
       return <AudioPreview src={previewUrl} />;
    }
    // 2. Video Frame (Image)
    if (item.fileType.includes("video") && item.previewCid) {
      return (
        <div className="h-32 w-full bg-black mb-4 rounded-lg overflow-hidden relative group">
          <img src={previewUrl} className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <Play size={16} className="text-white ml-0.5" />
             </div>
          </div>
        </div>
      );
    }
    // 3. Image (Blurred/Cropped)
    if (item.fileType.includes("image") && item.previewCid) {
      return (
        <div className="h-32 w-full bg-black mb-4 rounded-lg overflow-hidden relative">
          <img src={previewUrl} className="w-full h-full object-cover" />
        </div>
      );
    }
    // 4. Docs (Custom Cover or Default)
    if (item.previewCid) {
       return (
        <div className="h-32 w-full bg-zinc-800 mb-4 rounded-lg overflow-hidden relative">
          <img src={previewUrl} className="w-full h-full object-cover opacity-60" />
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold flex items-center gap-1">
            <FileText size={10} /> DOCUMENT
          </div>
        </div>
       );
    }

    // Fallback
    return <div className="h-32 w-full bg-zinc-800 mb-4 rounded-lg flex items-center justify-center text-zinc-600"><Lock size={32}/></div>;
  };

  return (
    <div className="bg-zinc-900/50 border border-border rounded-xl p-4 flex flex-col justify-between h-full hover:border-primary/30 transition-all group relative">
      <button onClick={copyLink} className="absolute top-3 right-3 text-muted hover:text-white z-20 bg-black/50 p-1.5 rounded-full backdrop-blur-sm">
        <Share2 size={14} />
      </button>

      <div>
        {renderPreview()}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-white text-lg truncate flex-1">{item.name}</h3>
          <span className="bg-white/5 border border-white/10 text-white text-xs px-2 py-1 rounded-full font-mono ml-2">
            {formatEther(item.price)} MOCK
          </span>
        </div>
        <p className="text-xs text-muted font-mono mb-4">Seller: {item.seller.slice(0,6)}...{item.seller.slice(-4)}</p>
      </div>

      <div className="pt-4 border-t border-white/5">
        {!item.isSold && (
          <button 
            onClick={handleBuy} 
            disabled={status !== "idle" || isSeller}
            className={cn("w-full py-2.5 font-bold rounded-lg transition-all", isSeller ? "bg-white/5 text-muted cursor-not-allowed" : "bg-white text-black hover:bg-gray-200")}
          >
            {isSeller ? "Your Listing" : status === "buying" ? "Purchasing..." : "Buy Now"}
          </button>
        )}

        {item.isSold && !item.isKeyDelivered && (
          <div className="space-y-2">
             <div className="text-center text-yellow-500 text-xs font-bold bg-yellow-500/10 py-1 rounded">Pending Delivery</div>
             {isSeller && <button onClick={handleDeliver} className="w-full py-2 bg-green-600 text-white font-bold rounded-lg text-sm">Release Key</button>}
          </div>
        )}

        {item.isSold && item.isKeyDelivered && (
          isBuyer ? (
             <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs">
               <code className="block bg-black/30 p-1 rounded mb-2 break-all text-green-200">{item.encryptedKey}</code>
               <a href={`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`} target="_blank" className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 text-white rounded font-bold"><Download size={14}/> Download File</a>
             </div>
          ) : <div className="text-center text-xs text-green-500 font-bold py-2">SOLD</div>
        )}
      </div>
    </div>
  );
}

export function Marketplace() {
  const { data: items, isLoading, error } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (error) return <div className="text-red-500 text-center p-10">Error loading items.</div>;

  const itemList = (items as any[]) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {itemList.map((item) => <MarketItem key={item.id} item={item} />)}
      {itemList.length === 0 && <div className="text-muted text-center col-span-2 py-10">No items found.</div>}
    </div>
  );
}