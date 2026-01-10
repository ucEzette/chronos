"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useBalance, useEnsName, useEnsAvatar, useDisconnect } from "wagmi";
import { formatEther, parseAbiItem, createPublicClient, http, type AbiEvent } from "viem"; // FIX: Import AbiEvent type
import { Navigation } from "../../../components/Navigation";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "../../../lib/contracts";
import { datahaven, arcTestnet } from "../../../lib/chains";
import { Footer } from "../../../components/Footer";
import { fetchIPFS } from "../../../lib/ipfs";
import { decryptFile } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { ProfileInventory } from "../ProfileInventory";
import { getUserAvatar, ANIME_AVATARS } from "@/lib/avatars";
import { getFavorites, FavoriteItem } from "@/lib/favorites";
import {
  Settings, Power, Copy, Wallet, Activity, Search,
  CheckCircle2, RefreshCw, Download, Music, Video, FileText, User,
  Clock, ArrowUpRight, ArrowDownLeft, Code, Twitter, Upload, Edit3,
  Link as LinkIcon, X, Camera, Shield, Ban, Globe, ExternalLink, Tag, Menu, MessageCircle
} from "lucide-react";

// --- HELPERS ---
const SUPPORTED_CHAINS = [datahaven, arcTestnet];

const formatTimeAgo = (timestamp: number | undefined) => {
  if (!timestamp) return "Pending...";
  const diff = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const { disconnect } = useDisconnect();

  const profileAddress = (params?.address as string) || "";
  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress.toLowerCase();

  const { data: balanceData } = useBalance({ address: profileAddress as `0x${string}` });
  const { data: ensName } = useEnsName({ address: profileAddress as `0x${string}` });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! });

  // State
  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'FAVORITES' | 'INVENTORY' | 'TRANSACTIONS' | 'SETTINGS'>('LISTINGS');
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reputation, setReputation] = useState(50);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    displayName: "", avatarUrl: "", twitterHandle: "", ghostMode: false,
    bio: "", discord: "", website: "", github: "",
    hideInventory: false, hideTransactions: false
  });
  const [listings, setListings] = useState<any[]>([]); // Items listed by this seller
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]); // User's favorites

  // --- ROBUST DATA FETCHING ---
  useEffect(() => {
    if (!profileAddress) return;

    const fetchAllChainData = async () => {
      setIsLoading(true);
      const allItems: any[] = [];
      const allTxs: any[] = [];
      let totalSales = 0;
      let totalCancels = 0;

      try {
        await Promise.all(SUPPORTED_CHAINS.map(async (chain) => {
          const client = createPublicClient({ chain, transport: http() });
          const contractAddr = CONTRACT_ADDRESSES[chain.id];
          if (!contractAddr) return;

          // --- A. FETCH INVENTORY (Items Owned) ---
          try {
            const rawItems = await client.readContract({
              address: contractAddr,
              abi: PAYLOCK_ABI,
              functionName: 'getMarketplaceItems',
            }) as any[];

            // Check ownership for this profile
            const enrichedItems = await Promise.all(rawItems.map(async (item) => {
              const ownership = await client.readContract({
                address: contractAddr,
                abi: PAYLOCK_ABI,
                functionName: 'checkOwnership',
                args: [item.id, profileAddress as `0x${string}`]
              }) as [boolean, string];

              if (ownership[0]) {
                return {
                  ...item,
                  chainId: chain.id,
                  chainName: chain.name,
                  currency: chain.nativeCurrency.symbol,
                  hasKey: !!(ownership[1] && ownership[1].length > 0),
                  receivedKey: ownership[1]
                };
              }
              return null;
            }));

            allItems.push(...enrichedItems.filter(Boolean));

            // --- B. FETCH TRANSACTION HISTORY (Chunked) ---
            const currentBlock = await client.getBlockNumber();
            const CHUNK_SIZE = BigInt(5000);
            const SCAN_DEPTH = BigInt(50000); // Scan last ~1 week
            let fromBlock = currentBlock - SCAN_DEPTH > BigInt(0) ? currentBlock - SCAN_DEPTH : BigInt(0);

            // Helper to fetch logs safely
            const fetchLogsInChunks = async (eventName: string, args: any) => {
              let logs: any[] = [];
              for (let i = fromBlock; i < currentBlock; i += CHUNK_SIZE) {
                const to = (i + CHUNK_SIZE) > currentBlock ? currentBlock : (i + CHUNK_SIZE);
                try {
                  const chunk = await client.getLogs({
                    address: contractAddr,
                    // FIX: Explicitly cast to AbiEvent to solve the TS error
                    event: parseAbiItem(eventName) as AbiEvent,
                    args,
                    fromBlock: i,
                    toBlock: to
                  });
                  logs = [...logs, ...chunk];
                } catch (e) { console.warn(`Chunk failed on ${chain.name}`, e); }
              }
              return logs;
            };

            // 1. Bought Events (Where I am buyer)
            const purchases = await fetchLogsInChunks('event ItemPurchased(uint256 indexed id, address indexed buyer)', { buyer: profileAddress });

            // 2. Sold Events (Where I am seller)
            const myListings = await fetchLogsInChunks('event ItemListed(uint256 indexed id, address indexed seller, uint256 price)', { seller: profileAddress });

            // Get all sales for items I listed
            const myItemIds = new Set(myListings.map(l => l.args.id?.toString()));
            // Fetch global purchases to find who bought my items
            const allPurchases = await fetchLogsInChunks('event ItemPurchased(uint256 indexed id, address indexed buyer)', {});
            const mySales = allPurchases.filter(l => myItemIds.has(l.args.id?.toString()));

            // 3. Cancelled Events
            const cancels = await fetchLogsInChunks('event ItemCanceled(uint256 indexed id, address indexed seller)', { seller: profileAddress });

            // --- C. PROCESS & FORMAT TRANSACTIONS ---

            // Timestamp Cache
            const blockCache: Record<string, number> = {};
            const getTimestamp = async (bn: bigint) => {
              if (blockCache[bn.toString()]) return blockCache[bn.toString()];
              try {
                const b = await client.getBlock({ blockNumber: bn });
                blockCache[bn.toString()] = Number(b.timestamp);
                return Number(b.timestamp);
              } catch { return Date.now() / 1000; }
            };

            const formatTx = async (logs: any[], type: string, positive: boolean) => {
              return Promise.all(logs.map(async (l) => {
                const ts = await getTimestamp(l.blockNumber);
                const relatedItem = rawItems.find((i: any) => i.id.toString() === l.args.id?.toString());
                const txPrice = l.args.price || (relatedItem ? relatedItem.price : BigInt(0));

                return {
                  type,
                  positive, // Is it money in (+) or money out (-)?
                  hash: l.transactionHash,
                  block: l.blockNumber,
                  timestamp: ts,
                  id: l.args.id?.toString(),
                  price: txPrice,
                  name: relatedItem ? relatedItem.name : "Unknown Item",
                  chainId: chain.id,
                  explorer: chain.blockExplorers?.default.url,
                  currency: chain.nativeCurrency.symbol
                };
              }));
            };

            const [boughtTxs, soldTxs, listedTxs, cancelTxs] = await Promise.all([
              formatTx(purchases, 'BOUGHT', false), // Money Out
              formatTx(mySales, 'SOLD', true),      // Money In
              formatTx(myListings, 'LISTED', false), // Neutral
              formatTx(cancels, 'CANCELED', false)   // Neutral
            ]);

            allTxs.push(...boughtTxs, ...soldTxs, ...listedTxs, ...cancelTxs);

            // Reputation Calc
            totalSales += mySales.length;
            totalCancels += cancels.length;

          } catch (err) {
            console.error(`Error scanning ${chain.name}:`, err);
          }
        }));

        setInventory(allItems);
        setTransactions(allTxs.sort((a, b) => b.timestamp - a.timestamp));

        // Reputation Score Calculation (includes reviews, NOT cancels)
        // Import reviews for this seller
        const { getSellerAverageRating } = await import('@/lib/reviews');
        const { average: reviewAvg, count: reviewCount } = getSellerAverageRating(profileAddress);

        // Base: 50, +5 per sale, +review bonus (cancels do NOT affect reputation)
        const salesBonus = totalSales * 5;
        const reviewBonus = reviewCount > 0 ? Math.round((reviewAvg - 3) * 10) : 0; // +20 max for 5 stars, -20 for 1 star

        const score = Math.min(100, Math.max(0, 50 + salesBonus + reviewBonus));
        setReputation(score);

      } finally {
        setIsLoading(false);
      }
    };

    fetchAllChainData();
  }, [profileAddress]);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (!profileAddress) return;
    try {
      const saved = localStorage.getItem(`chronos_profile_${profileAddress}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to load profile settings:', e);
    }
  }, [profileAddress]);

  // Load favorites from localStorage
  useEffect(() => {
    if (!connectedAddress || !isOwnProfile) return;
    const favs = getFavorites(connectedAddress);
    setFavorites(favs);
  }, [connectedAddress, isOwnProfile]);

  // Fetch listings (items where seller == profileAddress)
  useEffect(() => {
    if (!profileAddress) return;

    const fetchListings = async () => {
      const allListings: any[] = [];

      await Promise.all(SUPPORTED_CHAINS.map(async (chain) => {
        const client = createPublicClient({ chain, transport: http() });
        const contractAddr = CONTRACT_ADDRESSES[chain.id];
        if (!contractAddr) return;

        try {
          const rawItems = await client.readContract({
            address: contractAddr,
            abi: PAYLOCK_ABI,
            functionName: 'getMarketplaceItems',
          }) as any[];

          // Filter to items where seller matches profile address
          const sellerItems = rawItems.filter((item: any) =>
            item.seller?.toLowerCase() === profileAddress.toLowerCase() &&
            !item.isCanceled
          );

          for (const item of sellerItems) {
            allListings.push({
              ...item,
              chainId: chain.id,
              chainName: chain.name,
            });
          }
        } catch (err) {
          console.error(`Error fetching listings from ${chain.name}:`, err);
        }
      }));

      setListings(allListings);
    };

    fetchListings();
  }, [profileAddress]);

  // Handlers
  const handleCopy = () => { navigator.clipboard.writeText(profileAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleDecrypt = async (item: any) => {
    try {
      const blob = await fetchIPFS(item.ipfsCid);
      const decryptedBlob = await decryptFile(blob, item.receivedKey);
      const url = window.URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.name);
      document.body.appendChild(link);
      link.click();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const displayAvatar = settings.avatarUrl || ensAvatar;
  const userLevel = Math.floor(Math.sqrt(transactions.length + 1));

  return (
    <div className="bg-[#020e14] text-white min-h-screen font-display overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      <Navigation />

      <main className="flex-grow w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10">

        {/* SIDEBAR */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 order-1 lg:order-none">
          <div className="rounded-xl border border-white/10 bg-[#0b1a24]/80 backdrop-blur-md p-6 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary"></div>

            <div className="w-32 h-32 rounded-xl bg-black ring-4 ring-white/5 shadow-neon mb-4 overflow-hidden flex items-center justify-center">
              <img
                src={settings.avatarUrl || ensAvatar || getUserAvatar(profileAddress)}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight truncate w-full">{settings.displayName || "Time Traveler"}</h1>
            <p className="text-primary text-sm font-medium mb-4">Level {userLevel} User</p>

            <div className="w-full bg-black/40 rounded-lg p-3 mb-4 border border-white/5 hover:border-primary/30 transition-colors">
              <button onClick={handleCopy} className="flex justify-between items-center w-full group">
                <code className="text-blue-400 text-xs font-mono truncate mr-2">{profileAddress.slice(0, 10)}...{profileAddress.slice(-8)}</code>
                {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500 group-hover:text-white" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Reputation</p>
                <p className={cn("font-bold font-mono text-sm", reputation > 70 ? "text-green-400" : "text-yellow-400")}>{reputation}/100</p>
              </div>
              <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Artifacts</p>
                <p className="text-white font-bold font-mono text-sm">{inventory.length}</p>
              </div>
            </div>

            {isOwnProfile && <button onClick={() => { if (confirm("Disconnect?")) { disconnect(); router.push("/"); } }} className="w-full py-3 px-4 bg-black/40 hover:bg-red-900/20 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-400 rounded-lg transition-all text-xs font-mono flex items-center justify-center gap-2 group uppercase tracking-widest"><Power size={16} /> Disconnect</button>}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 order-2 lg:order-none">
          <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-1 border-b border-white/10">
            {/* Dynamic tabs based on privacy settings */}
            {(() => {
              const tabs = ['LISTINGS'];
              // FAVORITES only for own profile
              if (isOwnProfile) tabs.push('FAVORITES');
              // Only show INVENTORY if own profile or privacy not set
              if (isOwnProfile || !settings.hideInventory) tabs.push('INVENTORY');
              // Only show TRANSACTIONS if own profile or privacy not set
              if (isOwnProfile || !settings.hideTransactions) tabs.push('TRANSACTIONS');
              // Settings only for own profile
              if (isOwnProfile) tabs.push('SETTINGS');
              return tabs;
            })().map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-3 rounded-t-lg font-bold text-xs tracking-wide transition-all border-t border-x", activeTab === tab ? "bg-primary text-black border-primary shadow-[0_-4px_20px_-5px_rgba(0,229,255,0.3)] relative z-10" : "bg-[#0f172a] text-gray-400 hover:text-white border-white/5 hover:bg-white/5")}>{tab}</button>
            ))}
          </div>

          {/* 0. LISTINGS TAB (Seller's Products) */}
          {activeTab === 'LISTINGS' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-xs text-white/40 mb-4">Items listed for sale by this user ({listings.length})</p>
              {isLoading ? (
                <div className="py-20 text-center"><RefreshCw className="animate-spin mx-auto text-primary" /></div>
              ) : listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings.map((item, i) => (
                    <a
                      key={i}
                      href={`/item/${item.id}?chain=${item.chainId}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[#0b1a24]/60 border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all group"
                    >
                      <div className="size-12 rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-primary">
                        <Tag size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{item.name}</p>
                        <p className="text-xs text-white/40 font-mono">{formatEther(item.price)} {item.chainId === 55931 ? 'ETH' : 'ETH'}</p>
                      </div>
                      <div className="text-white/30 group-hover:text-primary transition-colors">
                        <ExternalLink size={16} />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/30 font-mono text-xs col-span-full border border-dashed border-white/10 rounded-xl">
                  No items listed for sale
                </div>
              )}
            </div>
          )}

          {/* FAVORITES TAB (Only for own profile) */}
          {activeTab === 'FAVORITES' && isOwnProfile && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-xs text-white/40 mb-4">Your bookmarked items ({favorites.length})</p>
              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favorites.map((fav, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[#0b1a24]/60 border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all group"
                    >
                      <a href={`/item/${fav.itemId}?chain=${fav.chainId}`} className="flex items-center gap-4 flex-1">
                        <div className="size-12 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center text-red-400">
                          <Tag size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{fav.name}</p>
                          <p className="text-xs text-white/40 font-mono">{formatEther(fav.price)} ETH</p>
                        </div>
                      </a>
                      <button
                        onClick={() => {
                          const { removeFavorite } = require('@/lib/favorites');
                          removeFavorite(connectedAddress!, fav.itemId, fav.chainId);
                          setFavorites(prev => prev.filter(f => !(f.itemId === fav.itemId && f.chainId === fav.chainId)));
                        }}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-all"
                        title="Remove from favorites"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/30 font-mono text-xs border border-dashed border-white/10 rounded-xl">
                  No favorites yet. Click the heart icon on items to add them!
                </div>
              )}
            </div>
          )}

          {/* 1. INVENTORY TAB */}
          {activeTab === 'INVENTORY' && (isOwnProfile || !settings.hideInventory) && (
            <ProfileInventory items={inventory} isLoading={isLoading} onDecrypt={handleDecrypt} />
          )}

          {/* 2. TRANSACTIONS TAB */}
          {activeTab === 'TRANSACTIONS' && (isOwnProfile || !settings.hideTransactions) && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isLoading ? (
                <div className="py-20 text-center"><RefreshCw className="animate-spin mx-auto text-primary" /></div>
              ) : transactions.length > 0 ? (
                transactions.map((tx, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#0b1a24]/60 border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all group gap-4">
                    <div className="flex items-center gap-4">
                      {/* Icon Box */}
                      <div className={cn("p-3 rounded-lg border",
                        tx.type === 'BOUGHT' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                          tx.type === 'SOLD' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                            tx.type === 'LISTED' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                              "bg-red-500/10 border-red-500/20 text-red-500"
                      )}>
                        {tx.type === 'BOUGHT' ? <ArrowDownLeft size={20} /> :
                          tx.type === 'SOLD' ? <ArrowUpRight size={20} /> :
                            tx.type === 'LISTED' ? <Tag size={20} /> : <Ban size={20} />}
                      </div>

                      {/* Details */}
                      <div>
                        <h4 className="text-white font-bold text-sm flex flex-wrap items-center gap-2">
                          <span className={cn(
                            tx.type === 'BOUGHT' ? "text-blue-400" :
                              tx.type === 'SOLD' ? "text-green-400" :
                                tx.type === 'LISTED' ? "text-yellow-400" : "text-red-400"
                          )}>
                            {tx.type === 'BOUGHT' ? 'Purchased Asset' :
                              tx.type === 'SOLD' ? 'Item Sold' :
                                tx.type === 'LISTED' ? 'Created Listing' : 'Canceled Item'}
                          </span>

                          {/* Chain Badge */}
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1", tx.chainId === 55931 ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-blue-600/20 text-blue-400 border-blue-600/30")}>
                            <Globe size={8} /> {tx.chainId === 55931 ? "DataHaven" : "Arc"}
                          </span>
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400 font-mono">{tx.name} <span className="opacity-50">#{tx.id}</span></p>
                          <span className="text-[10px] text-gray-600">•</span>
                          <p className="text-[10px] text-gray-500 font-mono">{formatTimeAgo(tx.timestamp)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pl-14 sm:pl-0">
                      <div className="text-right">
                        {(tx.type === 'BOUGHT' || tx.type === 'SOLD') && (
                          <p className={cn("font-mono font-bold text-sm", tx.positive ? "text-green-400" : "text-red-400")}>
                            {tx.positive ? '+' : '-'}{formatEther(tx.price)} {tx.currency}
                          </p>
                        )}
                        {tx.type === 'LISTED' && <p className="font-mono text-xs text-yellow-500">{formatEther(tx.price)} {tx.currency}</p>}
                      </div>

                      <a
                        href={`${tx.explorer}/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary text-gray-400 transition-colors border border-white/5"
                        title="View on Explorer"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-gray-500 font-mono text-xs uppercase bg-black/20 rounded-xl border border-white/5 border-dashed">
                  No transaction history found on any chain.
                </div>
              )}
            </div>
          )}

          {/* 3. SETTINGS TAB */}
          {activeTab === 'SETTINGS' && (
            <div className="rounded-xl border border-white/10 bg-[#0b1a24]/80 p-6 animate-in fade-in space-y-6">
              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-white/40 flex items-center gap-2">
                  <User size={14} /> Profile Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Display Name</label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                      value={settings.displayName}
                      onChange={e => setSettings({ ...settings, displayName: e.target.value })}
                      placeholder="Your public name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1.5 flex items-center gap-2">
                      <Camera size={12} /> Avatar
                    </label>
                    {/* Avatar Selection Grid */}
                    <div className="grid grid-cols-6 gap-2 mb-3 p-3 bg-black/40 border border-white/10 rounded-xl">
                      {ANIME_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSettings({ ...settings, avatarUrl: url })}
                          className={cn(
                            "size-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                            settings.avatarUrl === url
                              ? "border-primary shadow-neon"
                              : "border-transparent hover:border-white/30"
                          )}
                        >
                          <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    {/* Custom URL Input */}
                    <div className="relative">
                      <input
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                        value={settings.avatarUrl}
                        onChange={e => setSettings({ ...settings, avatarUrl: e.target.value })}
                        placeholder="Or paste custom avatar URL..."
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Bio</label>
                  <textarea
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all h-24 resize-none"
                    value={settings.bio || ''}
                    onChange={e => setSettings({ ...settings, bio: e.target.value })}
                    placeholder="Tell people about yourself and what you create..."
                  />
                  <p className="text-[10px] text-white/30 mt-1">{(settings.bio || '').length}/500 characters</p>
                </div>
              </div>

              {/* Social Links Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase text-white/40 flex items-center gap-2">
                  <LinkIcon size={14} /> Social Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 flex items-center gap-1.5">
                      <Twitter size={12} /> Twitter/X Handle
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                      <input
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                        value={settings.twitterHandle}
                        onChange={e => setSettings({ ...settings, twitterHandle: e.target.value.replace('@', '') })}
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 flex items-center gap-1.5">
                      <MessageCircle size={12} /> Discord
                    </label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                      value={settings.discord || ''}
                      onChange={e => setSettings({ ...settings, discord: e.target.value })}
                      placeholder="username#0000 or server link"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 flex items-center gap-1.5">
                      <Globe size={12} /> Website
                    </label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                      value={settings.website || ''}
                      onChange={e => setSettings({ ...settings, website: e.target.value })}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5 flex items-center gap-1.5">
                      <Code size={12} /> GitHub
                    </label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
                      value={settings.github || ''}
                      onChange={e => setSettings({ ...settings, github: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-bold uppercase text-white/40 flex items-center gap-2">
                  <Shield size={14} /> Privacy
                </h3>
                <label className="flex items-center gap-3 p-4 bg-black/40 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                  <input
                    type="checkbox"
                    checked={settings.ghostMode}
                    onChange={e => setSettings({ ...settings, ghostMode: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/30"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Ghost Mode</p>
                    <p className="text-xs text-white/40">Hide your profile from public view</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-black/40 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                  <input
                    type="checkbox"
                    checked={settings.hideInventory}
                    onChange={e => setSettings({ ...settings, hideInventory: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/30"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Hide Inventory</p>
                    <p className="text-xs text-white/40">Hide your owned items from other users</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-black/40 rounded-xl border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                  <input
                    type="checkbox"
                    checked={settings.hideTransactions}
                    onChange={e => setSettings({ ...settings, hideTransactions: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/30"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">Hide Transactions</p>
                    <p className="text-xs text-white/40">Hide your transaction history from other users</p>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => {
                    localStorage.setItem(`chronos_profile_${profileAddress}`, JSON.stringify(settings));
                    alert('Profile saved!');
                  }}
                  className="px-6 py-3 bg-primary text-black rounded-xl font-bold text-sm hover:bg-white transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer /> {/* Render Footer */}
    </div>
  );
}