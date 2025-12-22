"use client";

import { useState } from "react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { ConnectModal } from "./ConnectModal";
import { cn } from "@/lib/utils";

export function Navigation() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#050b14]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          {/* Logo Section */}
          <div 
            className="flex items-center gap-4 text-white cursor-pointer group"
            onClick={() => router.push("/")}
          >
            <div className="size-10 text-[#00E5FF] relative">
              <span className="material-symbols-outlined text-3xl drop-shadow-[0_0_8px_#00E5FF]">
                schedule
              </span>
            </div>
            <h2 className="text-white text-xl font-bold tracking-widest uppercase">CHRONOS</h2>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex flex-1 justify-end gap-6 items-center">
            <nav className="flex gap-6 text-sm font-medium">
              <button 
                onClick={() => router.push("/")}
                className={cn("transition-colors uppercase tracking-wider", 
                  pathname === "/" ? "text-[#00E5FF] border-b-2 border-[#00E5FF]" : "text-gray-400 hover:text-white")}
              >
                Marketplace
              </button>
              {isConnected && (
                <>
                  <button 
                    onClick={() => router.push("/profile")}
                    className={cn("transition-colors uppercase tracking-wider", 
                      pathname === "/profile" ? "text-[#00E5FF] border-b-2 border-[#00E5FF]" : "text-gray-400 hover:text-white")}
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => router.push("/dashboard")}
                    className={cn("transition-colors uppercase tracking-wider", 
                      pathname === "/dashboard" ? "text-[#00E5FF] border-b-2 border-[#00E5FF]" : "text-gray-400 hover:text-white")}
                  >
                    Dashboard
                  </button>
                </>
              )}
            </nav>

            <div className="h-6 w-px bg-white/20 mx-2" />

            {/* Wallet Logic */}
            {isConnected ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden lg:block">
                  <p className="text-xs text-[#00E5FF] font-bold">
                    {balance ? `${parseFloat(balance.formatted).toFixed(3)} ${balance.symbol}` : "0.000 ETH"}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    ID: {address?.slice(0, 4)}...{address?.slice(-4)}
                  </p>
                </div>
                <div 
                  className="bg-cover bg-center rounded-lg size-10 ring-2 ring-[#00E5FF]/50 cursor-pointer hover:ring-[#00E5FF] transition-all"
                  style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuB7nPYN_Sf_PeZZyrDmG0rEPIZdQfuY6m8ZQyYgaXTsLGfisp8tQe8lH_9rO411HiTFiueh0z0Zl-Be9ChpRxE0GEqRBSAwcAC8JujWkcBIXcxVfo4Ae4b-F6a_KgVNmDmoNCtCu9Hp0DyZHr_gRyWf9yxBG1u_lEOtSOv2Xu8TtxOyxNxvPiN7Y5a_-MQthESoMckSLWAieFa0SeNAuSYWTHeVnUewKt16NS2u6-qJWDXmm_BN5j1zAUGDVnyrujizg4LXv_vDSOG-")' }}
                  onClick={() => router.push("/profile")}
                />
              </div>
            ) : (
              <button 
                onClick={() => setIsConnectOpen(true)}
                className="bg-[#00E5FF] hover:bg-cyan-400 text-black px-6 py-2 rounded-lg font-black text-xs uppercase shadow-neon transition-all"
              >
                Establish Uplink
              </button>
            )}
          </div>
        </div>
      </header>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </>
  );
}