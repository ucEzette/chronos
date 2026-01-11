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
import { CartButton } from "./CartDrawer";
import { getUserAvatar } from "@/lib/avatars";
import { NotificationBell } from "./NotificationBell";

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
  const [userAvatar, setUserAvatar] = useState<string>("");

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

  // Load user's avatar from localStorage
  useEffect(() => {
    if (address) {
      try {
        const saved = localStorage.getItem(`chronos_profile_${address}`);
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings.avatarUrl) {
            setUserAvatar(settings.avatarUrl);
          } else {
            setUserAvatar(getUserAvatar(address));
          }
        } else {
          setUserAvatar(getUserAvatar(address));
        }
      } catch {
        setUserAvatar(getUserAvatar(address));
      }
    }
  }, [address]);

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
          ? "glass-card border-primary/20 py-3 shadow-glass"
          : "bg-transparent border-transparent py-4 md:py-6"
      )}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between">

            {/* BRAND */}
            <div
              className="flex items-center gap-2 cursor-pointer group z-50"
              onClick={() => router.push("/")}
            >
              <img
                src="/oneroad-logo.jpg"
                alt="Oneroad Logo"
                className="h-10 md:h-12 w-auto object-contain rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(19,236,218,0.5)]"
              />
              <span className="hidden sm:block text-lg font-extrabold tracking-tight font-display">ONEROAD</span>
            </div>

            {/* Desktop Nav - Using Link for instant prefetched navigation */}
            <nav className="hidden lg:flex gap-8 text-xs font-bold uppercase tracking-widest">
              <Link
                href="/marketplace"
                prefetch={true}
                className={cn(
                  "relative py-2 transition-colors hover:text-primary group",
                  pathname === "/marketplace" && "text-primary"
                )}
              >
                Market
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300",
                  pathname === "/marketplace" ? "w-full" : "w-0 group-hover:w-full"
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
            <div className="flex items-center gap-2 md:gap-4">
              {/* Notification Bell - visible on both mobile and desktop */}
              <NotificationBell />

              {/* Mobile: Simple Connect/Connected indicator */}
              <div className="flex md:hidden items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                    <span className="size-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-primary">{address?.slice(0, 4)}...{address?.slice(-3)}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConnectOpen(true)}
                    className="bg-primary text-black px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Wallet size={12} /> Connect
                  </button>
                )}
              </div>

              {/* Desktop: Full wallet controls */}
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
                        {/* User Avatar */}
                        <div className="size-9 rounded-lg overflow-hidden border border-white/10">
                          <img src={userAvatar || getUserAvatar(address!)} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-gray-400 font-mono group-hover/wallet:text-primary/80 transition-colors">BAL:</span>
                            <span className="text-xs font-mono font-bold text-white">{balance ? Number(balance.formatted).toFixed(3) : "0.00"} {currencySymbol}</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end mt-0.5">
                            <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(0,206,209,0.8)]" />
                            <p className="text-[10px] font-mono font-bold text-primary/80">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Disconnect Button */}
                    {/* Cart Button */}
                    <CartButton />

                    <button
                      onClick={handleDisconnect}
                      className="size-10 btn-glass-circle text-red-400 hover:text-red-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all"
                      title="Disconnect Wallet"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConnectOpen(true)}
                    className="btn-glass-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:scale-105 active:scale-95 flex items-center gap-2"
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
            "lg:hidden fixed inset-0 z-[60] transition-all duration-300 ease-out",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Backdrop */}
          <div
            className={cn(
              "absolute inset-0 bg-black/80 transition-opacity duration-300",
              isMobileMenuOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Compact Drawer - Positioned at top */}
          <div
            ref={mobileMenuRef}
            className={cn(
              "absolute top-0 left-0 right-0 bg-[#020e14] border-b border-white/10 shadow-2xl transition-transform duration-300 ease-out",
              isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
            )}
          >
            <div className="p-4 safe-top">
              {/* Header Row */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold uppercase tracking-widest text-primary">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-white/5 text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation - Horizontal Row */}
              <div className="flex gap-2 mb-4">
                <Link
                  href="/marketplace"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase",
                    pathname === "/marketplace" ? "bg-primary text-black" : "bg-white/5 text-white/70"
                  )}
                >
                  <ShoppingCart size={16} /> Market
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase",
                    pathname.startsWith("/dashboard") ? "bg-primary text-black" : "bg-white/5 text-white/70"
                  )}
                >
                  <LayoutDashboard size={16} /> Dash
                </Link>
                <button
                  onClick={() => { handleProfileClick(); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase",
                    pathname.startsWith("/profile") ? "bg-primary text-black" : "bg-white/5 text-white/70"
                  )}
                >
                  <User size={16} /> Profile
                </button>
              </div>

              {/* Connect or Wallet Info */}
              {isConnected ? (
                <div className="space-y-3">
                  {/* Balance + Network Row */}
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
                      <Wallet className="text-primary" size={14} />
                      <span className="text-xs text-primary font-mono font-bold">
                        {balance ? Number(balance.formatted).toFixed(2) : "0.00"} {currencySymbol}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSwitchNetwork(chain?.id === 55931 ? 5042002 : 55931)}
                      className="px-3 py-2 bg-white/5 rounded-lg text-xs font-bold text-white/70 flex items-center gap-2"
                    >
                      <span className={cn("size-2 rounded-full", chain?.id === 55931 ? "bg-cyan-400" : "bg-blue-500")} />
                      {chain?.id === 55931 ? "DH" : "Arc"}
                    </button>
                    {/* Mobile Cart Button */}
                    <CartButton />
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-2 bg-red-500/10 rounded-lg text-red-400"
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setIsConnectOpen(true); setIsMobileMenuOpen(false); }}
                  className="w-full py-3 bg-primary text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Wallet size={16} /> Connect Wallet
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