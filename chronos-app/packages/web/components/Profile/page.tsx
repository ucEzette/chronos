"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Navigation } from "../../components/Navigation";
import { ProfileSidebar } from "../../components/Profile/ProfileSidebar";
import { ProfileInventory } from "../../components/Profile/ProfileInventory";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";

function ProfileContent() {
  const { address } = useAccount();
  
  // Real-time synchronization with the blockchain ledger
  const { data: rawItems, isLoading, refetch } = useReadContract({
    address: PAYLOCK_ADDRESS,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
  });

  // Polling mechanism to catch background "Deliver Key" events from merchants
  useEffect(() => {
    const interval = setInterval(() => refetch(), 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const allItems = (rawItems as any[]) || [];
  const myPurchases = allItems.filter(item => item.isPurchasedByMe);

  return (
    <div className="bg-background-dark text-white min-h-screen flex flex-col font-display selection:bg-primary relative overflow-hidden">
      {/* Background Grids */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,224,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,198,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
      </div>

      <Navigation />

      <main className="relative z-10 flex-grow w-full max-w-[1440px] mx-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-10">
        <ProfileSidebar address={address} itemsCount={myPurchases.length} />
        
        <div className="flex-1 flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Synchronized <span className="text-primary">Inventory</span></h2>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Temporal_Ledger :: v.2.0.77</p>
          </div>
          
          <ProfileInventory items={myPurchases} isLoading={isLoading} />
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