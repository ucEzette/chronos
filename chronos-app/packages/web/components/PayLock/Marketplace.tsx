"use client";

import { useReadContract, useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Loader2, Lock, Share2, Play, Pause, FileText, CheckCircle, Truck, User, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// --- 1. Strict Type Definition ---
type DeliveryStatusMap = Record<string, boolean>;

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
      <p className="text-xs font-bold text-muted mt-3">Preview Audio</p>
    </div>
  );
};

function MarketItem({ item }: { item: any }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient(); 

  const [status, setStatus] = useState("idle");
  const [buyers, setBuyers] = useState<string[]>([]); 
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatusMap>({}); 
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);

  const isSeller = item.seller.toLowerCase() === address?.toLowerCase();
  
  const soldCount = Number(item.soldCount);
  const maxSupply = Number(item.maxSupply);
  const isSoldOut = item.isSoldOut || soldCount >= maxSupply;

  const { data: myOwnership } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'checkOwnership',
    args: [BigInt(item.id), address as `0x${string}`],
    query: { enabled: !!address && !isSeller }
  });

  const isBuyer = myOwnership?.[0] || false;
  const myKey = myOwnership?.[1] || "";
  const isDeliveredToMe = myKey.length > 0;

  // --- 2. OPTIMIZED FETCH LOGIC ---
  useEffect(() => {
    if (!isSeller || !publicClient) return;

    let attempts = 0;
    const maxAttempts = 3; 

    const fetchOrders = async () => {
      setIsFetchingOrders(true);
      try {
        // OPTIMIZATION: Get current block and only scan back 100k blocks.
        // This prevents the "TimeoutError" from scanning the whole chain.
        const currentBlock = await publicClient.getBlockNumber();
        
        // FIX: Use BigInt() wrapper instead of 'n' suffix
        const startBlock = currentBlock - BigInt(100000); // Look back ~2-3 days
        
        console.log(`Scanning from block ${startBlock} to ${currentBlock}...`);

        const logs = await publicClient.getContractEvents({
          address: PAYLOCK_ADDRESS,
          abi: PAYLOCK_ABI,
          eventName: 'ItemPurchased',
          args: { id: BigInt(item.id) },
          // FIX: Use BigInt(0) wrapper
          fromBlock: startBlock > BigInt(0) ? startBlock : 'earliest'
        });

        const uniqueBuyers = Array.from(new Set(logs.map(l => l.args.buyer as string)));
        setBuyers(uniqueBuyers);

        // Check Delivery Status
        const newStatuses: DeliveryStatusMap = {};
        for (const rawBuyer of uniqueBuyers) {
          const buyerKey = String(rawBuyer);
          const data = await publicClient.readContract({
            address: PAYLOCK_ADDRESS,
            abi: PAYLOCK_ABI,
            functionName: 'checkOwnership',
            args: [BigInt(item.id), buyerKey as `0x${string}`]
          }) as [boolean, string]; 
          
          // STRICT BOOLEAN FIX
          newStatuses[buyerKey] = data[1].length > 0;
        }
        setDeliveryStatus(newStatuses);

        // Retry if we expect sales but found none (and haven't retried too much)
        if (soldCount > 0 && uniqueBuyers.length === 0 && attempts < maxAttempts) {
          attempts++;
          console.warn("Sales detected but logs empty. Retrying...");
          setTimeout(fetchOrders, 3000); 
        } else {
          setIsFetchingOrders(false);
        }

      } catch (e) {
        console.error("Error loading orders (likely RPC timeout):", e);
        setIsFetchingOrders(false);
      }
    };

    fetchOrders();

  }, [isSeller, item.id, publicClient, status, soldCount, refreshTrigger]);

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
        args: [BigInt(item.id)],
        value: item.price,
      });
      setStatus("bought");
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 2000);
    } catch (e) { console.error(e); setStatus("idle"); }
  };

  const handleDeliver = async (buyerAddress: string) => {
    try {
      const originalKey = localStorage.getItem(`paylock_key_${item.ipfsCid}`);
      if (!originalKey) return alert("Key not found on this device! Please use the device you uploaded with.");
      
      setStatus(`delivering-${buyerAddress}`);
      
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'deliverKey',
        args: [BigInt(item.id), buyerAddress as `0x${string}`, originalKey],
      });
      
      setStatus("delivered");
      
      setDeliveryStatus(prev => ({
        ...prev, 
        [String(buyerAddress)]: true
      }));

    } catch (e) { 
      console.error(e); 
      setStatus("idle"); 
    }
  };

  const renderPreview = () => {
    const previewUrl = `https://gateway.pinata.cloud/ipfs/${item.previewCid}`;
    if (item.fileType.includes("audio") && item.previewCid) return <AudioPreview src={previewUrl} />;
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
    if (item.previewCid) {
       return (
        <div className="h-32 w-full bg-zinc-800 mb-4 rounded-lg overflow-hidden relative">
          <img src={previewUrl} className="w-full h-full object-cover" />
          {item.fileType.includes("pdf") && <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold flex items-center gap-1"><FileText size={10} /> DOC</div>}
        </div>
       );
    }
    return <div className="h-32 w-full bg-zinc-800 mb-4 rounded-lg flex items-center justify-center text-zinc-600"><Lock size={32}/></div>;
  };

  return (
    <div className="bg-zinc-900/50 border border-border rounded-xl p-4 flex flex-col h-full hover:border-primary/30 transition-all group relative">
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
        <div className="flex justify-between items-center text-xs text-muted font-mono mb-4">
           <span>Seller: {item.seller.slice(0,6)}...</span>
           <span className={isSoldOut ? "text-red-400 font-bold" : "text-green-400"}>
             {soldCount} / {maxSupply} Sold
           </span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
        
        {/* BUY BUTTON */}
        {!isBuyer && !isSeller && (
          <button 
            onClick={handleBuy} 
            disabled={status !== "idle" || isSoldOut}
            className={cn("w-full py-2.5 font-bold rounded-lg transition-all", isSoldOut ? "bg-white/5 text-muted cursor-not-allowed" : "bg-white text-black hover:bg-gray-200")}
          >
            {isSoldOut ? "Sold Out" : status === "buying" ? "Purchasing..." : "Buy Now"}
          </button>
        )}

        {/* BUYER VIEW */}
        {isBuyer && (
          <div className="bg-surface rounded-lg p-2 text-xs">
             {isDeliveredToMe ? (
               <div className="space-y-2">
                 <div className="flex items-center gap-2 text-green-400 font-bold"><CheckCircle size={12}/> Purchase Complete</div>
                 <code className="block bg-black/30 p-1.5 rounded break-all text-white/70">{myKey}</code>
                 <a href={`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`} target="_blank" className="block w-full text-center py-2 bg-green-600 text-white rounded font-bold hover:bg-green-500">
                    Download File
                 </a>
               </div>
             ) : (
               <div className="text-center py-2 text-yellow-500 font-bold bg-yellow-500/10 rounded">
                 Waiting for Seller to Release Key
               </div>
             )}
          </div>
        )}

        {/* SELLER VIEW */}
        {isSeller && (
           <div className="bg-black/20 rounded-lg p-2">
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted uppercase">Orders</span>
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => setRefreshTrigger(prev => prev + 1)} 
                      className={cn("text-muted hover:text-white transition-colors", isFetchingOrders && "animate-spin")}
                      title="Refresh Orders"
                   >
                      <RefreshCw size={12} />
                   </button>
                   <span className="text-[10px] text-muted bg-white/5 px-1.5 rounded">{buyers.length}</span>
                </div>
             </div>
             
             {buyers.length === 0 ? (
               <div className="text-center text-xs text-muted py-2 flex flex-col items-center gap-1">
                 {isFetchingOrders ? <Loader2 size={12} className="animate-spin"/> : <AlertCircle size={12}/>}
                 {isFetchingOrders ? "Scanning blockchain..." : "No sales found yet."}
               </div>
             ) : (
               <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                 {buyers.map((buyerAddr) => (
                   <div key={buyerAddr} className="flex items-center justify-between bg-white/5 p-2 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-muted"/>
                        <span className="font-mono text-white/70">{buyerAddr.slice(0,6)}...</span>
                      </div>
                      
                      {deliveryStatus[String(buyerAddr)] ? (
                        <span className="text-green-500 flex items-center gap-1 font-bold"><CheckCircle size={10}/> Sent</span>
                      ) : (
                        <button 
                          onClick={() => handleDeliver(buyerAddr)}
                          disabled={status.startsWith("delivering")}
                          className="bg-primary hover:bg-primaryHover text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        >
                          {status === `delivering-${buyerAddr}` ? <Loader2 size={10} className="animate-spin"/> : <Truck size={10}/>}
                          Deliver
                        </button>
                      )}
                   </div>
                 ))}
               </div>
             )}
           </div>
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
  if (error) return <div className="text-red-500 text-center p-10">Error loading items. Check console.</div>;

  const itemList = (items as any[]) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {itemList.map((item) => <MarketItem key={item.id} item={item} />)}
      {itemList.length === 0 && <div className="text-muted text-center col-span-2 py-10">No items found.</div>}
    </div>
  );
}