"use client";

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatEther, createPublicClient, http, parseAbiItem } from "viem";
import Link from "next/link";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { datahaven, arcTestnet } from "@/lib/chains";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { getDataHavenUrl } from "@/lib/datahaven";
import { getCryptoPrices } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/CartContext";
import { CATEGORIES, getCategoryById } from "@/lib/categories";
import {
  Search, Video, FileText, Play, Archive, ChevronDown,
  User, Pause, RefreshCw, Globe, AlertTriangle, Sparkles,
  TrendingUp, Clock, DollarSign, Package, Filter, X,
  Grid, List, SlidersHorizontal, ShoppingCart, Heart
} from "lucide-react";

// --- Skeleton Card Component ---
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="relative bg-[#0b1a24]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-video w-full bg-gradient-to-br from-white/5 to-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>

      {/* Content Skeleton */}
      <div className="p-4 flex flex-col gap-3 flex-grow">
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-white/10 rounded-lg" />
          <div className="h-3 w-1/2 bg-white/5 rounded" />
        </div>

        <div className="w-full bg-white/5 rounded-full h-1.5" />

        <div className="bg-white/5 p-2 rounded-lg h-14" />

        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="h-2 w-12 bg-white/5 rounded" />
            <div className="h-5 w-20 bg-white/10 rounded" />
          </div>
          <div className="h-9 w-24 bg-white/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
});

// --- Splash Screen Component ---
function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoaded(true);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050b14] flex flex-col items-center justify-center relative z-[100] font-display text-primary select-none px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <h1 className="text-4xl md:text-5xl font-black tracking-[0.2em] mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.5)] text-center">
          CHRONOS
        </h1>

        {!loaded ? (
          <div className="w-full mb-8">
            <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-primary shadow-[0_0_20px_rgba(0,229,255,0.8)] transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-primary/50 font-mono mt-3 text-center uppercase tracking-wider">
              Initializing Protocol...
            </p>
          </div>
        ) : (
          <button
            onClick={onEnter}
            className="relative group w-full px-10 py-4 bg-transparent border-2 border-primary text-primary font-bold uppercase tracking-wider overflow-hidden transition-all duration-300 hover:bg-primary hover:text-[#050b14] active:scale-95 animate-in fade-in zoom-in-95 rounded-xl"
          >
            <span className="relative z-10">Enter Protocol</span>
            <div className="absolute inset-0 bg-primary/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Metadata Type Definition ---
interface MetaState {
  name: string;
  description: string;
  image: string | null;
  animation_url?: string | null;
  isLoading: boolean;
  hasError: boolean;
}

// --- Marketplace Card Component (Memoized for performance) ---
const MarketplaceCard = memo(function MarketplaceCard({ item, viewMode = 'grid' }: { item: any; viewMode?: 'grid' | 'list' }) {
  const { addToCart, isInCart } = useCart();
  const { address } = useAccount();
  const [isFav, setIsFav] = useState(false);
  const [meta, setMeta] = useState<MetaState>({
    name: item.name,
    description: "Loading...",
    image: null,
    isLoading: true,
    hasError: false
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate placeholder description based on file type and name
  const getPlaceholderDescription = (itemName: string, fileType: string) => {
    const type = fileType?.replace('.', '').toUpperCase() || 'FILE';
    const categoryDescriptions: Record<string, string> = {
      'MP3': `Premium audio content: "${itemName}". Encrypted MP3 file with instant blockchain delivery.`,
      'WAV': `High-quality audio file: "${itemName}". Lossless WAV format with secure decryption.`,
      'FLAC': `Audiophile-grade content: "${itemName}". FLAC format with blockchain-verified ownership.`,
      'MP4': `Exclusive video content: "${itemName}". Encrypted MP4 with secure streaming access.`,
      'MOV': `Premium video file: "${itemName}". High-quality MOV format with instant delivery.`,
      'AVI': `Video content: "${itemName}". AVI format with blockchain-secured access.`,
      'PDF': `Digital document: "${itemName}". Encrypted PDF with secure download.`,
      'ZIP': `Digital package: "${itemName}". Compressed archive with encrypted delivery.`,
      'RAR': `Protected archive: "${itemName}". RAR package with blockchain verification.`,
      'PNG': `Digital artwork: "${itemName}". High-resolution PNG with ownership proof.`,
      'JPG': `Image file: "${itemName}". JPEG artwork with blockchain authentication.`,
      'JPEG': `Premium image: "${itemName}". JPEG with verified digital ownership.`,
      'GIF': `Animated content: "${itemName}". GIF with blockchain-verified authenticity.`,
      'PSD': `Design source file: "${itemName}". Adobe PSD with secure access.`,
      'AI': `Vector artwork: "${itemName}". Adobe Illustrator file with ownership proof.`,
    };
    return categoryDescriptions[type] || `Encrypted digital content: "${itemName}". Secure blockchain delivery.`;
  };

  // Generate placeholder image based on file type
  const getPlaceholderImage = (fileType: string) => {
    const type = fileType?.replace('.', '').toUpperCase() || 'FILE';
    const colors: Record<string, string> = {
      'MP3': '1a1a2e/a855f7', 'WAV': '1a1a2e/a855f7', 'FLAC': '1a1a2e/a855f7',
      'MP4': '0f172a/3b82f6', 'MOV': '0f172a/3b82f6', 'AVI': '0f172a/3b82f6',
      'PDF': '7f1d1d/ef4444', 'ZIP': '1e3a5f/0ea5e9', 'RAR': '1e3a5f/0ea5e9',
      'PNG': '064e3b/10b981', 'JPG': '064e3b/10b981', 'JPEG': '064e3b/10b981', 'GIF': '064e3b/10b981',
    };
    const colorPair = colors[type] || '0b1a24/00E5FF';
    return `https://placehold.co/600x400/${colorPair}?text=${encodeURIComponent(type)}`;
  };

  // Metadata fetching with fallback logic
  useEffect(() => {
    let isMounted = true;

    const loadMetadata = async () => {
      // If no previewCid at all, use on-chain fallback immediately
      if (!item.previewCid) {
        setMeta({
          name: item.name,
          description: getPlaceholderDescription(item.name, item.fileType),
          image: getPlaceholderImage(item.fileType),
          isLoading: false,
          hasError: false
        });
        return;
      }

      const url = getDataHavenUrl(item.previewCid);

      // If URL is empty (mock data or invalid), use on-chain fallback data
      if (!url) {
        setMeta({
          name: item.name,
          description: getPlaceholderDescription(item.name, item.fileType),
          image: getPlaceholderImage(item.fileType),
          isLoading: false,
          hasError: false
        });
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced timeout

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json, image/*, video/*, audio/*' }
        });

        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (!res.ok) {
          // Response not OK - use placeholder
          setMeta({
            name: item.name,
            description: getPlaceholderDescription(item.name, item.fileType),
            image: getPlaceholderImage(item.fileType),
            isLoading: false,
            hasError: false
          });
          return;
        }

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const json = await res.json();
          const imageUrl = json.image ? getDataHavenUrl(json.image) : null;
          setMeta({
            name: json.name || item.name,
            description: json.description || getPlaceholderDescription(item.name, item.fileType),
            image: imageUrl || getPlaceholderImage(item.fileType),
            animation_url: json.animation_url ? getDataHavenUrl(json.animation_url) : null,
            isLoading: false,
            hasError: false
          });
        } else if (contentType.includes("image/") || contentType.includes("video/") || contentType.includes("audio/")) {
          // Content is binary (image/video/audio) - use URL directly
          setMeta({
            name: item.name,
            description: getPlaceholderDescription(item.name, item.fileType),
            image: url,
            isLoading: false,
            hasError: false
          });
        } else {
          // Unknown content type - use placeholder
          setMeta({
            name: item.name,
            description: getPlaceholderDescription(item.name, item.fileType),
            image: getPlaceholderImage(item.fileType),
            isLoading: false,
            hasError: false
          });
        }
      } catch (e) {
        if (!isMounted) return;
        // On any error, use placeholder
        setMeta({
          name: item.name,
          description: getPlaceholderDescription(item.name, item.fileType),
          image: getPlaceholderImage(item.fileType),
          isLoading: false,
          hasError: false
        });
      }
    };

    loadMetadata();
    return () => { isMounted = false; };
  }, [item.previewCid, item.name, item.fileType]);

  const type = item.fileType ? item.fileType.toUpperCase() : "FILE";
  const sold = Number(item.soldCount);
  const max = Number(item.maxSupply);
  const remaining = max - sold;
  const isCanceled = !item.isActive;
  const isSoldOut = !isCanceled && (item.isSoldOut || sold >= max);
  const supplyPercentage = Math.floor((sold / max) * 100);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (type.includes("VIDEO") && videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play();
      setIsPlaying(!isPlaying);
    } else if (type.includes("AUDIO") && audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [type, isPlaying]);

  // --- LIST VIEW ---
  if (viewMode === 'list') {
    return (
      <Link
        href={`/item/${item.id}?chain=${item.chainId}`}
        className={cn(
          "group flex items-center gap-4 p-3 bg-[#0b1a24]/60 backdrop-blur-md border border-white/10 rounded-xl hover:border-primary/50 transition-all",
          (isSoldOut || isCanceled) && "opacity-60"
        )}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-900 shrink-0">
          {meta?.image ? (
            <img src={meta.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <FileText size={20} className="text-white/20" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate">{item.name}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold shrink-0">
              {type.replace('.', '')}
            </span>
          </div>
          <p className="text-xs text-white/40 truncate">{meta.description}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-white/40">
            <span>{item.chainId === 55931 ? "DH" : "ARC"}</span>
            <span>•</span>
            <span>{sold}/{max} sold</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-white font-mono">
            {formatEther(item.price)}
            <span className="text-xs text-primary/60 ml-1">{item.currency}</span>
          </div>
          <span className={cn(
            "text-[10px] font-bold uppercase",
            isSoldOut ? "text-red-400" : isCanceled ? "text-gray-500" : "text-green-400"
          )}>
            {isCanceled ? "Archived" : isSoldOut ? "Sold Out" : "Active"}
          </span>
        </div>
      </Link>
    );
  }

  // --- GRID VIEW ---
  return (
    <div className="group relative bg-[#0b1a24]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,229,255,0.15)] hover:-translate-y-1 flex flex-col h-full">
      {/* Badges */}
      <div className="absolute top-3 right-3 z-20 flex gap-2 pointer-events-none">
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border shadow-sm backdrop-blur-md",
          item.chainId === 55931
            ? "bg-cyan-900/80 text-cyan-400 border-cyan-500/30"
            : "bg-blue-900/80 text-blue-400 border-blue-500/30"
        )}>
          <Globe size={10} /> {item.chainId === 55931 ? "DH" : "ARC"}
        </span>
        <span className="inline-flex items-center rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/30 shadow-sm">
          {type.replace('.', '')}
        </span>
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (address) {
            const { toggleFavorite } = require('@/lib/favorites');
            const newState = toggleFavorite(address, {
              itemId: item.id.toString(),
              chainId: item.chainId,
              name: item.name,
              previewUrl: meta?.image || '',
              price: item.price,
              seller: item.seller
            });
            setIsFav(newState);
          }
        }}
        className={cn(
          "absolute top-3 left-3 z-20 size-8 rounded-full flex items-center justify-center transition-all",
          isFav
            ? "bg-red-500/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            : "bg-black/60 text-white/50 hover:text-red-400 hover:bg-black/80"
        )}
      >
        <Heart size={14} className={cn(isFav && "fill-current")} />
      </button>

      {/* Image Container */}
      <Link href={`/item/${item.id}?chain=${item.chainId}`} className="cursor-pointer block">
        <div className={cn(
          "relative aspect-video w-full overflow-hidden bg-gradient-to-br from-gray-900 to-black group-hover:brightness-110 transition-all duration-500 shrink-0",
          (isSoldOut || isCanceled) && "grayscale opacity-60"
        )}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1a24] via-transparent to-transparent opacity-90 z-10 pointer-events-none" />

          {meta.isLoading ? (
            // Skeleton while loading
            <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={24} className="text-white/20 animate-spin" />
              </div>
            </div>
          ) : meta?.animation_url && type.includes("VIDEO") ? (
            <video
              ref={videoRef}
              src={meta.animation_url}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loop
              muted={!isPlaying}
              poster={meta?.image || undefined}
            />
          ) : meta?.image ? (
            <img
              src={meta.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/600x400/0b1a24/00E5FF?text=ENCRYPTED";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
              <FileText size={40} className="text-white/20" />
            </div>
          )}

          {meta?.animation_url && type.includes("AUDIO") && (
            <audio ref={audioRef} src={meta.animation_url} loop />
          )}

          {/* Play Button Overlay */}
          {!isSoldOut && !isCanceled && (type.includes("VIDEO") || type.includes("AUDIO")) && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
              <button
                onClick={togglePlay}
                className="bg-primary text-black rounded-full p-4 shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:scale-110 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
            </div>
          )}

          {/* Sold Out / Archived Overlay */}
          {(isSoldOut || isCanceled) && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-30 pointer-events-none">
              <div className={cn(
                "border-4 px-6 py-2 text-2xl font-black tracking-widest uppercase -rotate-12",
                isCanceled ? "border-red-500 text-red-500" : "border-white text-white"
              )}>
                {isCanceled ? "ARCHIVED" : "SOLD OUT"}
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex flex-col gap-3 flex-grow">
        <div>
          <Link href={`/item/${item.id}?chain=${item.chainId}`}>
            <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate cursor-pointer">
              {meta.name || item.name}
            </h3>
          </Link>
          <Link
            href={`/profile/${item.seller}`}
            className="text-xs font-mono text-primary/70 hover:text-primary flex items-center gap-1 mt-1 w-fit transition-colors"
          >
            <User size={12} /> {item.seller.slice(0, 6)}...{item.seller.slice(-4)}
          </Link>
        </div>

        {/* Supply Progress Bar */}
        <div className="w-full bg-black/40 rounded-full h-1.5 mt-1 overflow-hidden relative border border-white/5">
          <div
            className={cn(
              "h-full absolute left-0 top-0 transition-all duration-500",
              isSoldOut
                ? "bg-red-500"
                : isCanceled
                  ? "bg-gray-600"
                  : "bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_#00E5FF]"
            )}
            style={{ width: `${supplyPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/60 -mt-1">
          <span>Supply: {remaining} / {max}</span>
          <span className={cn(supplyPercentage > 80 && "text-orange-400")}>{supplyPercentage}% Sold</span>
        </div>

        {/* Description */}
        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 min-h-[3.5rem]">
          <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
            {meta.description}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Price</span>
            <span className="text-lg font-mono font-bold text-white tracking-tight">
              {formatEther(item.price)}
              <span className="text-xs text-primary/60 ml-1">{item.currency}</span>
            </span>
          </div>
          <Link
            href={`/item/${item.id}?chain=${item.chainId}`}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 uppercase tracking-wide flex-1 justify-center active:scale-95 text-center",
              (isSoldOut || isCanceled)
                ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                : "bg-primary hover:bg-white text-black shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            )}
          >
            {isCanceled ? "Archived" : isSoldOut ? "Sold Out" : "View"}
          </Link>
          {/* Add to Cart Button */}
          {!isSoldOut && !isCanceled && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart({
                  itemId: item.id.toString(),
                  chainId: item.chainId,
                  price: item.price,
                  name: item.name,
                  previewUrl: meta?.image || '',
                  seller: item.seller,
                  fileType: item.fileType
                });
              }}
              disabled={isInCart(item.id.toString(), item.chainId)}
              className={cn(
                "p-2.5 rounded-xl transition-all active:scale-95",
                isInCart(item.id.toString(), item.chainId)
                  ? "bg-green-500/20 text-green-400 border border-green-500/20"
                  : "bg-white/10 text-white hover:bg-primary/20 hover:text-primary border border-white/10 hover:border-primary/30"
              )}
              title={isInCart(item.id.toString(), item.chainId) ? "In Cart" : "Add to Cart"}
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// --- Filter Pill Component ---
const FilterPill = memo(function FilterPill({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all border whitespace-nowrap active:scale-95",
        isActive
          ? "bg-primary/20 text-primary border-primary shadow-[0_0_20px_rgba(0,229,255,0.2)]"
          : "bg-surface text-white/60 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
});

// --- MAIN PAGE ---
export default function MarketplacePage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [prices, setPrices] = useState({ BTC: 0, ETH: 0, SOL: 0 });
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("NEWEST");
  const [view, setView] = useState<'ACTIVE' | 'SOLD' | 'ARCHIVED'>('ACTIVE');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Prices Ticker
  useEffect(() => {
    getCryptoPrices().then(setPrices);
    const i = setInterval(() => getCryptoPrices().then(setPrices), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    setMounted(true);
    const hasSeenSplash = sessionStorage.getItem("chronos_splash_seen");
    if (isConnected && !hasSeenSplash) {
      setShowSplash(true);
      sessionStorage.setItem("chronos_splash_seen", "true");
    } else if (!isConnected) {
      sessionStorage.removeItem("chronos_splash_seen");
      setShowSplash(false);
    }
  }, [isConnected]);

  // --- MULTI-CHAIN DATA AGGREGATION ---
  useEffect(() => {
    const fetchMultiChainData = async () => {
      if (allItems.length === 0) setIsLoading(true);
      else setIsRefreshing(true);

      const chains = [datahaven, arcTestnet];
      const aggregatedItems: any[] = [];

      await Promise.all(chains.map(async (chain) => {
        try {
          const client = createPublicClient({ chain, transport: http() });
          const contractAddr = CONTRACT_ADDRESSES[chain.id];
          if (!contractAddr || contractAddr === "0x...") return;

          // 1. Fetch Items
          const items = await client.readContract({
            address: contractAddr,
            abi: PAYLOCK_ABI,
            functionName: 'getMarketplaceItems',
          }) as any[];

          // 2. Fetch Listing Events (Chunked to prevent RPC 413 Errors)
          const currentBlock = await client.getBlockNumber();
          const SCAN_DEPTH = BigInt(50000);
          const CHUNK_SIZE = BigInt(3000);
          let fromBlock = currentBlock - SCAN_DEPTH > BigInt(0) ? currentBlock - SCAN_DEPTH : BigInt(0);

          const itemBlockMap = new Map();

          for (let i = fromBlock; i < currentBlock; i += CHUNK_SIZE) {
            const to = (i + CHUNK_SIZE) > currentBlock ? currentBlock : (i + CHUNK_SIZE);
            try {
              const logs = await client.getLogs({
                address: contractAddr,
                // Cast to avoid TypeScript/Vercel build errors with AbiEvent
                event: parseAbiItem('event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)') as any,
                fromBlock: i,
                toBlock: to
              });

              logs.forEach(log => {
                const args = (log as any).args;
                if (args && args.id) {
                  itemBlockMap.set(args.id.toString(), log.blockNumber);
                }
              });
            } catch (e) { /* skip failed chunk */ }
          }

          // Fetch Timestamps
          const uniqueBlocks = Array.from(new Set(itemBlockMap.values())) as bigint[];
          const blockTimestamps: Record<string, number> = {};
          const recentBlocks = uniqueBlocks.sort().slice(-50);

          await Promise.all(recentBlocks.map(async (bn) => {
            try {
              const block = await client.getBlock({ blockNumber: bn });
              blockTimestamps[bn.toString()] = Number(block.timestamp);
            } catch { }
          }));

          const taggedItems = items.map(item => {
            const blockNum = itemBlockMap.get(item.id.toString());
            const timestamp = blockNum ? blockTimestamps[blockNum.toString()] : (Date.now() / 1000);

            return {
              ...item,
              chainId: chain.id,
              chainName: chain.name,
              currency: chain.nativeCurrency.symbol,
              timestamp: timestamp || 0
            };
          });

          aggregatedItems.push(...taggedItems);
        } catch (e) {
          console.error(`Error fetching from ${chain.name}:`, e);
        }
      }));

      setAllItems(aggregatedItems);
      setIsLoading(false);
      setIsRefreshing(false);
    };

    fetchMultiChainData();
    const intervalId = setInterval(fetchMultiChainData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // --- FILTER & SORT LOGIC (Memoized) ---
  const filteredItems = useMemo(() => {
    let items = allItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || (item.fileType && item.fileType.toUpperCase().includes(filter));
      const matchesCategory = categoryFilter === "ALL" || (item.category === categoryFilter);
      const soldCount = Number(item.soldCount);
      const maxSupply = Number(item.maxSupply);
      const isActive = item.isActive;
      const isSoldOut = soldCount >= maxSupply || item.isSoldOut;
      const isCanceled = !isActive;

      let matchesView = false;
      if (view === 'ACTIVE') matchesView = isActive && !isSoldOut;
      else if (view === 'SOLD') matchesView = isActive && isSoldOut;
      else if (view === 'ARCHIVED') matchesView = isCanceled;

      // Fallback for contracts that don't have isActive field
      if (item.isActive === undefined) matchesView = view === 'ACTIVE' ? !item.isSoldOut : item.isSoldOut;

      return matchesSearch && matchesFilter && matchesCategory && matchesView;
    });

    const sorted = [...items];
    if (sort === "NEWEST") sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    else if (sort === "OLDEST") sorted.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    else if (sort === "PRICE_LOW") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "PRICE_HIGH") sorted.sort((a, b) => Number(b.price) - Number(a.price));

    return sorted;
  }, [allItems, filter, search, sort, view, categoryFilter]);

  const handleClearSearch = useCallback(() => setSearch(""), []);

  if (!mounted) return null;
  if (showSplash) return <SplashScreen onEnter={() => setShowSplash(false)} />;

  return (
    <div className="min-h-screen bg-background text-white font-display overflow-x-hidden flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,224,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,198,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <Navigation />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">

        {/* Hero */}
        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-10 border-b border-white/10 pb-8">
          <div className="space-y-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 text-primary text-[10px] md:text-xs font-mono tracking-widest uppercase">
              <span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(0,229,255,0.8)] animate-pulse" />
              System Online
              {isRefreshing && <RefreshCw size={10} className="animate-spin ml-2" />}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-none tracking-tighter">
              ENCRYPTED <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-secondary">CHRONOS</span>
            </h1>
            <p className="text-white/60 max-w-xl text-sm leading-relaxed">
              Secure peer-to-peer file transfer protocol. Buy and sell encrypted digital assets.
            </p>
          </div>

          <div className="flex flex-col w-full lg:w-auto gap-4">
            {/* Mobile View Toggle + Display Mode */}
            <div className="flex md:hidden items-center gap-2 w-full">
              <div className="flex flex-1 items-center justify-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setView('ACTIVE')}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1",
                    view === 'ACTIVE'
                      ? "bg-primary text-black"
                      : "text-white/60"
                  )}
                >
                  <TrendingUp size={12} /> Active
                </button>
                <button
                  onClick={() => setView('SOLD')}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1",
                    view === 'SOLD'
                      ? "bg-white/20 text-white"
                      : "text-white/60"
                  )}
                >
                  <Package size={12} /> Sold
                </button>
              </div>
              {/* Mobile Grid/List Toggle */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    displayMode === 'grid' ? "bg-primary text-black" : "text-white/40"
                  )}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setDisplayMode('list')}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    displayMode === 'list' ? "bg-primary text-black" : "text-white/40"
                  )}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Desktop View Toggle */}
            <div className="hidden md:flex items-center justify-end gap-1 bg-white/5 p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => setView('ACTIVE')}
                className={cn(
                  "px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                  view === 'ACTIVE'
                    ? "bg-primary text-black shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <TrendingUp size={14} /> Active
              </button>
              <button
                onClick={() => setView('SOLD')}
                className={cn(
                  "px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                  view === 'SOLD'
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Package size={14} /> Sold
              </button>
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search artifacts..."
                  className="w-full sm:w-64 bg-surface border border-white/10 rounded-xl py-3 pl-12 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-white/30"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none w-full sm:w-48 bg-surface border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-primary/50 cursor-pointer transition-all"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                  <option value="PRICE_LOW">Price: Low to High</option>
                  <option value="PRICE_HIGH">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={16} />
              </div>
              {/* Display Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    displayMode === 'grid'
                      ? "bg-primary text-black"
                      : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setDisplayMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    displayMode === 'list'
                      ? "bg-primary text-black"
                      : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap",
              categoryFilter === 'ALL'
                ? "bg-primary/20 text-primary border-primary"
                : "bg-surface text-white/60 border-white/10 hover:border-white/30"
            )}
          >
            All Categories
          </button>
          {(showAllCategories ? CATEGORIES : CATEGORIES.slice(0, 6)).map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1.5",
                  categoryFilter === cat.id
                    ? "bg-primary/20 text-primary border-primary"
                    : "bg-surface text-white/60 border-white/10 hover:border-white/30"
                )}
              >
                <Icon size={12} /> {cat.name}
              </button>
            );
          })}
          {CATEGORIES.length > 6 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 bg-white/5 text-white/60 border-white/10 hover:border-primary/50 hover:text-primary"
            >
              <ChevronDown size={12} className={cn("transition-transform", showAllCategories && "rotate-180")} />
              {showAllCategories ? 'Show Less' : `+${CATEGORIES.length - 6} More`}
            </button>
          )}
        </div>

        {/* Results Count */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4 text-xs font-mono text-white/40">
            <span>{filteredItems.length} artifact{filteredItems.length !== 1 ? 's' : ''} found</span>
            {search && (
              <span>Filtering by: "{search}"</span>
            )}
          </div>
        )}

        {/* Grid/List View */}
        <div className={cn(
          displayMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-fr pb-20"
            : "flex flex-col gap-3 pb-20"
        )}>
          {isLoading && allItems.length === 0 ? (
            // Skeleton Loading State
            <>
              {[...Array(8)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item, i) => (
              <MarketplaceCard key={`${item.chainId}-${item.id}-${i}`} item={item} viewMode={displayMode} />
            ))
          ) : (
            // Empty State
            <div className="col-span-full flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
              <div className="p-6 rounded-full bg-white/5 text-white/20 mb-6">
                <Archive size={48} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Artifacts Found</h3>
              <p className="text-white/40 text-sm max-w-md mx-auto mb-6">
                {view === 'ACTIVE'
                  ? "No active listings found on any network."
                  : view === 'SOLD'
                    ? "No sold-out items found."
                    : "No archived items found."
                }
              </p>
              {(search || filter !== 'ALL') && (
                <button
                  onClick={() => { setSearch(''); setFilter('ALL'); }}
                  className="px-6 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold border border-primary/20 hover:bg-primary/20 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}