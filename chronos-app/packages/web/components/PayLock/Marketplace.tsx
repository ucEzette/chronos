"use client";

import { useReadContract, useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Loader2, Lock, Play, Pause, FileText, CheckCircle, Truck, RefreshCw, Trash2, Archive, ShoppingBag, Share2, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { decryptFile } from '@/lib/crypto';

// Helper: Get Extension from MIME Type
const getExtension = (mime: string) => {
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('mp3') || mime.includes('mpeg')) return '.mp3';
  if (mime.includes('audio/wav')) return '.wav';
  if (mime.includes('text/plain')) return '.txt';
  return ''; // Default: keep original or let browser decide
};

// Types
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
  // If buyer, use the key delivered on chain. If seller, try localStorage.
  const myKey = isBuyer ? myOwnership?.[1] : (typeof window !== 'undefined' ? localStorage.getItem(`paylock_key_${item.ipfsCid}`) : "");
  const isDeliveredToMe = isBuyer && (myKey && myKey.length > 0);

  // --- DOWNLOAD HANDLER (FIXED EXTENSION LOGIC) ---
  const handleDownload = async () => {
    let keyToUse = myKey;
    if (!keyToUse) {
      keyToUse = prompt("Enter the decryption key for this file:");
      if (!keyToUse) return;
    }

    try {
      setStatus("downloading");
      console.log("Fetching IPFS:", item.ipfsCid);
      
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`);
      if (!response.ok) throw new Error(`IPFS Error: ${response.statusText}`);
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) throw new Error("IPFS Gateway Error (HTML)");

      const encryptedBlob = await response.blob();
      
      // Decrypt
      const mimeType = item.fileType || 'application/octet-stream';
      const decryptedBlob = await decryptFile(encryptedBlob, keyToUse, mimeType);

      // --- FIX: Ensure Filename has Extension ---
      let fileName = item.name;
      const correctExt = getExtension(mimeType);
      // If filename doesn't end with the correct extension, append it
      if (correctExt && !fileName.toLowerCase().endsWith(correctExt)) {
        fileName += correctExt;
      }

      // Save
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName; // Use the fixed filename
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus("idle");
    } catch (e: any) {
      console.error("Download Error:", e);
      alert(`Download Failed: ${e.message}`);
      setStatus("idle");
    }
  };

  useEffect(() => {
    if (!isSeller || !publicClient) return;
    let attempts = 0;
    const maxAttempts = 3; 

    const fetchOrders = async () => {
      setIsFetchingOrders(true);
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const startBlock = currentBlock - BigInt(100000); 
        
        const logs = await publicClient.getContractEvents({
          address: PAYLOCK_ADDRESS,
          abi: PAYLOCK_ABI,
          eventName: 'ItemPurchased',
          args: { id: BigInt(item.id) },
          fromBlock: startBlock > BigInt(0) ? startBlock : 'earliest'
        });

        const uniqueBuyers = Array.from(new Set(logs.map(l => l.args.buyer as string)));
        setBuyers(uniqueBuyers);

        const newStatuses: DeliveryStatusMap = {};
        for (const rawBuyer of uniqueBuyers) {
          const buyerKey = String(rawBuyer);
          const data = await publicClient.readContract({
            address: PAYLOCK_ADDRESS,
            abi: PAYLOCK_ABI,
            functionName: 'checkOwnership',
            args: [BigInt(item.id), buyerKey as `0x${string}`]
          }) as [boolean, string]; 
          newStatuses[buyerKey] = data[1].length > 0;
        }
        setDeliveryStatus(newStatuses);
        
        if (soldCount > 0 && uniqueBuyers.length === 0 && attempts < maxAttempts) {
          attempts++;
          setTimeout(fetchOrders, 3000); 
        } else {
          setIsFetchingOrders(false);
        }
      } catch (e) {
        console.error("Order fetch error:", e);
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
      
      if (!originalKey) {
        const manualKey = prompt("Key not found in this browser. Please enter the original encryption key manually to deliver:");
        if (!manualKey) return;
        
        setStatus(`delivering-${buyerAddress}`);
        await writeContractAsync({
          address: PAYLOCK_ADDRESS,
          abi: PAYLOCK_ABI,
          functionName: 'deliverKey',
          args: [BigInt(item.id), buyerAddress as `0x${string}`, manualKey],
        });
      } else {
        setStatus(`delivering-${buyerAddress}`);
        await writeContractAsync({
          address: PAYLOCK_ADDRESS,
          abi: PAYLOCK_ABI,
          functionName: 'deliverKey',
          args: [BigInt(item.id), buyerAddress as `0x${string}`, originalKey],
        });
      }
      
      setStatus("delivered");
      setDeliveryStatus(prev => ({ ...prev, [String(buyerAddress)]: true }));
    } catch (e) { console.error(e); setStatus("idle"); }
  };

  const handleCancel = async () => {
    if(!confirm("Are you sure? This item will be moved to Sold Out.")) return;
    try {
      setStatus("canceling");
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'cancelListing',
        args: [BigInt(item.id)],
      });
      setStatus("canceled");
      window.location.reload(); 
    } catch (e) { console.error(e); setStatus("idle"); }
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
             {isSoldOut ? "Sold Out" : `${soldCount} / ${maxSupply} Sold`}
           </span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
        {/* Case 1: Buyer (Download) */}
        {isBuyer && (
          <div className="bg-surface rounded-lg p-2 text-xs">
             {isDeliveredToMe ? (
               <div className="space-y-2">
                 <div className="flex items-center gap-2 text-green-400 font-bold"><CheckCircle size={12}/> Purchase Complete</div>
                 <button 
                    onClick={handleDownload} 
                    disabled={status === 'downloading'}
                    className="flex items-center justify-center gap-2 w-full text-center py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition-all"
                  >
                    {status === 'downloading' ? <Loader2 className="animate-spin" size={14}/> : <Download size={14}/>}
                    {status === 'downloading' ? "Decrypting..." : "Download File"}
                 </button>
               </div>
             ) : (
               <div className="text-center py-2 text-yellow-500 font-bold bg-yellow-500/10 rounded">Waiting for Key</div>
             )}
          </div>
        )}

        {/* Case 2: Public Buy Button */}
        {!isBuyer && !isSeller && !isSoldOut && (
          <button 
            onClick={handleBuy} 
            disabled={status !== "idle"}
            className={cn("w-full py-2.5 font-bold rounded-lg transition-all bg-white text-black hover:bg-gray-200")}
          >
            {status === "buying" ? "Purchasing..." : "Buy Now"}
          </button>
        )}

        {/* Case 3: Sold Out Badge */}
        {isSoldOut && !isBuyer && (
           <div className="w-full py-2.5 font-bold rounded-lg bg-zinc-800 text-zinc-500 text-center cursor-not-allowed">
             Unavailable
           </div>
        )}

        {/* Case 4: Seller Tools */}
        {isSeller && (
           <div className="space-y-3">
             <div className="bg-black/20 rounded-lg p-2">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted uppercase">Orders</span>
                  <div className="flex items-center gap-2">
                     <button onClick={() => setRefreshTrigger(prev => prev + 1)} className={cn("text-muted hover:text-white", isFetchingOrders && "animate-spin")}><RefreshCw size={12} /></button>
                     <span className="text-[10px] text-muted bg-white/5 px-1.5 rounded">{buyers.length}</span>
                  </div>
               </div>
               
               {buyers.length === 0 ? (
                 <p className="text-center text-xs text-muted py-2">{isFetchingOrders ? "Scanning..." : "No sales."}</p>
               ) : (
                 <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                   {buyers.map((buyerAddr) => (
                     <div key={buyerAddr} className="flex items-center justify-between bg-white/5 p-2 rounded text-xs">
                        <span className="font-mono text-white/70">{buyerAddr.slice(0,6)}...</span>
                        {deliveryStatus[String(buyerAddr)] ? (
                          <span className="text-green-500 flex items-center gap-1 font-bold"><CheckCircle size={10}/> Sent</span>
                        ) : (
                          <button onClick={() => handleDeliver(buyerAddr)} disabled={status.startsWith("delivering")} className="bg-primary hover:bg-primaryHover text-white px-2 py-1 rounded flex items-center gap-1">
                            {status === `delivering-${buyerAddr}` ? <Loader2 size={10} className="animate-spin"/> : <Truck size={10}/>} Deliver
                          </button>
                        )}
                     </div>
                   ))}
                 </div>
               )}
             </div>

             {!isSoldOut && (
               <button 
                 onClick={handleCancel}
                 disabled={status !== "idle"}
                 className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all border border-red-500/20"
               >
                 {status === "canceling" ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                 Cancel Listing
               </button>
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

  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active');

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (error) return <div className="text-red-500 text-center p-10">Error loading items. Check console.</div>;

  const allItems = (items as any[]) || [];

  const activeItems = allItems.filter(i => {
    const sold = Number(i.soldCount);
    const max = Number(i.maxSupply);
    return !i.isSoldOut && sold < max;
  });

  const soldItems = allItems.filter(i => {
    const sold = Number(i.soldCount);
    const max = Number(i.maxSupply);
    return i.isSoldOut || sold >= max;
  });

  const displayItems = activeTab === 'active' ? activeItems : soldItems;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-2">
         <button onClick={() => setActiveTab('active')} className={cn("flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all", activeTab === 'active' ? "bg-white text-black" : "text-muted hover:text-white")}>
           <ShoppingBag size={16} /> Active Market ({activeItems.length})
         </button>
         <button onClick={() => setActiveTab('sold')} className={cn("flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all", activeTab === 'sold' ? "bg-white text-black" : "text-muted hover:text-white")}>
           <Archive size={16} /> Sold Out / History ({soldItems.length})
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {displayItems.map((item) => <MarketItem key={item.id} item={item} />)}
        {displayItems.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-muted">
             <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
               {activeTab === 'active' ? <ShoppingBag size={24}/> : <Archive size={24}/>}
             </div>
             <p>No items in this section.</p>
          </div>
        )}
      </div>
    </div>
  );
}