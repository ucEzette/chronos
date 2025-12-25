"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useSignMessage } from "wagmi";
import { parseEther } from "viem";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { uploadToIPFS } from "../../lib/ipfs"; 
import { signatureToKey, encryptFile } from "../../lib/crypto";
import { cn } from "@/lib/utils";
import { 
  Loader2, Rocket, Lock, Image as ImageIcon, KeyRound, UploadCloud, 
  CheckCircle2, AlertCircle, X, Eye, Edit3, Film, Mic, AlignLeft, 
  ShieldCheck, Box, FileText, Code, Music, Sliders, Maximize, Zap
} from "lucide-react";

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn("fixed bottom-10 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-xl animate-in slide-in-from-right shadow-2xl", type === 'success' ? "bg-primary/10 border-primary/30 text-primary shadow-glow-primary" : "bg-red-500/10 border-red-500/30 text-red-400")}>
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <p className="text-sm font-bold font-mono uppercase tracking-wider">{message}</p>
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

  // Form Data including Max Supply
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
  
  // Visual Settings (Holo Tuner)
  const [blurAmount, setBlurAmount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Video Ref for preview control
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { setMounted(true); }, []);

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
      
      // Reset visuals
      setBlurAmount(0); 
      setZoomLevel(100);

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
          metadataCid, // Using Metadata CID for the preview field
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

        {/* MAIN EDITOR GRID */}
        {viewMode === 'EDIT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-500">
            
            {/* LEFT COLUMN: Inputs */}
            <div className="lg:col-span-8 space-y-8">
               
               {/* 01. ASSETS */}
               <div className="rounded-xl border border-primary/20 bg-[#0b1a24]/60 backdrop-blur-md p-6 relative overflow-hidden shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono uppercase">
                     <span className="size-6 rounded bg-primary/20 flex items-center justify-center text-primary text-xs border border-primary/30">01</span> Assets & Intelligence
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* ENCRYPTED FILE INPUT */}
                     <div className={cn("group relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer overflow-hidden", encryptedFile ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/60 bg-black/20")}>
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Lock size={24}/></div>
                        <h4 className="text-sm font-bold text-white font-mono uppercase">Encrypted Archive</h4>
                        <p className="mt-1 text-[10px] text-gray-400 font-mono uppercase truncate">{encryptedFile?.name || "Drop Main File"}</p>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleEncryptedSelect} />
                        {encryptedFile && <CheckCircle2 className="absolute top-4 right-4 text-primary" size={16}/>}
                     </div>
                     
                     {/* PREVIEW FILE INPUT */}
                     <div className={cn("group relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer overflow-hidden", previewFile ? "border-cyan-400 bg-cyan-400/5" : "border-primary/20 hover:border-cyan-400/60 bg-black/20")}>
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                           {mediaType === 'VIDEO' ? <Film size={24}/> : mediaType === 'AUDIO' ? <Mic size={24}/> : <ImageIcon size={24}/>}
                        </div>
                        <h4 className="text-sm font-bold text-white font-mono uppercase">Teaser Snippet</h4>
                        <p className="mt-1 text-[10px] text-gray-400 font-mono uppercase truncate">{previewFile?.name || "IMG / MP4 / MP3"}</p>
                        <input type="file" accept="image/*,video/*,audio/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePreviewSelect} />
                        {previewFile && <CheckCircle2 className="absolute top-4 right-4 text-cyan-400" size={16}/>}
                     </div>
                  </div>
               </div>

               {/* 02. DETAILS & MAX SUPPLY */}
               <div className="rounded-xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-md p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono uppercase">
                     <span className="size-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs border border-blue-500/30">02</span> Manifest Details
                  </h3>
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-xs font-mono text-primary/80 uppercase tracking-wide">Artifact Name</label>
                           <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono" placeholder="e.g. Cyberpunk Blueprints" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-xs font-mono text-primary/80 uppercase tracking-wide">Price (ETH)</label>
                              <input className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono" placeholder="0.05" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}/>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-1"><Zap size={12}/> Max Supply</label>
                              <input type="number" min="1" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono" placeholder="1" value={formData.maxSupply} onChange={e => setFormData({...formData, maxSupply: e.target.value})}/>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-mono text-primary/80 uppercase tracking-wide flex items-center gap-2"><AlignLeft size={12}/> Description / Lore</label>
                        <textarea className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none font-mono h-32 resize-none" placeholder="Describe contents..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/>
                     </div>
                  </div>
               </div>
            </div>

            {/* RIGHT COLUMN: Preview & Tuner */}
            <div className="lg:col-span-4 space-y-6">
               
               {/* LIVE PREVIEW CARD */}
               <div className="rounded-xl border border-white/10 bg-[#0b1a24]/60 backdrop-blur-md overflow-hidden shadow-2xl relative">
                  <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                     <span className="text-xs font-bold uppercase tracking-widest text-white/60">Live Preview</span>
                     <span className="flex items-center gap-1 text-[10px] font-mono text-primary"><Eye size={12}/> {blurAmount}px / {zoomLevel}%</span>
                  </div>
                  <div className="aspect-square bg-gray-900 relative overflow-hidden flex items-center justify-center group">
                     {previewUrl ? (
                        <>
                           {mediaType === 'VIDEO' ? (
                              <video 
                                 ref={videoRef}
                                 src={previewUrl} 
                                 autoPlay loop muted 
                                 className="w-full h-full object-cover transition-all duration-300"
                                 style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoomLevel/100})` }}
                              />
                           ) : mediaType === 'AUDIO' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center relative">
                                 <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-primary/30" style={{ filter: `blur(${blurAmount + 20}px)` }}></div>
                                 <Mic size={48} className="text-white relative z-10" />
                                 <div className="mt-4 flex gap-1 h-8 items-end relative z-10">
                                    {[...Array(5)].map((_, i) => <div key={i} className="w-2 bg-primary animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />)}
                                 </div>
                              </div>
                           ) : (
                              <img 
                                 src={previewUrl} 
                                 className="w-full h-full object-cover transition-all duration-300" 
                                 style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoomLevel/100})` }}
                              />
                           )}
                           
                           {/* Overlay Text if Blurred */}
                           {blurAmount > 5 && (
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                 <div className="bg-black/50 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-xl">
                                    Encrypted Preview
                                 </div>
                              </div>
                           )}
                        </>
                     ) : (
                        <div className="text-white/20 text-xs font-mono uppercase tracking-widest">No Media Selected</div>
                     )}
                  </div>
               </div>

               {/* HOLO TUNER (SETTINGS) */}
               {previewUrl && (
                  <div className="rounded-xl border border-primary/20 bg-[#0b1a24]/60 backdrop-blur-md p-6 shadow-2xl animate-in slide-in-from-right">
                     <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-mono uppercase">
                        <span className="size-6 rounded bg-primary/20 flex items-center justify-center text-primary text-xs border border-primary/30"><Sliders size={12}/></span> Holo Tuner
                     </h3>
                     
                     <div className="space-y-6">
                        {/* Blur Slider */}
                        <div className="space-y-3">
                           <div className="flex justify-between text-xs font-mono uppercase">
                              <span className="text-primary/80">Obfuscation (Blur)</span>
                              <span className="text-white">{blurAmount}px</span>
                           </div>
                           <input 
                              type="range" min="0" max="20" step="1" 
                              value={blurAmount} 
                              onChange={(e) => setBlurAmount(Number(e.target.value))}
                              className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-primary"
                           />
                        </div>

                        {/* Zoom Slider */}
                        <div className="space-y-3">
                           <div className="flex justify-between text-xs font-mono uppercase">
                              <span className="text-primary/80 flex items-center gap-2"><Maximize size={12}/> Zoom Level</span>
                              <span className="text-white">{zoomLevel}%</span>
                           </div>
                           <input 
                              type="range" min="100" max="200" step="5" 
                              value={zoomLevel} 
                              onChange={(e) => setZoomLevel(Number(e.target.value))}
                              className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-primary"
                           />
                        </div>
                     </div>
                  </div>
               )}

               {/* KEY INFO */}
               <div className="rounded-xl border border-white/10 bg-[#0b1a24]/60 p-4 flex gap-3 items-center">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><ShieldCheck size={20}/></div>
                  <div>
                     <div className="text-xs font-bold text-white uppercase">Secure Generation</div>
                     <div className="text-[10px] text-gray-400 font-mono">Keys are derived from your wallet signature.</div>
                  </div>
               </div>

            </div>
          </div>
        )}
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}