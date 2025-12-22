"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { Navigation } from "../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../lib/contracts";
import { cn } from "@/lib/utils";
import { 
  Loader2, Rocket, Lock, Image as ImageIcon, KeyRound, 
  Maximize2, EyeOff, UploadCloud, Zap, CheckCircle2, AlertCircle, X 
} from "lucide-react";

/** MOCK IPFS UPLOAD */
const uploadToIPFS = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Qm${Math.random().toString(36).substring(7)}TestHash`);
    }, 1500); 
  });
};

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn("fixed bottom-10 right-6 z-[100] flex gap-3 px-6 py-4 rounded-xl border backdrop-blur-xl animate-in slide-in-from-right", type === 'success' ? "bg-neon-lime/10 border-neon-lime/30 text-neon-lime" : "bg-red-500/10 border-red-500/30 text-red-400")}>
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
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SIGNING' | 'SUCCESS'>('IDLE');

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    maxSupply: "100",
    fileType: ".ZIP",
    temporalKey: "",
  });

  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setFormData(p => ({ ...p, temporalKey: `CHR-${Math.random().toString(36).substring(2, 12).toUpperCase()}` }));
  }, []);

  const handlePreviewSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setPreviewFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handlePublish = async () => {
    if (!isConnected || !address || !encryptedFile || !previewFile || !formData.name || !formData.price) {
      setToast({ message: "Missing files or details.", type: 'error' });
      return;
    }

    try {
      setStatus('UPLOADING');
      
      // 1. Upload to IPFS
      const [encryptedCid, previewCid] = await Promise.all([
        uploadToIPFS(encryptedFile),
        uploadToIPFS(previewFile)
      ]);

      setStatus('SIGNING');

      // 2. Save Key Locally (CRITICAL: Contract doesn't store this!)
      // We save it mapped to the Artifact Name + Price as a temporary ID reference
      const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
      localKeys[formData.name] = formData.temporalKey;
      localStorage.setItem('chronos_seller_keys', JSON.stringify(localKeys));

      // 3. Call Smart Contract
      // Signature: listItem(name, ipfsCid, previewCid, fileType, price, maxSupply)
      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'listItem',
        args: [
          formData.name,
          encryptedCid,
          previewCid,
          formData.fileType,
          parseEther(formData.price),
          BigInt(formData.maxSupply)
        ] as any, 
      });
      
      setStatus('SUCCESS');
      setToast({ message: "Listing published successfully!", type: 'success' });
      setTimeout(() => window.location.href = "/dashboard", 2000);
      
    } catch (e: any) {
      console.error(e);
      setStatus('IDLE');
      setToast({ message: "Transaction failed. Check console.", type: 'error' });
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#020e14] text-white font-display min-h-screen flex flex-col relative overflow-hidden">
      <Navigation />
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black uppercase font-mono">Create_Listing</h2>
          <button onClick={handlePublish} disabled={status !== 'IDLE'} className={cn("group flex items-center gap-3 px-8 py-3 rounded-lg font-black uppercase tracking-wider shadow-glow-primary transition-all", status === 'SUCCESS' ? "bg-neon-lime text-black" : "bg-primary hover:bg-primary-dark text-black disabled:opacity-50")}>
            {status === 'IDLE' ? <><Rocket size={18} /> Publish</> : status === 'UPLOADING' ? <><UploadCloud size={18} className="animate-bounce"/> Uploading...</> : <><Loader2 size={18} className="animate-spin"/> Signing...</>}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
             <div className="glass-panel p-6 rounded-xl border border-glass-border bg-glass-surface space-y-4">
                <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                   <Lock className="mx-auto mb-2 text-gray-400" />
                   <p className="text-xs text-gray-400">Encrypted File (Product)</p>
                   <p className="text-neon-lime text-xs font-mono">{encryptedFile?.name || "Select File"}</p>
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setEncryptedFile(e.target.files?.[0] || null)} />
                </div>
                <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                   <ImageIcon className="mx-auto mb-2 text-gray-400" />
                   <p className="text-xs text-gray-400">Preview File (Public)</p>
                   <p className="text-neon-cyan text-xs font-mono">{previewFile?.name || "Select File"}</p>
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePreviewSelect} />
                </div>
             </div>
             
             {/* Key Display */}
             <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2 text-primary font-mono text-xs uppercase"><KeyRound size={14}/> Auto-Generated Key (Saved Locally)</div>
                <div className="font-mono text-lg font-bold tracking-widest text-white">{formData.temporalKey}</div>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-glass-border bg-glass-surface space-y-4 h-fit">
             <input placeholder="Item Name" className="w-full bg-black/40 border border-white/10 p-3 rounded text-white outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             <div className="grid grid-cols-2 gap-4">
                <input placeholder="Price (ETH)" className="w-full bg-black/40 border border-white/10 p-3 rounded text-white outline-none focus:border-primary" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                <input placeholder="Supply" className="w-full bg-black/40 border border-white/10 p-3 rounded text-white outline-none focus:border-primary" value={formData.maxSupply} onChange={e => setFormData({...formData, maxSupply: e.target.value})} />
             </div>
             <input placeholder="File Type (.zip)" className="w-full bg-black/40 border border-white/10 p-3 rounded text-white outline-none focus:border-primary" value={formData.fileType} onChange={e => setFormData({...formData, fileType: e.target.value})} />
          </div>
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}