"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useDisconnect, useBalance, useSwitchChain } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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

  // Refs for click-outside handling
  const networkMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // --- FIX: Prevent Infinite Re-renders using useRef ---
  // Using useRef to track previous scroll state without causing re-renders
  const scrolledRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      // Only update state if it actually changed (compare against ref, not state)
      if (scrolledRef.current !== isScrolled) {
        scrolledRef.current = isScrolled;
        setScrolled(isScrolled);
      }
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []); // Empty dependency array - stable listener

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNetworkMenuOpen(false);
  }, [pathname]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (networkMenuRef.current && !networkMenuRef.current.contains(event.target as Node)) {
        setIsNetworkMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleProfileClick = useCallback(() => {
    if (isConnected && address) router.push(`/profile/${address}`);
    else setIsConnectOpen(true);
  }, [isConnected, address, router]);

  const handleDisconnect = useCallback(() => {
    if (confirm("Disconnect wallet?")) {
      disconnect();
      router.push("/");
    }
  }, [disconnect, router]);

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
        "sticky top-0 z-50 w-full transition-all duration-500 ease-out border-b",
        scrolled || isMobileMenuOpen
          ? "bg-[#020e14]/90 backdrop-blur-xl border-primary/10 py-3 shadow-[0_4px_30px_rgba(0,229,255,0.1)]"
          : "bg-transparent border-transparent py-4 md:py-6"
      )}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between">

            {/* BRAND */}
            <div
              className="flex items-center cursor-pointer group z-50"
              onClick={() => router.push("/")}
            >
              <img
                src="/chronos-logo.png"
                alt="Chronos Logo"
                className="h-10 md:h-14 w-auto object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]"
              />
            </div>

            {/* Desktop Nav - Using Link for instant prefetched navigation */}
            <nav className="hidden lg:flex gap-8 text-xs font-bold uppercase tracking-widest">
              <Link
                href="/"
                prefetch={true}
                className={cn(
                  "relative py-2 transition-colors hover:text-primary group",
                  pathname === "/" && "text-primary"
                )}
              >
                Market
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
                  pathname === "/" ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </Link>

              <Link
                href="/dashboard"
                prefetch={true}
                className={cn(
                  "relative py-2 transition-colors hover:text-primary group",
                  pathname.includes("/dashboard") && "text-primary"
                )}
              >
                Dashboard
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
                  pathname.includes("/dashboard") ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </Link>

              <button
                onClick={handleProfileClick}
                className={cn(
                  "relative py-2 transition-colors hover:text-primary group",
                  pathname.includes("/profile") && "text-primary"
                )}
              >
                Profile
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
                  pathname.includes("/profile") ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </button>
            </nav>

            {/* Wallet Section */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden md:flex items-center gap-4">
                {isConnected ? (
                  <div className="flex items-center gap-3">
                    {/* NETWORK SWITCHER */}
                    <div className="relative" ref={networkMenuRef}>
                      <button
                        onClick={() => setIsNetworkMenuOpen(!isNetworkMenuOpen)}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-[10px] font-bold uppercase flex items-center gap-2 transition-all hover:scale-[1.02] min-w-[110px] justify-between backdrop-blur-md",
                          isWrongNetwork
                            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {isWrongNetwork ? <AlertTriangle size={12} /> : <Globe size={12} />}
                          {isWrongNetwork ? "Wrong Net" : (chain?.name || "Network")}
                        </span>
                        <ChevronDown size={10} className={cn("transition-transform duration-200", isNetworkMenuOpen && "rotate-180")} />
                      </button>

                      {/* Network Dropdown */}
                      <div className={cn(
                        "absolute top-full right-0 mt-2 w-52 bg-[#0b1a24]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 transition-all duration-300 origin-top",
                        isNetworkMenuOpen
                          ? "opacity-100 scale-100 translate-y-0"
                          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                      )}>
                        <div className="p-2 space-y-1">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider px-3 py-2 font-mono">Select Network</p>

                          <button
                            onClick={() => handleSwitchNetwork(55931)}
                            className={cn(
                              "w-full px-3 py-3 text-left text-xs font-bold rounded-xl transition-all flex items-center justify-between group",
                              chain?.id === 55931
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "hover:bg-white/5 text-white/80 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-3">
                              <span className="size-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
                              DataHaven
                            </span>
                            {chain?.id === 55931 && <Check size={14} className="text-primary" />}
                          </button>

                          <button
                            onClick={() => handleSwitchNetwork(5042002)}
                            className={cn(
                              "w-full px-3 py-3 text-left text-xs font-bold rounded-xl transition-all flex items-center justify-between group",
                              chain?.id === 5042002
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "hover:bg-white/5 text-white/80 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-3">
                              <span className="size-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              Arc Testnet
                            </span>
                            {chain?.id === 5042002 && <Check size={14} className="text-primary" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Info Card */}
                    <div
                      className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:border-primary/30 hover:bg-white/[0.07] transition-all cursor-pointer group/wallet backdrop-blur-md"
                      onClick={handleProfileClick}
                    >
                      <div className="flex items-center gap-3 justify-end">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-gray-400 font-mono group-hover/wallet:text-primary/80 transition-colors">BAL:</span>
                            <span className="text-xs font-mono font-bold text-white">{balance ? Number(balance.formatted).toFixed(3) : "0.00"} {currencySymbol}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end mt-0.5">
                            <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(0,229,255,0.8)]" />
                            <p className="text-[10px] font-mono font-bold text-primary/80">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Disconnect Button */}
                    <button
                      onClick={handleDisconnect}
                      className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:border-red-500/40 hover:scale-105 active:scale-95 transition-all"
                      title="Disconnect Wallet"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConnectOpen(true)}
                    className="bg-primary hover:bg-cyan-400 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Wallet size={14} /> Connect
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2.5 rounded-xl text-white hover:text-primary hover:bg-white/5 transition-all focus:outline-none active:scale-95"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                <div className="relative w-6 h-6">
                  <Menu
                    size={24}
                    className={cn(
                      "absolute inset-0 transition-all duration-300",
                      isMobileMenuOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                    )}
                  />
                  <X
                    size={24}
                    className={cn(
                      "absolute inset-0 transition-all duration-300",
                      isMobileMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer with Animation */}
        <div
          className={cn(
            "lg:hidden fixed inset-0 top-[73px] z-40 transition-all duration-500 ease-out",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Backdrop */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500",
              isMobileMenuOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            ref={mobileMenuRef}
            className={cn(
              "absolute top-0 right-0 h-full w-full max-w-sm bg-[#020e14]/98 backdrop-blur-xl border-l border-white/10 shadow-2xl transition-transform duration-500 ease-out overflow-y-auto",
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="p-6 flex flex-col gap-6 min-h-full">
              {/* Navigation Links */}
              <nav className="flex flex-col gap-2">
                {[
                  { icon: ShoppingCart, label: "Market", path: "/", exact: true },
                  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", exact: false },
                  { icon: User, label: "Profile", path: "/profile", exact: false, onClick: () => { handleProfileClick(); setIsMobileMenuOpen(false); } }
                ].map((item, index) => (
                  <button
                    key={item.label}
                    onClick={item.onClick || (() => { router.push(item.path); setIsMobileMenuOpen(false); })}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border text-sm font-bold uppercase tracking-wide transition-all active:scale-[0.98]",
                      (item.exact ? pathname === item.path : pathname.startsWith(item.path))
                        ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_20px_rgba(0,229,255,0.1)]"
                        : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <item.icon size={20} /> {item.label}
                  </button>
                ))}
              </nav>

              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {isConnected ? (
                <div className="flex flex-col gap-4">
                  {/* Balance Card */}
                  <div className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div>
                      <span className="text-gray-400 text-xs uppercase tracking-wider">Balance</span>
                      <p className="text-primary font-bold font-mono text-xl mt-1">
                        {balance ? Number(balance.formatted).toFixed(3) : "0.00"}
                        <span className="text-sm ml-2 text-primary/60">{currencySymbol}</span>
                      </p>
                    </div>
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="text-primary" size={24} />
                    </div>
                  </div>

                  {/* Mobile Network Switcher */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono px-1">Network</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSwitchNetwork(55931)}
                        className={cn(
                          "py-4 px-3 text-xs font-bold rounded-2xl border text-center transition-all flex flex-col items-center gap-2 active:scale-[0.98]",
                          chain?.id === 55931
                            ? "bg-primary text-black border-primary shadow-[0_0_30px_rgba(0,229,255,0.3)]"
                            : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                        )}
                      >
                        <span className={cn(
                          "size-3 rounded-full",
                          chain?.id === 55931 ? "bg-black" : "bg-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                        )} />
                        DataHaven
                      </button>
                      <button
                        onClick={() => handleSwitchNetwork(5042002)}
                        className={cn(
                          "py-4 px-3 text-xs font-bold rounded-2xl border text-center transition-all flex flex-col items-center gap-2 active:scale-[0.98]",
                          chain?.id === 5042002
                            ? "bg-primary text-black border-primary shadow-[0_0_30px_rgba(0,229,255,0.3)]"
                            : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                        )}
                      >
                        <span className={cn(
                          "size-3 rounded-full",
                          chain?.id === 5042002 ? "bg-black" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        )} />
                        Arc Testnet
                      </button>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Disconnect Button */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full py-4 bg-red-500/10 text-red-400 rounded-2xl font-bold text-sm border border-red-500/20 flex items-center justify-center gap-3 hover:bg-red-500/20 active:scale-[0.98] transition-all mt-auto"
                  >
                    <LogOut size={18} /> Disconnect Wallet
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setIsConnectOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full py-5 bg-primary text-black rounded-2xl font-bold text-sm shadow-[0_0_30px_rgba(0,229,255,0.3)] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <Wallet size={20} /> Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </>
  );
}