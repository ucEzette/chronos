"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { ConnectModal } from "./ConnectModal";
import { cn } from "@/lib/utils";
import { Terminal, Wallet, LogOut, User } from "lucide-react";

export function Navigation() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address }); 
  
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleProfileClick = () => {
    if (isConnected && address) {
      router.push(`/profile/${address}`);
    } else {
      setIsConnectOpen(true);
    }
  };

  const handleDisconnect = () => {
    if (confirm("Disconnect wallet?")) {
      disconnect();
      router.push("/");
    }
  };

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled ? "bg-[#020e14]/90 backdrop-blur-md border-primary/20 py-3" : "bg-transparent border-transparent py-6"
      )}>
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
            <div className="size-8 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-transform group-hover:scale-110">
              <Terminal size={18} />
            </div>
            <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase group-hover:text-primary transition-colors">Chronos</h1>
          </div>

          {/* Links */}
          <nav className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest">
            <button 
              onClick={() => router.push("/")} 
              className={cn("hover:text-primary transition-colors", pathname === "/" && "text-primary")}
            >
              Market
            </button>
            <button 
              onClick={() => router.push("/dashboard")} 
              className={cn("hover:text-primary transition-colors", pathname.startsWith("/dashboard") && "text-primary")}
            >
              Dashboard
            </button>
            <button 
              onClick={handleProfileClick} 
              className={cn("hover:text-primary transition-colors", pathname.includes("/profile") && "text-primary")}
            >
              Profile
            </button>
          </nav>

          {/* Wallet Section */}
          <div>
            {isConnected ? (
              <div className="flex items-center gap-4">
                {/* Balance & Address */}
                <div className="text-right hidden sm:block bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] text-gray-400 font-mono">BAL:</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {balance ? Number(balance.formatted).toFixed(3) : "0.000"} {balance?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-0.5">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-glow-primary"></span>
                    <p className="text-[10px] font-mono font-bold text-primary opacity-80 cursor-pointer hover:text-white" onClick={handleProfileClick}>
                      {address?.slice(0,6)}...{address?.slice(-4)}
                    </p>
                  </div>
                </div>

                {/* Disconnect Button */}
                <button 
                  onClick={handleDisconnect}
                  className="size-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:scale-105 transition-all"
                  title="Disconnect"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsConnectOpen(true)}
                className="bg-primary hover:bg-cyan-400 text-black px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-glow-primary transition-all hover:scale-105 flex items-center gap-2"
              >
                <Wallet size={14} /> Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </>
  );
}