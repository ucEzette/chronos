"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect, useBalance, useSwitchChain } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { ConnectModal } from "./ConnectModal";
import { cn } from "@/lib/utils";
import { 
  Wallet, LogOut, Menu, X, User, LayoutDashboard, 
  ShoppingCart, Globe, ChevronDown, Check, AlertTriangle 
} from "lucide-react";
import { arcTestnet, datahaven } from "@/lib/chains"; 

export function Navigation() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain(); 
  const { data: balance } = useBalance({ address }); 
  
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false); 
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // --- FIX: Prevent Infinite Re-renders ---
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      // Only update state if it actually changed
      if (scrolled !== isScrolled) {
        setScrolled(isScrolled);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]); // Dependency ensures we check against current state

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  const handleProfileClick = () => {
    if (isConnected && address) router.push(`/profile/${address}`);
    else setIsConnectOpen(true);
  };

  const handleDisconnect = () => {
    if (confirm("Disconnect wallet?")) {
      disconnect();
      router.push("/");
    }
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchChainAsync({ chainId: targetChainId });
      setIsNetworkMenuOpen(false);
    } catch (error: any) {
      // --- FIX: Vercel Build Error (window.ethereum typing) ---
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const targetChain = targetChainId === 5042002 ? arcTestnet : datahaven;
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChain.id.toString(16)}`, 
              chainName: targetChain.name,
              nativeCurrency: targetChain.nativeCurrency,
              rpcUrls: [targetChain.rpcUrls.default.http[0]],
              blockExplorerUrls: [targetChain.blockExplorers?.default.url],
            }],
          });
          await switchChainAsync({ chainId: targetChainId }); 
          setIsNetworkMenuOpen(false);
        } catch (addError) {
          alert("Could not switch network. Please add it manually.");
        }
      }
    }
  };

  const SUPPORTED_CHAINS = [55931, 5042002]; 
  const isWrongNetwork = isConnected && chain && !SUPPORTED_CHAINS.includes(chain.id);
  const currencySymbol = chain?.id === 5042002 ? "USDC" : "MOCK";

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled || isMobileMenuOpen ? "bg-[#020e14]/95 backdrop-blur-md border-primary/20 py-3" : "bg-transparent border-transparent py-4 md:py-6"
      )}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between">
            
            {/* BRAND */}
            <div className="flex items-center cursor-pointer group z-50" onClick={() => router.push("/")}>
              <img 
                src="/chronos-logo.png" 
                alt="Chronos Logo" 
                className="h-10 md:h-14 w-auto object-contain transition-transform group-hover:scale-105" 
              />
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex gap-8 text-xs font-bold uppercase tracking-widest">
              <button onClick={() => router.push("/")} className={cn("hover:text-primary transition-colors", pathname === "/" && "text-primary")}>Market</button>
              <button onClick={() => router.push("/dashboard")} className={cn("hover:text-primary transition-colors", pathname.startsWith("/dashboard") && "text-primary")}>Dashboard</button>
              <button onClick={handleProfileClick} className={cn("hover:text-primary transition-colors", pathname.includes("/profile") && "text-primary")}>Profile</button>
            </nav>

            {/* Wallet Section */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden md:flex items-center gap-4">
                {isConnected ? (
                  <div className="flex items-center gap-3">
                    {/* NETWORK SWITCHER */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsNetworkMenuOpen(!isNetworkMenuOpen)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase flex items-center gap-2 transition-all hover:opacity-80 min-w-[100px] justify-between", 
                          isWrongNetwork ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-primary/10 border-primary/30 text-primary"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {isWrongNetwork ? <AlertTriangle size={12}/> : <Globe size={12}/>} 
                          {isWrongNetwork ? "Wrong Net" : chain?.name}
                        </span>
                        <ChevronDown size={10} />
                      </button>

                      {isNetworkMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[#0b1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                          <div className="p-2 flex flex-col gap-1">
                            <button onClick={() => handleSwitchNetwork(55931)} className={cn("px-3 py-2 text-left text-xs font-bold rounded-lg transition-colors flex items-center justify-between group", chain?.id === 55931 ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white")}>
                              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-cyan-400"></span> DataHaven</span>
                              {chain?.id === 55931 && <Check size={12} />}
                            </button>
                            <button onClick={() => handleSwitchNetwork(5042002)} className={cn("px-3 py-2 text-left text-xs font-bold rounded-lg transition-colors flex items-center justify-between group", chain?.id === 5042002 ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white")}>
                              <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-blue-500"></span> Arc Testnet</span>
                              {chain?.id === 5042002 && <Check size={12} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors cursor-pointer group/wallet" onClick={handleProfileClick}>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] text-gray-400 font-mono group-hover/wallet:text-primary transition-colors">BAL:</span>
                        <span className="text-xs font-mono font-bold text-white">{balance ? Number(balance.formatted).toFixed(3) : "0.00"} {currencySymbol}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-glow-primary"></span>
                        <p className="text-[10px] font-mono font-bold text-primary opacity-80">{address?.slice(0,6)}...{address?.slice(-4)}</p>
                      </div>
                    </div>
                    <button onClick={handleDisconnect} className="size-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:scale-105 transition-all"><LogOut size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => setIsConnectOpen(true)} className="bg-primary hover:bg-cyan-400 text-black px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-glow-primary transition-all hover:scale-105 flex items-center gap-2"><Wallet size={14} /> Connect</button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button className="lg:hidden p-2 text-white hover:text-primary transition-colors focus:outline-none" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-[#020e14] border-b border-white/10 p-4 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-5 z-40 h-[calc(100vh-80px)] overflow-y-auto">
            <nav className="flex flex-col gap-2">
              <button onClick={() => { router.push("/"); setIsMobileMenuOpen(false); }} className={cn("flex items-center gap-3 p-4 rounded-xl border text-sm font-bold uppercase tracking-wide", pathname === "/" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10")}>
                <ShoppingCart size={18}/> Market
              </button>
              <button onClick={() => { router.push("/dashboard"); setIsMobileMenuOpen(false); }} className={cn("flex items-center gap-3 p-4 rounded-xl border text-sm font-bold uppercase tracking-wide", pathname.startsWith("/dashboard") ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10")}>
                <LayoutDashboard size={18}/> Dashboard
              </button>
              <button onClick={() => { handleProfileClick(); setIsMobileMenuOpen(false); }} className={cn("flex items-center gap-3 p-4 rounded-xl border text-sm font-bold uppercase tracking-wide", pathname.includes("/profile") ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10")}>
                <User size={18}/> Profile
              </button>
            </nav>
            
            <div className="h-px bg-white/10 my-1"></div>
            
            {isConnected ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-gray-400 text-xs">Balance ({currencySymbol})</span>
                  <span className="text-primary font-bold font-mono">{balance ? Number(balance.formatted).toFixed(3) : "0.00"}</span>
                </div>
                
                {/* Mobile Network Switcher */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleSwitchNetwork(55931)} className={cn("py-3 px-2 text-xs font-bold rounded-xl border text-center transition-all flex flex-col items-center gap-1", chain?.id === 55931 ? "bg-primary text-black border-primary shadow-glow-primary" : "bg-white/5 text-white border-white/10")}>
                    <span className="size-2 rounded-full bg-cyan-400 mb-1"></span> DataHaven
                  </button>
                  <button onClick={() => handleSwitchNetwork(5042002)} className={cn("py-3 px-2 text-xs font-bold rounded-xl border text-center transition-all flex flex-col items-center gap-1", chain?.id === 5042002 ? "bg-primary text-black border-primary shadow-glow-primary" : "bg-white/5 text-white border-white/10")}>
                    <span className="size-2 rounded-full bg-blue-500 mb-1"></span> Arc
                  </button>
                </div>

                <button onClick={handleDisconnect} className="w-full py-4 bg-red-500/10 text-red-500 rounded-xl font-bold text-sm border border-red-500/20 flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all"><LogOut size={18}/> Disconnect Wallet</button>
              </div>
            ) : (
              <button onClick={() => { setIsConnectOpen(true); setIsMobileMenuOpen(false); }} className="w-full py-4 bg-primary text-black rounded-xl font-bold text-sm shadow-neon flex items-center justify-center gap-2 active:scale-95 transition-all"><Wallet size={18}/> Connect Wallet</button>
            )}
          </div>
        )}
      </header>
      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </>
  );
}