"use client";

import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';
import { formatEther, createPublicClient, http } from 'viem';
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';
import { datahaven, arcTestnet } from '@/lib/chains';
import { Loader2, Lock, Download, CheckCircle, AlertTriangle, ArrowLeft, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ItemPage({ params }: { params: { id: string } }) {
  const { address, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  
  const [item, setItem] = useState<any>(null);
  const [itemChainId, setItemChainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle");
  const [ownership, setOwnership] = useState<[boolean, string]>([false, ""]);

  // 1. SCAN BOTH CHAINS TO FIND ITEM
  useEffect(() => {
    const findItem = async () => {
      setLoading(true);
      const chains = [datahaven, arcTestnet];
      
      for (const c of chains) {
        try {
          const client = createPublicClient({ chain: c, transport: http() });
          const contractAddr = CONTRACT_ADDRESSES[c.id];
          
          const items = await client.readContract({
            address: contractAddr,
            abi: PAYLOCK_ABI,
            functionName: 'getMarketplaceItems',
          }) as any[];

          const found = items.find((i: any) => i.id.toString() === params.id);
          
          if (found) {
            setItem(found);
            setItemChainId(c.id);
            
            // Check ownership if connected
            if (address) {
              const owned = await client.readContract({
                address: contractAddr,
                abi: PAYLOCK_ABI,
                functionName: 'checkOwnership',
                args: [found.id, address]
              }) as [boolean, string];
              setOwnership(owned);
            }
            setLoading(false);
            return; // Stop searching once found
          }
        } catch (e) { console.error(`Error scanning chain ${c.id}`, e); }
      }
      setLoading(false);
    };
    findItem();
  }, [params.id, address]);

  // Logic Helpers
  const isSeller = item && address && item.seller.toLowerCase() === address.toLowerCase();
  const isBuyer = ownership[0];
  const myKey = ownership[1];
  const isDelivered = myKey.length > 0;
  const isSoldOut = item ? (item.isSoldOut || Number(item.soldCount) >= Number(item.maxSupply)) : false;
  
  // Is user on the WRONG network for this item?
  const isWrongNetwork = itemChainId && chain?.id !== itemChainId;
  const currencySymbol = itemChainId === 5042002 ? "USDC" : "MOCK";

  const handleBuy = async () => {
    if (!item || !itemChainId) return;

    // Auto-Switch Network if needed
    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: itemChainId });
      } catch (e) {
        alert("Please switch networks in your wallet to buy this item.");
        return;
      }
    }

    try {
      setStatus("buying");
      const contractAddr = CONTRACT_ADDRESSES[itemChainId];
      await writeContractAsync({
        address: contractAddr,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [item.id],
        value: item.price,
      });
      setStatus("bought");
      alert("Purchase Successful!");
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020e14] text-white"><Loader2 className="animate-spin text-primary" size={40}/></div>;
  
  if (!item) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020e14] text-white gap-4">
      <AlertTriangle size={48} className="text-yellow-500"/>
      <h1 className="text-2xl font-bold">Item Not Found on Any Chain</h1>
      <Link href="/" className="text-primary hover:underline">Return Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020e14] text-white p-6 flex flex-col items-center font-display">
      <div className="w-full max-w-2xl mt-10">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Marketplace
        </Link>

        <div className="bg-[#0b1a24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header Preview */}
          <div className="h-80 bg-black relative flex items-center justify-center overflow-hidden group">
             {item.previewCid ? (
               <img src={`https://gateway.pinata.cloud/ipfs/${item.previewCid.replace("ipfs://", "")}`} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
             ) : (
               <div className="flex flex-col items-center text-zinc-600">
                 <Lock size={64} />
                 <p className="font-mono text-sm mt-4">ENCRYPTED CONTENT</p>
               </div>
             )}
             
             {/* Network Badge Overlay */}
             <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                <Globe size={14} className={itemChainId === 55931 ? "text-cyan-400" : "text-blue-500"}/>
                <span className="text-xs font-bold uppercase">{itemChainId === 55931 ? "DataHaven" : "Arc Testnet"}</span>
             </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <div className="flex justify-between items-start">
                <h1 className="text-3xl font-bold uppercase tracking-tight">{item.name}</h1>
                <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full font-mono font-bold text-lg shadow-glow-primary">
                  {formatEther(item.price)} {currencySymbol}
                </span>
              </div>
              <p className="text-gray-400 mt-2 font-mono text-xs uppercase tracking-widest">Seller: {item.seller}</p>
              
              <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                 <div className="h-full bg-primary" style={{ width: `${(Number(item.soldCount) / Number(item.maxSupply)) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1 uppercase">
                <span>Supply: {Number(item.soldCount)} / {Number(item.maxSupply)}</span>
                <span>{(Number(item.soldCount) / Number(item.maxSupply) * 100).toFixed(0)}% Minted</span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* ACTION AREA */}
            <div className="space-y-4">
              {isSeller ? (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
                  <p className="text-blue-200 font-bold uppercase text-xs tracking-widest">Owner Dashboard</p>
                  <p className="text-xs text-blue-300/70 mt-1">Check your profile for delivery actions.</p>
                </div>
              ) : isBuyer ? (
                 isDelivered ? (
                   <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-xl space-y-4 animate-in fade-in">
                      <div className="flex items-center gap-3 text-green-400 font-bold text-lg">
                        <CheckCircle /> Purchase Complete
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-green-500/20">
                        <p className="text-[10px] text-gray-500 mb-1 uppercase font-bold tracking-widest">Decryption Key</p>
                        <code className="break-all text-green-200 font-mono text-sm">{myKey}</code>
                      </div>
                      <a 
                        href={`https://gateway.pinata.cloud/ipfs/${item.ipfsCid.replace("ipfs://", "")}`} 
                        target="_blank"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg"
                      >
                        <Download size={20} /> Download Encrypted File
                      </a>
                   </div>
                 ) : (
                   <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl text-center space-y-2">
                     <p className="text-yellow-500 font-bold text-lg uppercase tracking-wide">Processing</p>
                     <p className="text-sm text-yellow-200/70 font-mono">Waiting for seller to release the key.</p>
                   </div>
                 )
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={status !== "idle" || isSoldOut}
                  className={cn(
                    "w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    isSoldOut 
                      ? "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5" 
                      : isWrongNetwork 
                        ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-glow-yellow" 
                        : "bg-primary hover:bg-cyan-400 text-black shadow-glow-primary"
                  )}
                >
                  {status === "buying" ? (
                    <><Loader2 className="animate-spin"/> processing...</>
                  ) : isSoldOut ? (
                    "Sold Out"
                  ) : isWrongNetwork ? (
                    `Switch to ${itemChainId === 55931 ? "DataHaven" : "Arc"} to Buy`
                  ) : (
                    "Acquire Artifact"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}