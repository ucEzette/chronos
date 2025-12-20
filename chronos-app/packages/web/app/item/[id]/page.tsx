"use client";

import { useParams } from 'next/navigation';
import { useReadContract, useConnect, useAccount } from 'wagmi';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { Providers } from '@/components/Providers';
import { Loader2, AlertTriangle, ShieldCheck, Wallet } from 'lucide-react';
import { formatEther } from 'viem';

function ItemView() {
  const params = useParams();
  const { id } = params;
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const { data: item, isLoading } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getItem',
    args: [BigInt(id as string)],
  });

  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  
  if (!item) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Item not found.</div>;

  const typedItem = item as any;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-600/20 p-3 rounded-full text-blue-500">
            <ShieldCheck size={32} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">{typedItem.name}</h1>
        <div className="text-center text-muted mb-6">
          Price: <span className="text-white font-bold">{formatEther(typedItem.price)} MOCK</span>
        </div>

        {/* Simplified Preview for Shared Link */}
        {typedItem.previewCid && (
           <div className="h-48 w-full bg-black rounded-lg overflow-hidden mb-6 relative">
             <img src={`https://gateway.pinata.cloud/ipfs/${typedItem.previewCid}`} className="w-full h-full object-cover opacity-60 blur-sm" />
             <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">PREVIEW</div>
           </div>
        )}

        {!isConnected ? (
           <button onClick={() => connect({ connector: connectors[0] })} className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">
             <Wallet size={18} /> Connect to Buy
           </button>
        ) : (
           <div className="text-center bg-zinc-800 py-3 rounded-xl text-sm text-zinc-400">
             Go to main dashboard to complete purchase.
           </div>
        )}
      </div>
      <div className="mt-8 text-zinc-600 text-xs">Powered by Chronos PayLock</div>
    </div>
  );
}

export default function Page() {
  return (
    <Providers>
      <ItemView />
    </Providers>
  );
}