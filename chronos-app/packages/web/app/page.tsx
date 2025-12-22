"use client";

import { useEffect, useState } from "react";
import { Navigation } from "../components/Navigation";
import { Marketplace } from "../components/PayLock/Marketplace";

/**
 * Root Marketplace Page
 * Handles hydration to prevent WagmiProviderNotFoundError
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#020609] text-white">
      <Navigation />
      <main className="px-4 lg:px-12 py-8 flex-1 flex flex-col items-center relative z-10">
        <div className="w-full max-w-7xl">
          <Marketplace />
        </div>
      </main>
    </div>
  );
}