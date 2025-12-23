"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useDisconnect } from "wagmi";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { Copy, Power, Box } from "lucide-react";
import { formatEther } from "viem";

function ProfileContent() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  
  // 1. Fetch All Items
  const { data: rawItems } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  const allItems = (rawItems as any[]) || [];

  // 2. Fetch Ownership Status
  const { data: ownershipData } = useReadContracts({
    contracts: allItems.map(item => ({
      address: PAYLOCK_ADDRESS,
      abi: PAYLOCK_ABI,
      functionName: 'checkOwnership',
      args: [item.id, address],
    })),
    query: { enabled: !!address && allItems.length > 0 }
  });

  // 3. Filter My Purchases
  const myPurchases = allItems.filter((_, index) => {
    const ownership = ownershipData?.[index]?.result as [boolean, string] | undefined;
    return ownership && ownership[0] === true;
  });

  return (
    <div className="bg-[#020e14] text-white min-h-screen flex flex-col font-display relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,224,198,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,198,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <Navigation />

      <main className="relative z-10 flex-grow w-full max-w-[1440px] mx-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-10">
        
        {/* Profile Sidebar */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 z-10">
          <div className="bg-[#0b1a24]/60 backdrop-blur-md rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden border border-primary/20 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-cyan-500 to-primary"></div>
            
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-800 to-black ring-4 ring-white/5 shadow-glow-primary flex items-center justify-center">
                 <span className="text-4xl">👾</span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#020e14] border border-primary rounded-full p-1.5">
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#40E0D0]"></div>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-1 tracking-tight uppercase">User_{address?.slice(-4)}</h1>
            <p className="text-primary text-xs font-medium mb-6 font-mono uppercase">Level 1 Time Keeper</p>
            
            <div className="w-full bg-black/40 rounded-lg p-3 mb-4 border border-white/5 text-left group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigator.clipboard.writeText(address || "")}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Wallet Address</p>
              <div className="flex justify-between items-center">
                <code className="text-cyan-400 text-xs font-mono truncate mr-2">{address}</code>
                <Copy size={12} className="text-gray-500 group-hover:text-white"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase">Purchased</p>
                <p className="text-white font-bold font-mono">{myPurchases.length}</p>
              </div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase">Trust</p>
                <p className="text-primary font-bold font-mono">100%</p>
              </div>
            </div>

            <button onClick={() => disconnect()} className="w-full py-3 px-4 bg-red-900/10 hover:bg-red-900/20 border border-red-500/20 hover:border-red-500/50 text-red-400 rounded-lg transition-all text-xs font-mono font-bold flex items-center justify-center gap-2 uppercase tracking-wide">
              <Power size={14}/> Disconnect Session
            </button>
          </div>
        </aside>
        
        {/* Inventory Grid */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-1 text-white">Synchronized <span className="text-primary">Inventory</span></h2>
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Temporal_Ledger :: v.2.0.77</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myPurchases.map((item) => (
              <div key={item.id} className="bg-[#0b1a24]/40 border border-white/10 rounded-xl p-4 hover:border-primary/40 transition-all group">
                <div className="aspect-square bg-black/50 rounded-lg mb-4 overflow-hidden relative">
                  <img src={`https://gateway.pinata.cloud/ipfs/${item.previewCid}`} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"/>
                </div>
                <h3 className="font-bold text-white text-sm uppercase mb-1">{item.name}</h3>
                <p className="text-xs text-gray-500 font-mono">ID: #{item.id.toString()}</p>
              </div>
            ))}
            {myPurchases.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500 font-mono uppercase">
                <Box size={48} className="mx-auto mb-4 opacity-20"/>
                No artifacts acquired yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <ProfileContent />;
}