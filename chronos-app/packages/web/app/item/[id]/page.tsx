"use client";

import { useReadContract, useAccount, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Loader2, Lock, Download, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ItemPage({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState("idle");

  // FIX: Fetch ALL items, then find the one matching the ID
  const { data: items, isLoading } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  // Find the specific item from the list
  const item = items ? (items as any[]).find(i => i.id.toString() === params.id) : null;

  // --- Logic Helpers ---
  const isSeller = item && address && item.seller.toLowerCase() === address.toLowerCase();
  
  // Safe check for "sold out" using the new supply fields
  const soldCount = item ? Number(item.soldCount) : 0;
  const maxSupply = item ? Number(item.maxSupply) : 0;
  const isSoldOut = item ? (item.isSoldOut || soldCount >= maxSupply) : false;

  // Check Ownership Logic (Did I buy it?)
  const { data: myOwnership } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'checkOwnership',
    args: [BigInt(params.id), address as `0x${string}`],
    query: { enabled: !!address && !!item && !isSeller }
  });

  const isBuyer = myOwnership?.[0] || false;
  const myKey = myOwnership?.[1] || "";
  const isDelivered = myKey.length > 0;

  const handleBuy = async () => {
    if (!item) return;
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
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-white"><Loader2 className="animate-spin" size={40}/></div>;
  
  if (!item) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white gap-4">
      <AlertTriangle size={48} className="text-yellow-500"/>
      <h1 className="text-2xl font-bold">Item Not Found</h1>
      <Link href="/" className="text-primary hover:underline">Return Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <Link href="/" className="flex items-center gap-2 text-muted hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Marketplace
        </Link>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
          {/* Header Preview */}
          <div className="h-64 bg-black relative flex items-center justify-center overflow-hidden">
             {item.previewCid ? (
               <img src={`https://gateway.pinata.cloud/ipfs/${item.previewCid}`} className="w-full h-full object-cover opacity-80" />
             ) : (
               <div className="flex flex-col items-center text-zinc-600">
                 <Lock size={64} />
                 <p className="font-mono text-sm mt-4">ENCRYPTED CONTENT</p>
               </div>
             )}
             
             {isSoldOut && !isBuyer && (
               <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                 <span className="text-red-500 font-bold text-3xl border-4 border-red-500 px-6 py-2 -rotate-12 rounded-lg">SOLD OUT</span>
               </div>
             )}
          </div>

          <div className="p-8 space-y-6">
            <div>
              <div className="flex justify-between items-start">
                <h1 className="text-3xl font-bold">{item.name}</h1>
                <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-full font-mono font-bold text-lg">
                  {formatEther(item.price)} MOCK
                </span>
              </div>
              <p className="text-muted mt-2 font-mono text-sm">Seller: {item.seller}</p>
              <div className="flex items-center gap-2 mt-2 text-xs font-bold text-zinc-500">
                <span>Supply: {soldCount} / {maxSupply}</span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* ACTION AREA */}
            <div className="space-y-4">
              {isSeller ? (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
                  <p className="text-blue-200 font-bold">You are the seller.</p>
                  <p className="text-xs text-blue-300/70 mt-1">Manage deliveries from the main Dashboard.</p>
                </div>
              ) : isBuyer ? (
                 isDelivered ? (
                   <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-xl space-y-4 animate-in fade-in">
                      <div className="flex items-center gap-3 text-green-400 font-bold text-lg">
                        <CheckCircle /> Purchase Complete
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg">
                        <p className="text-xs text-muted mb-1 uppercase font-bold">Decryption Key</p>
                        <code className="break-all text-green-200 font-mono text-sm">{myKey}</code>
                      </div>
                      <a 
                        href={`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`} 
                        target="_blank"
                        className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all"
                      >
                        <Download size={20} /> Download Encrypted File
                      </a>
                   </div>
                 ) : (
                   <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl text-center space-y-2">
                     <p className="text-yellow-500 font-bold text-lg">Payment Successful</p>
                     <p className="text-sm text-yellow-200/70">Waiting for seller to release the key. Check back soon.</p>
                   </div>
                 )
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={status !== "idle" || isSoldOut}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isSoldOut 
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                      : "bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10"
                  }`}
                >
                  {status === "buying" ? "Confirming Transaction..." : isSoldOut ? "Sold Out" : "Buy Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}