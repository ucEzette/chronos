"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useWriteContract, useReadContract, useSwitchChain } from "wagmi";
import { formatEther } from "viem";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { MediaPreview } from "@/components/MediaPreview";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { getDataHavenUrl } from "@/lib/datahaven";
import { decryptFile } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Download, Shield, User, Globe, Share2,
  Check, FileText, Lock, Loader2, RefreshCw, ShoppingCart, Plus, Minus
} from "lucide-react";
import { useCart } from "@/components/CartContext";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewList } from "@/components/ReviewList";
import { StarRating } from "@/components/StarRating";
import { getItemAverageRating } from "@/lib/reviews";
import { ReportModal } from "@/components/ReportModal";
import { Flag } from "lucide-react";

export default function ItemDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address, chain: currentChain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const itemId = BigInt(params?.id as string || "0");
  const targetChainId = Number(searchParams?.get('chain') || "55931");

  // FIX: Type meta as 'any' to fix TS error
  const [meta, setMeta] = useState<any>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [waitingForKey, setWaitingForKey] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReclaiming, setIsReclaiming] = useState(false);

  const { addToCart, isInCart } = useCart();

  const contractAddr = CONTRACT_ADDRESSES[targetChainId];
  const { data: rawItems, isLoading: isItemLoading, refetch: refetchItems } = useReadContract({
    address: contractAddr,
    abi: PAYLOCK_ABI,
    functionName: 'getMarketplaceItems',
    chainId: targetChainId,
  });

  const { data: ownershipData, refetch: refetchOwnership } = useReadContract({
    address: contractAddr,
    abi: PAYLOCK_ABI,
    functionName: 'checkOwnership',
    args: [itemId, address || "0x0000000000000000000000000000000000000000"],
    chainId: targetChainId,
    query: { enabled: !!address }
  });

  const { data: purchaseTimeData, refetch: refetchPurchaseTime } = useReadContract({
    address: contractAddr,
    abi: PAYLOCK_ABI,
    functionName: 'purchaseTime',
    args: [itemId, address || "0x0000000000000000000000000000000000000000"],
    chainId: targetChainId,
    query: { enabled: !!address }
  });

  const purchaseTimestamp = Number(purchaseTimeData || 0);
  const canReclaim = purchaseTimestamp > 0 && (Date.now() / 1000) > (purchaseTimestamp + 24 * 3600);

  const item = (rawItems as any[])?.find(i => i.id === itemId);
  const isOwner = ownershipData?.[0] === true;
  const accessKey = ownershipData?.[1];

  // Auto-refresh after purchase to detect key delivery
  useEffect(() => {
    if (!waitingForKey) return;

    const interval = setInterval(async () => {
      await refetchOwnership();
      await refetchItems();

      // Stop polling once we have the key
      if (accessKey && accessKey !== "0x" && accessKey.length > 2) {
        setWaitingForKey(false);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [waitingForKey, accessKey, refetchOwnership, refetchItems]);

  useEffect(() => {
    if (!item?.previewCid) return;

    const loadMeta = async () => {
      try {
        const cleanKey = item.previewCid.replace("ipfs://", "");
        const url = getDataHavenUrl(cleanKey);

        const res = await fetch(url);
        if (!res.ok) throw new Error("Fetch failed");

        const contentType = res.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setMeta({
            name: data.name || item.name,
            description: data.description || "No description provided.",
            image: data.image ? getDataHavenUrl(data.image) : null,
            animation_url: data.animation_url ? getDataHavenUrl(data.animation_url) : null
          });
        } else {
          setMeta({
            image: url,
            description: "No additional description provided.",
            directPreview: true
          });
        }
      } catch (e) {
        setMeta({ image: getDataHavenUrl(item.previewCid.replace("ipfs://", "")) });
      }
    };
    loadMeta();
  }, [item]);

  const handleDownload = async () => {
    if (!isOwner || !accessKey) {
      alert("You must purchase this item and receive the key to download.");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadMsg("Fetching Encrypted File...");
      const cleanKey = item.ipfsCid.replace("ipfs://", "");
      const url = getDataHavenUrl(cleanKey);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);

      const encryptedBlob = await res.blob();

      setDownloadMsg("Decrypting...");
      const decryptedBlob = await decryptFile(encryptedBlob, accessKey);

      setDownloadMsg("Preparing Download...");
      const ext = item.fileType ? `.${item.fileType.toLowerCase()}` : '.dat';
      const fileName = `${item.name.replace(/\s+/g, '_')}_UNLOCKED${ext}`;

      // Create blob URL
      const blobUrl = window.URL.createObjectURL(decryptedBlob);

      // Try standard download first
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);

      // Check if we're on mobile/iOS
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // For mobile, open in new tab so user can long-press to save
        setDownloadMsg("Opening file...");
        window.open(blobUrl, '_blank');

        // Keep URL alive longer for mobile
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(link);
        }, 30000);
      } else {
        link.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(link);
        }, 1000);
      }

      setDownloadMsg("Done!");
      setTimeout(() => { setIsDownloading(false); setDownloadMsg(""); }, 2000);

    } catch (e: any) {
      alert(`Download Failed: ${e.message}`);
      setIsDownloading(false);
    }
  };

  const handleBuy = async () => {
    if (currentChain?.id !== targetChainId) {
      try { await switchChainAsync({ chainId: targetChainId }); }
      catch { alert("Please switch network manually."); return; }
    }

    setIsBuying(true);
    try {
      await writeContractAsync({
        address: contractAddr,
        abi: PAYLOCK_ABI,
        functionName: 'buyItem',
        args: [itemId],
        value: item.price
      });

      // Start auto-refresh polling to detect key delivery
      setWaitingForKey(true);

      // Immediate refresh
      await refetchOwnership();
      await refetchItems();

    } catch (e: any) {
      alert("Error: " + (e.reason || e.message));
    } finally {
      setIsBuying(false);
    }
  };

  const handleReclaim = async () => {
    if (currentChain?.id !== targetChainId) {
      try { await switchChainAsync({ chainId: targetChainId }); }
      catch { alert("Please switch network manually."); return; }
    }

    setIsReclaiming(true);
    try {
      await writeContractAsync({
        address: contractAddr,
        abi: PAYLOCK_ABI,
        functionName: 'reclaimFunds',
        args: [itemId],
      });

      alert("Funds reclaimed successfully!");
      router.refresh();
      await refetchItems();
      await refetchOwnership();
      await refetchPurchaseTime();
    } catch (e: any) {
      alert("Reclaim failed: " + (e.reason || e.message));
    } finally {
      setIsReclaiming(false);
    }
  };

  if (isItemLoading || !item) return <div className="min-h-screen bg-[#020e14] flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  const type = item.fileType.toUpperCase();
  const sold = Number(item.soldCount);
  const max = Number(item.maxSupply);
  const isActive = item.isActive !== undefined ? item.isActive : !item.isSoldOut;
  const isSoldOut = !isActive || (item.isSoldOut || sold >= max);

  const previewSource = meta?.directPreview
    ? getDataHavenUrl(item.previewCid.replace("ipfs://", ""))
    : (meta?.animation_url || meta?.image || getDataHavenUrl(item.previewCid.replace("ipfs://", "")));

  return (
    <div className="min-h-screen bg-[#020e14] text-white font-display flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:py-12">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} /> Back to Market
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-6">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl">
              {/* Direct image/video like marketplace */}
              {meta?.animation_url && type.includes("VIDEO") ? (
                <video
                  src={meta.animation_url}
                  className="w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                  controls
                  poster={meta?.image || undefined}
                />
              ) : meta?.image ? (
                <img
                  src={meta.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/600x600/0b1a24/00E5FF?text=ENCRYPTED";
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                  <FileText size={48} className="text-white/20 mb-2" />
                  <span className="text-xs text-white/40">Preview Loading...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-500/10 text-blue-400"><Globe size={20} /></div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Network</p>
                  <p className="text-sm font-bold">{targetChainId === 55931 ? "DataHaven Testnet" : "Arc Testnet"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-bold">Contract</p>
                <p className="text-sm font-mono text-primary truncate w-24">{contractAddr.slice(0, 6)}...{contractAddr.slice(-4)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <div className="flex justify-between items-start">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2">{item.name}</h1>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                  {copied ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="p-2 rounded-full bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors ml-2"
                  title="Report Content"
                >
                  <Flag size={18} />
                </button>
              </div>
              <p className="text-primary font-mono text-sm mb-4">ID: #{item.id.toString()} • {type}</p>

              {/* Seller Info with Bio */}
              {(() => {
                // Load seller profile from localStorage
                let sellerProfile: any = { displayName: '', bio: '', twitterHandle: '', discord: '', website: '', github: '' };
                try {
                  const saved = typeof window !== 'undefined' ? localStorage.getItem(`chronos_profile_${item.seller}`) : null;
                  if (saved) sellerProfile = { ...sellerProfile, ...JSON.parse(saved) };
                } catch { }

                return (
                  <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <Link
                      href={`/profile/${item.seller}`}
                      className="flex items-center gap-3 hover:bg-white/5 -m-2 p-2 rounded-lg transition-all group"
                    >
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-black font-bold group-hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all overflow-hidden">
                        <User size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                          {sellerProfile.displayName || `${item.seller.slice(0, 6)}...${item.seller.slice(-4)}`}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{item.seller.slice(0, 10)}...{item.seller.slice(-6)}</p>
                      </div>
                      <div className="text-xs text-white/30 group-hover:text-primary transition-colors">
                        View Profile →
                      </div>
                    </Link>

                    {/* Bio */}
                    {sellerProfile.bio && (
                      <p className="text-sm text-gray-400 mt-3 italic border-t border-white/5 pt-3">
                        "{sellerProfile.bio.slice(0, 150)}{sellerProfile.bio.length > 150 ? '...' : ''}"
                      </p>
                    )}

                    {/* Social Links */}
                    {(sellerProfile.twitterHandle || sellerProfile.discord || sellerProfile.website) && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                        {sellerProfile.twitterHandle && (
                          <a href={`https://twitter.com/${sellerProfile.twitterHandle}`} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:underline">
                            @{sellerProfile.twitterHandle}
                          </a>
                        )}
                        {sellerProfile.discord && (
                          <span className="text-xs text-purple-400">{sellerProfile.discord}</span>
                        )}
                        {sellerProfile.website && (
                          <a href={sellerProfile.website} target="_blank" rel="noopener" className="text-xs text-primary hover:underline truncate max-w-32">
                            {sellerProfile.website.replace('https://', '').replace('http://', '')}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Collapsible Description */}
            {(() => {
              const description = meta?.description || item.description || "No description provided.";
              const isLong = description.length > 200;
              const displayText = isDescriptionExpanded || !isLong ? description : description.slice(0, 200) + "...";

              return (
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                    <FileText size={14} /> Artifact Manifest
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                    {displayText}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-3 text-primary text-xs font-bold hover:underline transition-all flex items-center gap-1"
                    >
                      {isDescriptionExpanded ? (
                        <>Show Less ↑</>
                      ) : (
                        <>Read More ↓</>
                      )}
                    </button>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Supply</p>
                <p className="text-xl font-mono font-bold">{sold} / {max}</p>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Status</p>
                <p className={cn("text-xl font-mono font-bold uppercase", isSoldOut ? "text-red-500" : "text-green-500")}>
                  {isSoldOut ? "Sold Out" : "Active"}
                </p>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <ReviewList itemId={itemId.toString()} chainId={targetChainId} limit={3} />
              <ReviewForm
                itemId={itemId.toString()}
                chainId={targetChainId}
                sellerAddress={item.seller}
                isOwner={isOwner}
              />
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex justify-between items-end mb-6">
                <span className="text-sm text-gray-400 font-bold uppercase">Price</span>
                <span className="text-4xl font-black text-white tracking-tight">{formatEther(item.price)} <span className="text-lg text-primary">MOCK</span></span>
              </div>

              {isOwner ? (
                <>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading || !accessKey}
                    className={cn("w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                      accessKey ? "bg-green-500 hover:bg-green-400 text-black shadow-neon" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 cursor-wait")}
                  >
                    {isDownloading ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                    {isDownloading ? downloadMsg : accessKey ? "Decrypt & Download" : "Waiting for Key..."}
                  </button>
                  {!accessKey && (
                    <div className="space-y-3 mt-4">
                      <p className="text-xs text-center text-yellow-500 font-mono">* Payment sent. Waiting for seller to release encryption key.</p>

                      {purchaseTimestamp > 0 && (
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                          <p className="text-xs text-gray-400 mb-2">
                            Seller has 24 hours to deliver.
                          </p>
                          {canReclaim ? (
                            <button
                              onClick={handleReclaim}
                              disabled={isReclaiming}
                              className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold uppercase text-xs transition-colors flex items-center justify-center gap-2"
                            >
                              {isReclaiming ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                              Reclaim Funds
                            </button>
                          ) : (
                            <p className="text-xs font-mono text-gray-500">
                              Reclaim available in: {Math.max(0, Math.ceil((24 * 3600 - (Date.now() / 1000 - purchaseTimestamp)) / 3600))}h
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-sm text-white/60">Quantity</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-mono font-bold">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => Math.min(max - sold, q + 1))}
                        className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Buy Now Button */}
                  <button
                    onClick={handleBuy}
                    disabled={isSoldOut || isBuying}
                    className={cn("w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-neon hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg",
                      isSoldOut ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-primary text-black hover:bg-white")}
                  >
                    {isBuying ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
                    {isSoldOut ? "Artifact Unavailable" : "Buy Now"}
                  </button>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => {
                      addToCart({
                        itemId: itemId.toString(),
                        chainId: targetChainId,
                        price: item.price,
                        name: item.name,
                        previewUrl: meta?.image || '',
                        seller: item.seller,
                        fileType: item.fileType
                      });
                    }}
                    disabled={isSoldOut || isInCart(itemId.toString(), targetChainId)}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2",
                      isInCart(itemId.toString(), targetChainId)
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : isSoldOut
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                          : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                    )}
                  >
                    {isInCart(itemId.toString(), targetChainId) ? (
                      <><Check size={16} /> In Cart</>
                    ) : (
                      <><ShoppingCart size={16} /> Add to Cart</>
                    )}
                  </button>
                </div>
              )}

              <p className="text-center text-[10px] text-gray-600 mt-4 uppercase tracking-widest flex items-center justify-center gap-1">
                <Shield size={10} /> Secured by Chronos Smart Contract
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {item && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          itemId={itemId.toString()}
          chainId={targetChainId}
          itemName={meta?.name || item.name}
          sellerAddress={item.seller}
          reporterAddress={address || ""}
        />
      )}
    </div>
  );
}