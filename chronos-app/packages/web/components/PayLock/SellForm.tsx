"use client";

import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import Cropper from 'react-easy-crop';
import { generateFileKey, encryptFile } from '@/lib/crypto';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { uploadToIPFS } from '@/lib/ipfs';
import { scanFile } from '@/lib/security';
import { getCroppedImg, getVideoCover, getAudioSnippet } from '@/lib/media';
import { 
  Loader2, DollarSign, UploadCloud, Tag, CheckCircle, 
  ShieldCheck, AlertTriangle, Image as ImageIcon, FileAudio, FileVideo, FileText, X, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SellForm() {
  const [file, setFile] = useState<File | null>(null);
  const [customCover, setCustomCover] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [blurAmount, setBlurAmount] = useState(0);
  
  // Preview State
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedInfo, setGeneratedInfo] = useState<string>("");

  const { data: hash, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. Handle File Selection
  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      
      // Reset States
      setPreviewUrl(null);
      setPreviewBlob(null);
      setGeneratedInfo("Processing preview...");

      try {
        // A. IMAGE: Open Editor immediately
        if (selected.type.startsWith("image/")) {
          setIsEditing(true);
          setGeneratedInfo("");
        } 
        // B. VIDEO: Auto-Capture Frame
        else if (selected.type.startsWith("video/")) {
          const frame = await getVideoCover(selected);
          if (frame) {
            const url = URL.createObjectURL(frame);
            setPreviewBlob(frame);
            setPreviewUrl(url);
            setGeneratedInfo("Video snapshot generated.");
          } else {
            setGeneratedInfo("Could not generate snapshot. Please upload a cover.");
          }
        }
        // C. AUDIO: Auto-Trim
        else if (selected.type.startsWith("audio/")) {
          const snippet = await getAudioSnippet(selected);
          if (snippet) {
            const url = URL.createObjectURL(snippet);
            setPreviewBlob(snippet);
            setPreviewUrl(url);
            setGeneratedInfo("10s Audio snippet generated.");
          }
        }
        // D. PDF: Default State
        else {
          setGeneratedInfo("Document detected. Please upload a cover image.");
        }
      } catch (err) {
        console.error("Preview generation error:", err);
        setGeneratedInfo("Error generating preview.");
      }
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveImagePreview = async () => {
    if (!file || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(file, croppedAreaPixels, blurAmount);
      if (blob) {
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate preview");
    }
  };

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !price || !name) return;

    try {
      setStatus("scanning");
      await scanFile(file);

      setStatus("previewing");
      let previewCid = "";

      // Prioritize Custom Cover if provided (for PDFs/Docs/Videos)
      if (customCover) {
         previewCid = await uploadToIPFS(customCover);
      } 
      // Else use generated preview
      else if (previewBlob) {
         const type = file.type.startsWith("audio/") ? "audio/wav" : "image/jpeg";
         const previewFile = new File([previewBlob], "preview", { type });
         previewCid = await uploadToIPFS(previewFile);
      }

      setStatus("encrypting");
      const rawKey = generateFileKey();
      const encryptedBlob = await encryptFile(file, rawKey);
      const encryptedFile = new File([encryptedBlob], file.name + ".enc");

      setStatus("uploading");
      const ipfsCid = await uploadToIPFS(encryptedFile);
      localStorage.setItem(`paylock_key_${ipfsCid}`, rawKey);

      setStatus("signing");
      const fileType = file.type.split("/")[0]; // "image", "video", "audio", "application"

      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'listItem',
        args: [name, ipfsCid, previewCid, fileType, parseEther(price)],
      });
      
      setStatus("mining");

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      alert(err.message || "Error listing item.");
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-8 space-y-4 animate-in fade-in bg-green-500/5 rounded-xl border border-green-500/20">
        <CheckCircle size={48} className="mx-auto text-green-500" />
        <h3 className="text-xl font-bold text-white">Asset Listed!</h3>
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">List Another</button>
      </div>
    );
  }

  // --- CROPPER MODAL (With Live Blur) ---
  if (isEditing && file) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
        <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
             <h3 className="font-bold text-white flex items-center gap-2"><Eye size={18}/> Edit Public Preview</h3>
             <button onClick={() => setIsEditing(false)}><X size={20} className="text-muted hover:text-white"/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 h-[400px]">
             {/* Left: Cropper */}
             <div className="relative bg-black h-full border-r border-white/10">
                <Cropper
                  image={URL.createObjectURL(file)}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
             </div>

             {/* Right: Live Result */}
             <div className="p-6 flex flex-col justify-between bg-zinc-900">
               <div className="space-y-4">
                 <h4 className="text-xs font-bold text-muted uppercase">Live Result</h4>
                 {/* This div simulates the blur in real-time */}
                 <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-white/10">
                    <img 
                      src={URL.createObjectURL(file)} 
                      className="w-full h-full object-cover transition-all duration-75"
                      style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoom})`, transformOrigin: 'center' }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/50 bg-black/20">
                       PREVIEW
                    </div>
                 </div>
                 <p className="text-xs text-muted">Adjust how your image appears in the marketplace.</p>
               </div>

               <div className="space-y-4">
                  <div>
                    <label className="flex justify-between text-xs font-bold text-muted mb-2">
                      <span>BLUR: {blurAmount}px</span>
                    </label>
                    <input type="range" min="0" max="20" value={blurAmount} onChange={(e) => setBlurAmount(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted mb-2 block">ZOOM</label>
                    <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"/>
                  </div>
                  <button onClick={handleSaveImagePreview} className="w-full bg-primary py-3 rounded-lg font-bold text-white hover:bg-primaryHover">
                    Save Preview
                  </button>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleList} className="space-y-6">
      
      {/* --- MAIN UPLOADER --- */}
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-white/5 cursor-pointer relative group transition-all">
        <input type="file" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
        
        {file ? (
          <div className="space-y-4">
             {/* PREVIEW CONTAINER */}
             <div className="relative w-full h-48 bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
               
               {/* 1. IMAGE/VIDEO PREVIEW */}
               {previewUrl && !file.type.startsWith("audio/") && (
                 <img src={previewUrl} className="w-full h-full object-cover" />
               )}

               {/* 2. AUDIO PREVIEW */}
               {file.type.startsWith("audio/") && previewUrl && (
                 <div className="text-center space-y-2">
                    <FileAudio size={40} className="mx-auto text-primary" />
                    <audio src={previewUrl} controls className="h-8 w-48 mx-auto" />
                 </div>
               )}

               {/* 3. PDF/DOC NO PREVIEW */}
               {!previewUrl && (
                 <div className="text-center space-y-2 text-muted">
                    {file.type.includes("pdf") ? <FileText size={40} className="mx-auto"/> : <AlertTriangle size={40} className="mx-auto"/>}
                    <p className="text-xs">{generatedInfo}</p>
                 </div>
               )}

             </div>
             
             <div>
               <p className="font-bold text-white text-lg">{file.name}</p>
               <div className="flex items-center justify-center gap-2 text-xs text-green-400 mt-1"><ShieldCheck size={12} /> Ready for Scan</div>
               {file.type.startsWith("image/") && (
                 <button type="button" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-xs text-primary underline mt-2 relative z-20">Edit Blur / Crop</button>
               )}
             </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <UploadCloud className="mx-auto text-muted group-hover:text-white transition-colors" size={40} />
            <div>
               <p className="font-bold text-white text-lg">Upload Digital Asset</p>
               <p className="text-sm text-muted">Drag & drop or click to browse</p>
            </div>
            <div className="flex justify-center gap-4 text-xs text-zinc-500 pt-2">
               <span className="flex items-center gap-1"><ImageIcon size={12}/> IMG</span>
               <span className="flex items-center gap-1"><FileVideo size={12}/> VID</span>
               <span className="flex items-center gap-1"><FileAudio size={12}/> MP3</span>
               <span className="flex items-center gap-1"><FileText size={12}/> PDF</span>
            </div>
          </div>
        )}
      </div>

      {/* --- CUSTOM COVER --- */}
      {file && !file.type.startsWith("image/") && (
         <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
           <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
             <ImageIcon size={20} className="text-muted" />
           </div>
           <div className="flex-1">
             <p className="text-sm font-bold text-white">Cover Image (Optional)</p>
             <p className="text-xs text-muted">Upload a custom thumbnail for the marketplace.</p>
           </div>
           <div className="relative overflow-hidden">
             <button type="button" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Choose Image</button>
             <input type="file" accept="image/*" onChange={(e) => setCustomCover(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer"/>
           </div>
           {customCover && <div className="text-green-500"><CheckCircle size={20}/></div>}
         </div>
      )}

      {/* --- PRICE --- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase">Name</label>
          <input type="text" placeholder="e.g. Exclusive Beat" onChange={e => setName(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase">Price (MOCK)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 text-muted" size={16} />
            <input type="number" step="0.0001" placeholder="0.1" onChange={e => setPrice(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 pl-9 text-white outline-none focus:border-primary" />
          </div>
        </div>
      </div>

      <button 
        disabled={status !== "idle"} 
        className="w-full bg-primary hover:bg-primaryHover text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "idle" && "List for Sale"}
        {(status === "mining" || isConfirming) ? <><Loader2 className="animate-spin" size={16}/> Listing on Chain...</> : status !== "idle" && status + "..."}
      </button>
    </form>
  );
}