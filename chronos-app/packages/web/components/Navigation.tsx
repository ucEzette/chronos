"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { ConnectModal } from "./ConnectModal";
import { cn } from "@/lib/utils";
import { Terminal, Wallet, LogOut, Menu, X, User, LayoutDashboard, ShoppingCart } from "lucide-react";

export function Navigation() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address }); 
  
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
        scrolled || isMobileMenuOpen ? "bg-[#020e14]/95 backdrop-blur-md border-primary/20 py-3" : "bg-transparent border-transparent py-4 md:py-6"
      )}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between">
            
            {/* Brand */}
            <div className="flex items-center gap-3 cursor-pointer group z-50" onClick={() => router.push("/")}>
              <div className="size-8 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-transform group-hover:scale-110">
                <Terminal size={18} />
              </div>
              <h1 className="text-lg md:text-xl font-black text-white tracking-[0.2em] uppercase group-hover:text-primary transition-colors">Chronos</h1>
            </div>

            {/* Desktop Nav */}
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

            {/* Desktop Wallet & Mobile Toggle */}
            <div className="flex items-center gap-4">
              {/* Desktop Wallet UI */}
              <div className="hidden md:flex items-center gap-4">
                {isConnected ? (
                  <div className="flex items-center gap-4">
                    <div className="text-right bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors cursor-pointer group/wallet" onClick={handleProfileClick}>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] text-gray-400 font-mono group-hover/wallet:text-primary transition-colors">BAL:</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {balance ? Number(balance.formatted).toFixed(3) : "0.000"} MOCK
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-glow-primary"></span>
                        <p className="text-[10px] font-mono font-bold text-primary opacity-80">
                          {address?.slice(0,6)}...{address?.slice(-4)}
                        </p>
                      </div>
                    </div>
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
                    <Wallet size={14} /> Connect
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden p-2 text-white hover:text-primary transition-colors focus:outline-none"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#020e14] border-b border-white/10 p-4 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-5 z-40">
            <button onClick={() => router.push("/")} className={cn("flex items-center gap-3 p-3 rounded-lg border", pathname === "/" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-300")}>
              <ShoppingCart size={18}/> Market
            </button>
            <button onClick={() => router.push("/dashboard")} className={cn("flex items-center gap-3 p-3 rounded-lg border", pathname.startsWith("/dashboard") ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-300")}>
              <LayoutDashboard size={18}/> Dashboard
            </button>
            <button onClick={handleProfileClick} className={cn("flex items-center gap-3 p-3 rounded-lg border", pathname.includes("/profile") ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-300")}>
              <User size={18}/> Profile
            </button>
            
            <div className="h-px bg-white/10 my-1"></div>

            {isConnected ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="text-gray-400 text-xs">Balance</span>
                  <span className="text-primary font-bold font-mono">{balance ? Number(balance.formatted).toFixed(3) : "0.00"} MOCK</span>
                </div>
                <button onClick={handleDisconnect} className="w-full py-3 bg-red-500/10 text-red-500 rounded-lg font-bold text-sm border border-red-500/20 flex items-center justify-center gap-2">
                  <LogOut size={16}/> Disconnect Wallet
                </button>
              </div>
            ) : (
              <button onClick={() => setIsConnectOpen(true)} className="w-full py-3 bg-primary text-black rounded-lg font-bold text-sm shadow-neon flex items-center justify-center gap-2">
                <Wallet size={16}/> Connect Wallet
              </button>
            )}
          </div>
        )}
      </header>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </>
  );
}