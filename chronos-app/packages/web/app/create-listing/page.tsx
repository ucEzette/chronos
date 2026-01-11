"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useAccount, useWriteContract, useSignMessage, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { useRouter } from "next/navigation";
import { Navigation } from "../../components/Navigation";
import { Footer } from "../../components/Footer";
import { PAYLOCK_ABI, getContractAddress } from "../../lib/contracts";
import { uploadFileViaApi } from "../../lib/storage";
import { signatureToKey, encryptFile } from "../../lib/crypto";
import { cn } from "@/lib/utils";
import { CATEGORIES, getSubcategories, type Category } from "@/lib/categories";
import {
   Loader2, Rocket, Lock, Image as ImageIcon, KeyRound, UploadCloud,
   CheckCircle2, AlertCircle, X, Eye, Edit3, Film, Mic, AlignLeft,
   Zap, Sliders, Sparkles, Package, FileText, DollarSign, Hash,
   Maximize2, Minimize2, ArrowRight, Shield
} from "lucide-react";

// --- Toast Component ---
const Toast = memo(function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
   useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
   return (
      <div className={cn(
         "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl animate-in slide-in-from-right-5 shadow-2xl transition-all max-w-md",
         type === 'success'
            ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_30px_rgba(0,229,255,0.2)]"
            : "bg-red-500/10 border-red-500/30 text-red-400"
      )}>
         {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
         <p className="text-sm font-bold font-mono uppercase tracking-wider flex-1">{message}</p>
         <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
         </button>
      </div>
   );
});

// --- Progress Steps Component ---
const ProgressSteps = memo(function ProgressSteps({ status }: { status: string }) {
   const steps = [
      { id: 'SIGNING_KEY', label: 'Signing Key', icon: KeyRound },
      { id: 'UPLOADING', label: 'Uploading', icon: UploadCloud },
      { id: 'TX', label: 'Minting', icon: Rocket },
      { id: 'SUCCESS', label: 'Complete', icon: CheckCircle2 },
   ];

   const currentIndex = steps.findIndex(s => s.id === status);

   return (
      <div className="flex items-center justify-center gap-2 py-4">
         {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === status;
            const isComplete = currentIndex > index;

            return (
               <div key={step.id} className="flex items-center gap-2">
                  <div className={cn(
                     "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                     isActive && "bg-primary/20 border-primary text-primary animate-pulse",
                     isComplete && "bg-primary/10 border-primary/30 text-primary",
                     !isActive && !isComplete && "bg-white/5 border-white/10 text-white/40"
                  )}>
                     <Icon size={14} className={isActive ? "animate-bounce" : ""} />
                     <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                     <ArrowRight size={14} className={cn(
                        "transition-colors",
                        isComplete ? "text-primary" : "text-white/20"
                     )} />
                  )}
               </div>
            );
         })}
      </div>
   );
});

// --- Live Preview Card Component ---
const LivePreviewCard = memo(function LivePreviewCard({
   formData,
   previewUrl,
   mediaType,
   blurAmount,
   zoomLevel,
   currencySymbol,
   isFullscreen,
   onToggleFullscreen
}: {
   formData: any;
   previewUrl: string | null;
   mediaType: string;
   blurAmount: number;
   zoomLevel: number;
   currencySymbol: string;
   isFullscreen: boolean;
   onToggleFullscreen: () => void;
}) {
   const videoRef = useRef<HTMLVideoElement>(null);

   return (
      <div className={cn(
         "rounded-2xl border border-white/10 bg-[#0b1a24]/80 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-500",
         isFullscreen && "fixed inset-4 z-50 m-0"
      )}>
         {/* Header */}
         <div className="p-4 border-b border-white/10 bg-black/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye size={14} className="text-primary" />
               </div>
               <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">Live Preview</span>
                  <p className="text-[10px] font-mono text-primary/60">{blurAmount}px blur • {zoomLevel}% zoom</p>
               </div>
            </div>
            <button
               onClick={onToggleFullscreen}
               className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
               {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
         </div>

         {/* Preview Image */}
         <div className={cn(
            "relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-900 to-black group",
            isFullscreen ? "h-[calc(100%-120px)]" : "aspect-square"
         )}>
            {previewUrl ? (
               <>
                  {mediaType === 'VIDEO' ? (
                     <video
                        ref={videoRef}
                        src={previewUrl}
                        autoPlay loop muted
                        className="w-full h-full object-cover transition-all duration-500"
                        style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoomLevel / 100})` }}
                     />
                  ) : mediaType === 'AUDIO' ? (
                     <div className="w-full h-full flex flex-col items-center justify-center relative">
                        <div
                           className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-primary/20 to-blue-900/50"
                           style={{ filter: `blur(${blurAmount + 30}px)` }}
                        />
                        <Mic size={48} className="text-white relative z-10 mb-4" />
                        <div className="flex gap-1 h-12 items-end relative z-10">
                           {[...Array(7)].map((_, i) => (
                              <div
                                 key={i}
                                 className="w-2 bg-primary rounded-t animate-pulse"
                                 style={{
                                    height: `${20 + Math.random() * 80}%`,
                                    animationDelay: `${i * 0.1}s`
                                 }}
                              />
                           ))}
                        </div>
                     </div>
                  ) : (
                     <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover transition-all duration-500"
                        style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoomLevel / 100})` }}
                     />
                  )}

                  {/* Encrypted Overlay */}
                  {blurAmount > 5 && (
                     <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-xl flex items-center gap-2">
                           <Lock size={14} /> Encrypted Preview
                        </div>
                     </div>
                  )}
               </>
            ) : (
               <div className="flex flex-col items-center justify-center gap-4 text-white/20 p-8">
                  <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center">
                     <ImageIcon size={32} />
                  </div>
                  <p className="text-xs font-mono uppercase tracking-widest text-center">Upload preview media</p>
               </div>
            )}
         </div>

         {/* Card Footer - Simulated Marketplace Card */}
         <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
            <div className="flex items-start justify-between gap-4">
               <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                     {formData.name || "Untitled Artifact"}
                  </h3>
                  <p className="text-xs text-primary/70 font-mono flex items-center gap-1 mt-1">
                     <Shield size={10} /> Encrypted • {formData.fileType}
                  </p>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-[10px] text-white/40 uppercase">Price</p>
                  <p className="text-lg font-bold font-mono text-white">
                     {formData.price || "0.00"}
                     <span className="text-xs text-primary/60 ml-1">{currencySymbol}</span>
                  </p>
               </div>
            </div>

            {formData.description && (
               <p className="text-xs text-gray-400 line-clamp-2 bg-white/5 p-3 rounded-xl border border-white/5">
                  {formData.description}
               </p>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
               <span className="flex items-center gap-1">
                  <Hash size={10} /> Supply: {formData.maxSupply || "1"}
               </span>
               <span className="flex items-center gap-1 text-primary">
                  <Zap size={10} /> Ready to Mint
               </span>
            </div>
         </div>
      </div>
   );
});

// --- Visual Tuner Component ---
const VisualTuner = memo(function VisualTuner({
   blurAmount,
   setBlurAmount,
   zoomLevel,
   setZoomLevel
}: {
   blurAmount: number;
   setBlurAmount: (v: number) => void;
   zoomLevel: number;
   setZoomLevel: (v: number) => void;
}) {
   return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1a24]/80 backdrop-blur-xl p-5 space-y-5">
         <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase flex gap-2 items-center">
               <Sliders size={14} className="text-primary" /> Visual Tuner
            </h3>
            <span className="text-[10px] text-gray-400 font-mono px-2 py-1 rounded-lg bg-white/5">PREVIEW EFFECTS</span>
         </div>

         {/* Blur Slider */}
         <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
               <span className="flex items-center gap-1">
                  <Eye size={10} /> Blur Amount
               </span>
               <span className="text-primary font-mono">{blurAmount}px</span>
            </div>
            <div className="relative">
               <input
                  type="range"
                  min="0"
                  max="20"
                  value={blurAmount}
                  onChange={(e) => setBlurAmount(Number(e.target.value))}
                  className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-primary"
                  style={{
                     background: `linear-gradient(to right, rgba(0,229,255,0.5) 0%, rgba(0,229,255,0.5) ${blurAmount * 5}%, rgba(255,255,255,0.1) ${blurAmount * 5}%, rgba(255,255,255,0.1) 100%)`
                  }}
               />
            </div>
            <div className="flex justify-between text-[8px] text-white/30 font-mono">
               <span>CLEAR</span>
               <span>ENCRYPTED</span>
            </div>
         </div>

         {/* Zoom Slider */}
         <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold">
               <span className="flex items-center gap-1">
                  <Maximize2 size={10} /> Zoom Level
               </span>
               <span className="text-primary font-mono">{zoomLevel}%</span>
            </div>
            <div className="relative">
               <input
                  type="range"
                  min="100"
                  max="200"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-primary"
                  style={{
                     background: `linear-gradient(to right, rgba(0,229,255,0.5) 0%, rgba(0,229,255,0.5) ${(zoomLevel - 100)}%, rgba(255,255,255,0.1) ${(zoomLevel - 100)}%, rgba(255,255,255,0.1) 100%)`
                  }}
               />
            </div>
            <div className="flex justify-between text-[8px] text-white/30 font-mono">
               <span>100%</span>
               <span>200%</span>
            </div>
         </div>

         {/* Quick Presets */}
         <div className="flex gap-2 pt-2">
            <button
               onClick={() => { setBlurAmount(0); setZoomLevel(100); }}
               className="flex-1 py-2 text-[10px] font-bold uppercase rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
               Reset
            </button>
            <button
               onClick={() => { setBlurAmount(8); setZoomLevel(120); }}
               className="flex-1 py-2 text-[10px] font-bold uppercase rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
            >
               Teaser
            </button>
            <button
               onClick={() => { setBlurAmount(15); setZoomLevel(150); }}
               className="flex-1 py-2 text-[10px] font-bold uppercase rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all"
            >
               Mystery
            </button>
         </div>
      </div>
   );
});

// --- MAIN PAGE COMPONENT ---
export default function CreateListingPage() {
   const router = useRouter();
   const [mounted, setMounted] = useState(false);
   const { address, isConnected, chain } = useAccount();
   const { data: walletClient } = useWalletClient();
   const { writeContractAsync } = useWriteContract();
   const { signMessageAsync } = useSignMessage();

   const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
   const [status, setStatus] = useState<'IDLE' | 'SIGNING_KEY' | 'UPLOADING' | 'TX' | 'SUCCESS'>('IDLE');
   const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

   // Form Data
   const [formData, setFormData] = useState({
      name: "",
      description: "",
      price: "",
      maxSupply: "1",
      fileType: ".DATA",
      category: "",
      tags: [] as string[]
   });
   const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
   const [previewFile, setPreviewFile] = useState<File | null>(null);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | 'UNKNOWN'>('UNKNOWN');

   const [blurAmount, setBlurAmount] = useState(0);
   const [zoomLevel, setZoomLevel] = useState(100);

   const currencySymbol = chain?.id === 5042002 ? "USDC" : "MOCK";

   useEffect(() => { setMounted(true); }, []);

   // Cleanup preview URL on unmount
   useEffect(() => {
      return () => {
         if (previewUrl) URL.revokeObjectURL(previewUrl);
      };
   }, [previewUrl]);

   const handleEncryptedSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
         const file = e.target.files[0];
         setEncryptedFile(file);
         const ext = file.name.split('.').pop()?.toUpperCase();
         if (ext) setFormData(p => ({ ...p, fileType: `.${ext}` }));
      }
   }, []);

   const handlePreviewSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
         const file = e.target.files[0];
         setPreviewFile(file);

         // Cleanup old URL
         if (previewUrl) URL.revokeObjectURL(previewUrl);

         setPreviewUrl(URL.createObjectURL(file));
         setBlurAmount(0);
         setZoomLevel(100);

         if (file.type.startsWith('image/')) setMediaType('IMAGE');
         else if (file.type.startsWith('video/')) setMediaType('VIDEO');
         else if (file.type.startsWith('audio/')) setMediaType('AUDIO');
         else setMediaType('UNKNOWN');
      }
   }, [previewUrl]);

   const handleInputChange = useCallback((field: string, value: string | string[]) => {
      setFormData(prev => ({ ...prev, [field]: value }));
   }, []);

   const handlePublish = async () => {
      // 1. Validation
      if (!isConnected || !address || !walletClient) {
         setToast({ message: "Wallet not connected or authorized.", type: 'error' });
         return;
      }
      if (!encryptedFile || !previewFile || !formData.name || !formData.price) {
         setToast({ message: "Please fill all fields and upload files.", type: 'error' });
         return;
      }

      try {
         setStatus('SIGNING_KEY');

         // 2. Encryption Key Signature (Chronos Logic)
         const signature = await signMessageAsync({ message: `ONEWAY_ACCESS:${formData.name.trim()}` });
         const secureKey = signatureToKey(signature);

         // Store key locally for the seller to re-download their own item later
         const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
         localKeys[formData.name.trim()] = secureKey;
         localStorage.setItem('chronos_seller_keys', JSON.stringify(localKeys));

         setStatus('UPLOADING');

         // 3. Encrypt Main File
         const encryptedBlob = await encryptFile(encryptedFile, secureKey);
         const finalEncryptedFile = new File([encryptedBlob], encryptedFile.name);

         // 4. Upload Files to Decentralized Storage (Parallel)
         // Uses Filebase (IPFS) by default, easily switchable to Ocean Protocol
         const [encryptedResult, previewResult] = await Promise.all([
            uploadFileViaApi(finalEncryptedFile, { encrypted: true }),
            uploadFileViaApi(previewFile, { encrypted: false })
         ]);

         const encryptedCid = encryptedResult.cid;
         const previewCid = previewResult.cid;

         // 5. Upload Metadata JSON (Public)
         const metadata = {
            name: formData.name,
            description: formData.description,
            image: previewCid, // IPFS CID for preview
            animation_url: (mediaType === 'VIDEO' || mediaType === 'AUDIO') ? previewCid : undefined,
            properties: {
               blur: blurAmount,
               zoom: zoomLevel,
               fileType: formData.fileType,
               fileSize: encryptedFile?.size || 0,
               category: formData.category,
               tags: formData.tags,
               storageProvider: encryptedResult.provider
            }
         };

         const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
         const metadataResult = await uploadFileViaApi(metadataFile);
         const metadataCid = metadataResult.cid;

         // 7. Mint on Blockchain
         setStatus('TX');
         const activeContract = getContractAddress(chain?.id);

         await writeContractAsync({
            address: activeContract,
            abi: PAYLOCK_ABI,
            functionName: 'listItem',
            args: [
               formData.name.trim(),
               encryptedCid, // Storing IPFS CID for encrypted file
               metadataCid,  // Storing IPFS CID for metadata
               formData.fileType,
               parseEther(formData.price),
               BigInt(formData.maxSupply)
            ],
         });

         setStatus('SUCCESS');
         setToast({ message: "Listing Published Successfully!", type: 'success' });
         setTimeout(() => router.push("/dashboard"), 2000);

      } catch (e: any) {
         console.error(e);
         setStatus('IDLE');
         setToast({ message: "Failed: " + (e.shortMessage || e.message), type: 'error' });
      }
   };

   if (!mounted) return null;

   const isProcessing = status !== 'IDLE' && status !== 'SUCCESS';

   return (
      <div className="bg-[#020e14] text-white font-display min-h-screen flex flex-col relative overflow-hidden">
         {/* Background Effects */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(0,224,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,198,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-[150px]" />
         </div>

         <Navigation />

         <main className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 border-b border-white/10 pb-6 gap-4">
               <div className="w-full lg:w-auto">
                  <div className="flex items-center gap-2 text-xs font-mono text-primary/80 mb-2 tracking-widest uppercase">
                     <Sparkles size={14} className="animate-pulse" /> Create Mode
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight font-mono uppercase">
                     New Listing
                  </h2>
                  <p className="text-sm text-white/50 mt-1">Create encrypted digital artifacts for the marketplace</p>
               </div>

               <div className="flex gap-3 w-full lg:w-auto">
                  <button
                     onClick={handlePublish}
                     disabled={isProcessing || !formData.name || !encryptedFile || !previewFile}
                     className={cn(
                        "flex-1 lg:flex-none group flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl font-black uppercase tracking-wider transition-all",
                        status === 'SUCCESS'
                           ? "bg-green-500 text-black shadow-[0_0_30px_rgba(0,255,163,0.3)]"
                           : isProcessing
                              ? "bg-primary/50 text-black cursor-wait"
                              : "bg-primary hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(0,229,255,0.3)] hover:shadow-[0_0_40px_rgba(0,229,255,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                     )}
                  >
                     {status === 'IDLE' && <><Rocket size={18} /> Publish</>}
                     {status === 'SIGNING_KEY' && <><KeyRound size={18} className="animate-pulse" /> Signing...</>}
                     {status === 'UPLOADING' && <><UploadCloud size={18} className="animate-bounce" /> Uploading...</>}
                     {status === 'TX' && <><Loader2 size={18} className="animate-spin" /> Minting...</>}
                     {status === 'SUCCESS' && <><CheckCircle2 size={18} /> Success!</>}
                  </button>
               </div>
            </div>

            {/* Progress Steps (visible during processing) */}
            {isProcessing && <ProgressSteps status={status} />}

            {/* Content Grid - Split View Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

               {/* LEFT COLUMN: Inputs */}
               <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                  {/* 01. ASSETS */}
                  <div className="rounded-2xl border border-primary/20 bg-[#0b1a24]/60 backdrop-blur-xl p-5 md:p-6 relative overflow-hidden shadow-2xl">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

                     <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3 font-mono uppercase">
                        <span className="size-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-sm border border-primary/30">01</span>
                        Digital Assets
                     </h3>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                        {/* Encrypted File Input */}
                        <label className={cn(
                           "group relative rounded-2xl border-2 border-dashed p-6 md:p-8 text-center transition-all cursor-pointer overflow-hidden",
                           encryptedFile
                              ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(0,229,255,0.1)]"
                              : "border-primary/20 hover:border-primary/60 bg-black/20 hover:bg-black/30"
                        )}>
                           <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                              <Lock size={28} />
                           </div>
                           <h4 className="text-sm font-bold text-white font-mono uppercase">Main Product</h4>
                           <p className="mt-2 text-[11px] text-gray-400 font-mono uppercase truncate max-w-full">
                              {encryptedFile?.name || "Drop encrypted file"}
                           </p>
                           <p className="mt-1 text-[9px] text-white/30">This will be encrypted</p>
                           <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleEncryptedSelect} />
                           {encryptedFile && (
                              <div className="absolute top-4 right-4">
                                 <CheckCircle2 className="text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" size={20} />
                              </div>
                           )}
                        </label>

                        {/* Preview File Input */}
                        <label className={cn(
                           "group relative rounded-2xl border-2 border-dashed p-6 md:p-8 text-center transition-all cursor-pointer overflow-hidden",
                           previewFile
                              ? "border-cyan-400 bg-cyan-400/5 shadow-[0_0_30px_rgba(0,229,255,0.1)]"
                              : "border-primary/20 hover:border-cyan-400/60 bg-black/20 hover:bg-black/30"
                        )}>
                           <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 group-hover:scale-110 transition-transform">
                              {mediaType === 'VIDEO' ? <Film size={28} /> : mediaType === 'AUDIO' ? <Mic size={28} /> : <ImageIcon size={28} />}
                           </div>
                           <h4 className="text-sm font-bold text-white font-mono uppercase">Preview Media</h4>
                           <p className="mt-2 text-[11px] text-gray-400 font-mono uppercase truncate max-w-full">
                              {previewFile?.name || "IMG / MP4 / MP3"}
                           </p>
                           <p className="mt-1 text-[9px] text-white/30">Visible in marketplace</p>
                           <input type="file" accept="image/*,video/*,audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePreviewSelect} />
                           {previewFile && (
                              <div className="absolute top-4 right-4">
                                 <CheckCircle2 className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" size={20} />
                              </div>
                           )}
                        </label>
                     </div>
                  </div>

                  {/* 02. DETAILS */}
                  <div className="rounded-2xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-xl p-5 md:p-6 shadow-2xl">
                     <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-3 font-mono uppercase">
                        <span className="size-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm border border-blue-500/30">02</span>
                        Manifest Details
                     </h3>

                     <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           {/* Name Input */}
                           <div className="space-y-2">
                              <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2">
                                 <Package size={12} /> Artifact Name
                              </label>
                              <input
                                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-mono transition-all placeholder:text-white/30"
                                 placeholder="e.g. Cyberpunk Blueprints"
                                 value={formData.name}
                                 onChange={e => handleInputChange('name', e.target.value)}
                              />
                           </div>

                           {/* Price & Supply */}
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2">
                                    <DollarSign size={12} /> Price ({currencySymbol})
                                 </label>
                                 <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-mono transition-all placeholder:text-white/30"
                                    placeholder="0.05"
                                    value={formData.price}
                                    onChange={e => handleInputChange('price', e.target.value)}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2">
                                    <Zap size={12} /> Max Supply
                                 </label>
                                 <input
                                    type="number"
                                    min="1"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-mono transition-all placeholder:text-white/30"
                                    placeholder="1"
                                    value={formData.maxSupply}
                                    onChange={e => handleInputChange('maxSupply', e.target.value)}
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                           <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2">
                              <AlignLeft size={12} /> Description
                           </label>
                           <textarea
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-mono h-32 resize-none transition-all placeholder:text-white/30"
                              placeholder="Describe your digital artifact and what buyers will receive..."
                              value={formData.description}
                              onChange={e => handleInputChange('description', e.target.value)}
                           />
                        </div>

                        {/* Category & Tags */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {/* Category Dropdown */}
                           <div className="space-y-2">
                              <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2">
                                 <Package size={12} /> Category
                              </label>
                              <select
                                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none font-mono transition-all cursor-pointer appearance-none"
                                 value={formData.category}
                                 onChange={e => handleInputChange('category', e.target.value)}
                              >
                                 <option value="">Select Category</option>
                                 {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                 ))}
                              </select>
                           </div>

                           {/* Subcategory/Tags */}
                           {formData.category && (
                              <div className="space-y-2">
                                 <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2">
                                    <Hash size={12} /> Tags
                                 </label>
                                 <div className="flex flex-wrap gap-1.5 p-2 bg-black/40 border border-white/10 rounded-xl min-h-[3rem]">
                                    {getSubcategories(formData.category).map(tag => (
                                       <button
                                          key={tag}
                                          type="button"
                                          onClick={() => {
                                             const newTags = formData.tags.includes(tag)
                                                ? formData.tags.filter(t => t !== tag)
                                                : [...formData.tags, tag];
                                             handleInputChange('tags', newTags);
                                          }}
                                          className={cn(
                                             "px-2 py-1 text-[10px] font-bold rounded-lg transition-all",
                                             formData.tags.includes(tag)
                                                ? "bg-primary text-black"
                                                : "bg-white/5 text-white/60 hover:bg-white/10"
                                          )}
                                       >
                                          {tag}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT COLUMN: Preview & Tuner */}
               <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                  <LivePreviewCard
                     formData={formData}
                     previewUrl={previewUrl}
                     mediaType={mediaType}
                     blurAmount={blurAmount}
                     zoomLevel={zoomLevel}
                     currencySymbol={currencySymbol}
                     isFullscreen={isFullscreenPreview}
                     onToggleFullscreen={() => setIsFullscreenPreview(!isFullscreenPreview)}
                  />

                  <VisualTuner
                     blurAmount={blurAmount}
                     setBlurAmount={setBlurAmount}
                     zoomLevel={zoomLevel}
                     setZoomLevel={setZoomLevel}
                  />
               </div>
            </div>
         </main>

         <Footer />

         {/* Toast Notification */}
         {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

         {/* Fullscreen Preview Backdrop */}
         {isFullscreenPreview && (
            <div
               className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
               onClick={() => setIsFullscreenPreview(false)}
            />
         )}
      </div>
   );
}