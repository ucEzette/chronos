"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useSignMessage } from "wagmi";
import { parseEther } from "viem";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { uploadToIPFS } from "../../lib/ipfs";
import { signatureToKey } from "../../lib/crypto";
import { cn } from "@/lib/utils";
import { 
  Loader2, Rocket, Lock, Image as ImageIcon, KeyRound, UploadCloud, 
  CheckCircle2, AlertCircle, X, Eye, Edit3, Box, Music, Play, Code, 
  FileText, ShoppingCart, Sliders, Film, Mic, AlignLeft, ShieldCheck
} from "lucide-react";

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn("fixed bottom-10 right-6 z-[100] flex gap-3 px-6 py-4 rounded-xl border backdrop-blur-xl animate-in slide-in-from-right", type === 'success' ? "bg-primary/10 border-primary/30 text-primary" : "bg-red-500/10 border-red-500/30 text-red-400")}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <p className="text-sm font-bold font-mono uppercase">{message}</p>
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

export default function CreateListingPage() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SIGNING_KEY' | 'UPLOADING' | 'TX' | 'SUCCESS'>('IDLE');
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    maxSupply: "1",
    fileType: "",
  });

  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | 'UNKNOWN'>('UNKNOWN');
  
  // Visuals
  const [blurAmount, setBlurAmount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => { setMounted(true); }, []);

  // Handlers for File Selection (Same as before)
  const handleEncryptedSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setEncryptedFile(file);
      const ext = file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2).toUpperCase();
      if (ext) setFormData(p => ({ ...p, fileType: `.${ext}` }));
    }
  };

  const handlePreviewSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setBlurAmount(0); setZoomLevel(100);
      if (file.type.startsWith('image/')) setMediaType('IMAGE');
      else if (file.type.startsWith('video/')) setMediaType('VIDEO');
      else if (file.type.startsWith('audio/')) setMediaType('AUDIO');
      else setMediaType('UNKNOWN');
    }
  };

  const handlePublish = async () => {
    if (!isConnected || !address || !encryptedFile || !previewFile || !formData.name || !formData.price) {
      setToast({ message: "Missing files or details.", type: 'error' });
      return;
    }

    try {
      // 1. GENERATE KEY FROM WALLET
      setStatus('SIGNING_KEY');
      const signature = await signMessageAsync({
        message: `CHRONOS_ACCESS:${formData.name.trim()}`
      });
      const secureKey = signatureToKey(signature);

      // 2. ENCRYPT FILE
      // Note: We need to use the encryptFile from crypto.ts but passing the raw file object might fail if not handled 
      // Re-importing encryption logic here or ensuring the lib handles it
      // Let's assume uploadToIPFS handles raw files, so we need to encrypt first manually
      const { encryptFile } = await import("../../lib/crypto");
      const encryptedBlob = await encryptFile(encryptedFile, secureKey);
      const finalEncryptedFile = new File([encryptedBlob], encryptedFile.name, { type: 'application/octet-stream' });

      // 3. UPLOAD ASSETS
      setStatus('UPLOADING');
      const [encryptedCid, rawPreviewCid] = await Promise.all([
        uploadToIPFS(finalEncryptedFile),
        uploadToIPFS(previewFile)
      ]);

      // 4. METADATA
      const metadata = {
        description: formData.description,
        image: rawPreviewCid,
        settings: { blur: blurAmount, zoom: zoomLevel }
      };
      const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
      const metadataCid = await uploadToIPFS(metadataFile);

      // 5. CONTRACT CALL
      setStatus('TX');
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'listItem',
        args: [
          formData.name.trim(),
          encryptedCid,
          metadataCid, 
          formData.fileType || ".DATA",
          parseEther(formData.price),
          BigInt(formData.maxSupply)
        ] as any, 
      });
      
      setStatus('SUCCESS');
      setToast({ message: "Time Capsule Published!", type: 'success' });
      setTimeout(() => window.location.href = "/dashboard", 2000);
      
    } catch (e: any) {
      console.error(e);
      setStatus('IDLE');
      setToast({ message: "Aborted: " + (e.shortMessage || e.message), type: 'error' });
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('AUDIO')) return <Music size={14} className="mr-1"/>;
    if (type.includes('VIDEO') || type.includes('MP4')) return <Film size={14} className="mr-1"/>;
    if (type.includes('PDF')) return <FileText size={14} className="mr-1"/>;
    if (type.includes('ZIP')) return <Box size={14} className="mr-1"/>;
    return <Code size={14} className="mr-1"/>;
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#020e14] text-white font-display min-h-screen flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 bg-[linear-gradient(rgba(0,224,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,198,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <Navigation />
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/10 pb-6 gap-6">
          <div className="w-full md:w-auto">
             <div className="flex items-center gap-2 text-xs font-mono text-primary/80 mb-1 tracking-widest uppercase">
                <span className="material-symbols-outlined text-[14px]">edit_square</span> Listing_Mode :: {viewMode}
             </div>
             <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight font-mono uppercase">
                Create Listing <span className="text-primary/40 font-light">//</span> Define Time Capsule
             </h2>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setViewMode(viewMode === 'EDIT' ? 'PREVIEW' : 'EDIT')} className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all border", viewMode === 'PREVIEW' ? "bg-white/10 border-primary/50 text-primary" : "bg-transparent border-white/20 text-gray-400 hover:text-white")}>
              {viewMode === 'EDIT' ? <><Eye size={18}/> Preview</> : <><Edit3 size={18}/> Edit</>}
            </button>
            <button onClick={handlePublish} disabled={status !== 'IDLE' || !formData.name} className={cn("flex-1 md:flex-none group flex items-center justify-center gap-3 px-8 py-3 rounded-lg font-black uppercase tracking-wider shadow-glow-primary transition-all", status === 'SUCCESS' ? "bg-primary text-black" : "bg-primary hover:bg-teal-400 text-black disabled:opacity-50")}>
              {status === 'IDLE' ? <><Rocket size={18} /> Publish</> : status === 'SIGNING_KEY' ? <><KeyRound size={18} className="animate-pulse"/> Signing...</> : status === 'UPLOADING' ? <><UploadCloud size={18} className="animate-bounce"/> Uploading...</> : <><Loader2 size={18} className="animate-spin"/> Minting...</>}
            </button>
          </div>
        </div>

        {/* EDIT MODE */}
        {viewMode === 'EDIT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="lg:col-span-8 space-y-8">
               {/* 01. ASSETS */}
               <div className="rounded-xl border border-primary/20 bg-[#0b1a24]/60 backdrop-blur-md p-6 relative overflow-hidden shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono uppercase">
                     <span className="size-6 rounded bg-primary/20 flex items-center justify-center text-primary text-xs border border-primary/30">01</span> Assets & Intelligence
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className={cn("group relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer", encryptedFile ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/60 bg-black/20")}>
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Lock size={24}/></div>
                        <h4 className="text-sm font-bold text-white font-mono uppercase">Encrypted Archive</h4>
                        <p className="mt-1 text-[10px] text-gray-400 font-mono uppercase">{encryptedFile?.name || "Drop Main File"}</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleEncryptedSelect} />
                        {encryptedFile && <CheckCircle2 className="absolute top-4 right-4 text-primary" size={16}/>}
                     </div>
                     <div className={cn("group relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer", previewFile ? "border-cyan-400 bg-cyan-400/5" : "border-primary/20 hover:border-cyan-400/60 bg-black/20")}>
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                           {mediaType === 'VIDEO' ? <Film size={24}/> : mediaType === 'AUDIO' ? <Mic size={24}/> : <ImageIcon size={24}/>}
                        </div>
                        <h4 className="text-sm font-bold text-white font-mono uppercase">Teaser Snippet</h4>
                        <p className="mt-1 text-[10px] text-gray-400 font-mono uppercase">{previewFile?.name || "IMG / MP4 / MP3"}</p>
                        <input type="file" accept="image/*,video/*,audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePreviewSelect} />
                        {previewFile && <CheckCircle2 className="absolute top-4 right-4 text-cyan-400" size={16}/>}
                     </div>
                  </div>
                  {/* ... (Holo Tuner - same as previous response) ... */}
               </div>

               {/* 02. DETAILS */}
               <div className="rounded-xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-md p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono uppercase">
                     <span className="size-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs border border-blue-500/30">02</span> Manifest Details
                  </h3>
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-xs font-mono text-primary/80 uppercase tracking-wide">Artifact Name</label>
                           <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono" placeholder="Artifact Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-mono text-primary/80 uppercase tracking-wide">Price (ETH)</label>
                           <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono" placeholder="0.05" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}/>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2"><AlignLeft size={12}/> Description / Lore</label>
                        <textarea className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono h-32 resize-none" placeholder="Describe contents..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               {/* 03. KEY (UPDATED) */}
               <div className="rounded-xl border border-primary/20 bg-[#0b1a24]/60 backdrop-blur-md p-6 border-l-4 border-l-primary shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-mono uppercase">
                     <span className="size-6 rounded bg-primary/20 flex items-center justify-center text-primary text-xs border border-primary/30">03</span> Chronos Key
                  </h3>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-4">
                     <div className="flex items-center gap-3 text-primary mb-2">
                        <ShieldCheck size={20}/>
                        <span className="text-sm font-bold uppercase">Wallet-Linked Encryption</span>
                     </div>
                     <p className="text-xs text-gray-400 font-mono leading-relaxed">
                        The encryption key will be mathematically derived from your wallet signature. 
                     </p>
                  </div>
                  <div className="relative group opacity-50 cursor-not-allowed">
                     <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input readOnly value="GENERATED_UPON_SIGNING" className="w-full bg-black/60 border border-white/10 rounded-lg pl-10 pr-4 py-4 text-gray-500 font-mono text-xs"/>
                  </div>
               </div>
            </div>
          </div>
        )}
        
        {/* ... (Preview Mode - same as previous) ... */}
        
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}