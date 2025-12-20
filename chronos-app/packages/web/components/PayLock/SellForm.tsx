"use client";

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import Cropper from 'react-easy-crop';
import JSZip from 'jszip'; // NEW: Import Zip library
import { generateFileKey, encryptFile } from '@/lib/crypto';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { uploadToIPFS } from '@/lib/ipfs';
import { scanFile } from '@/lib/security';
import { getCroppedImg, getVideoCover, getAudioSnippet } from '@/lib/media';
import { 
  Loader2, DollarSign, UploadCloud, Tag, CheckCircle, 
  ShieldCheck, Image as ImageIcon, FileAudio, FileVideo, FileText, X, Eye, Layers, Archive
} from 'lucide-react';

export function SellForm() {
  const [files, setFiles] = useState<File[]>([]); // Changed to Array
  const [customCover, setCustomCover] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [supply, setSupply] = useState("1"); // NEW: Supply State
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [blurAmount, setBlurAmount] = useState(0);
  
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedInfo, setGeneratedInfo] = useState<string>("");

  const { data: hash, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // 1. Handle File Selection (Support Multiple)
  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      
      const primaryFile = selectedFiles[0];
      setPreviewUrl(null);
      setPreviewBlob(null);

      // If multiple files or Zip, force manual cover or generic icon
      if (selectedFiles.length > 1 || primaryFile.name.endsWith('.zip')) {
        setGeneratedInfo("Bundle/Zip detected. Please upload a Cover Image.");
        return;
      }

      // Single file preview logic
      setGeneratedInfo("Generating preview...");
      try {
        if (primaryFile.type.startsWith("image/")) {
          setIsEditing(true);
          setGeneratedInfo("");
        } 
        else if (primaryFile.type.startsWith("video/")) {
          const frame = await getVideoCover(primaryFile);
          if (frame) {
            setPreviewBlob(frame);
            setPreviewUrl(URL.createObjectURL(frame));
            setGeneratedInfo("Video snapshot generated.");
          }
        }
        else if (primaryFile.type.startsWith("audio/")) {
          const snippet = await getAudioSnippet(primaryFile);
          if (snippet) {
            setPreviewBlob(snippet);
            setPreviewUrl(URL.createObjectURL(snippet));
            setGeneratedInfo("Audio preview generated.");
          } else {
             setGeneratedInfo("Audio preview failed. Upload a cover.");
          }
        }
        else {
          setGeneratedInfo("Document detected. Please upload a cover.");
        }
      } catch (err) {
        console.error(err);
        setGeneratedInfo("Preview generation failed.");
      }
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveImagePreview = async () => {
    if (!files[0] || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(files[0], croppedAreaPixels, blurAmount);
      if (blob) {
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setIsEditing(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !price || !name || !supply) return;

    try {
      // 1. Prepare Main File (Zip if multiple)
      let fileToEncrypt = files[0];
      
      if (files.length > 1) {
        setStatus("zipping");
        const zip = new JSZip();
        files.forEach(f => zip.file(f.name, f));
        const zipContent = await zip.generateAsync({ type: "blob" });
        fileToEncrypt = new File([zipContent], `${name.replace(/\s+/g, '_')}_bundle.zip`, { type: "application/zip" });
      }

      // 2. Scan
      setStatus("scanning");
      await scanFile(fileToEncrypt);

      // 3. Upload Preview
      setStatus("previewing");
      let previewCid = "";
      if (customCover) {
         previewCid = await uploadToIPFS(customCover);
      } else if (previewBlob) {
         const type = files[0].type.startsWith("audio/") ? "audio/wav" : "image/jpeg";
         const previewFile = new File([previewBlob], "preview", { type });
         previewCid = await uploadToIPFS(previewFile);
      }

      // 4. Encrypt Main File
      setStatus("encrypting");
      const rawKey = generateFileKey();
      const encryptedBlob = await encryptFile(fileToEncrypt, rawKey);
      const encryptedFile = new File([encryptedBlob], fileToEncrypt.name + ".enc");

      // 5. Upload Encrypted Asset
      setStatus("uploading");
      const ipfsCid = await uploadToIPFS(encryptedFile);
      
      // Save key locally (Note: For multi-supply, you need a way to retrieve this later for EACH buyer)
      // In production, you might store this in a secure database or user's private local storage keyed by ID.
      localStorage.setItem(`paylock_key_${ipfsCid}`, rawKey);

      // 6. List on Chain
      setStatus("signing");
      
      // Determine File Type Label
      let fileType = "other";
      if (files.length > 1 || fileToEncrypt.name.endsWith('.zip')) fileType = "archive";
      else if (fileToEncrypt.type.startsWith("image")) fileType = "image";
      else if (fileToEncrypt.type.startsWith("video")) fileType = "video";
      else if (fileToEncrypt.type.startsWith("audio")) fileType = "audio";
      else if (fileToEncrypt.type.includes("pdf")) fileType = "pdf";

      await writeContractAsync({
        address: PAYLOCK_ADDRESS,
        abi: PAYLOCK_ABI,
        functionName: 'listItem',
        args: [name, ipfsCid, previewCid, fileType, parseEther(price), BigInt(supply)], // Added Supply
      });
      
      setStatus("mining");

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      // ALERT THE ACTUAL ERROR
      alert(`Error: ${err.message || "Unknown error occurred"}`);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-green-500/5 rounded-xl border border-green-500/20 animate-in fade-in">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-white">Listed Successfully!</h3>
        <p className="text-muted text-sm mt-2">{supply} Units Available.</p>
        <button onClick={() => window.location.reload()} className="text-primary hover:underline mt-4">List Another</button>
      </div>
    );
  }

  // ... (Keep Cropper Modal code same as before) ...

  return (
    <form onSubmit={handleList} className="space-y-6">
      
      {/* --- FILE UPLOADER --- */}
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-white/5 cursor-pointer relative group transition-all">
        {/* ADDED 'multiple' ATTRIBUTE */}
        <input type="file" multiple onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
        
        {files.length > 0 ? (
          <div className="space-y-4">
             {/* Preview Area */}
             <div className="relative w-full h-40 bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
               
               {/* Multiple Files / Zip Icon */}
               {(files.length > 1 || files[0].name.endsWith('.zip')) ? (
                 <div className="text-center">
                   <Archive size={40} className="mx-auto text-primary mb-2" />
                   <p className="text-xs font-bold text-white">
                     {files.length > 1 ? `${files.length} Files Bundled` : "ZIP Archive"}
                   </p>
                 </div>
               ) : previewUrl ? (
                  // Single File Previews
                  files[0].type.startsWith("audio/") ? <FileAudio size={40} className="text-primary"/> :
                  <img src={previewUrl} className="w-full h-full object-cover" />
               ) : (
                  <div className="text-center">
                    <p className="text-xs text-muted">{generatedInfo}</p>
                  </div>
               )}
             </div>
             
             <div>
               <p className="font-bold text-white text-lg truncate px-4">
                 {files.length > 1 ? `${files[0].name} + ${files.length - 1} others` : files[0].name}
               </p>
               {files[0].type.startsWith("image/") && files.length === 1 && (
                 <button type="button" onClick={() => setIsEditing(true)} className="text-xs text-primary underline mt-2 relative z-20">Edit Preview</button>
               )}
             </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <UploadCloud className="mx-auto text-muted group-hover:text-white" size={40} />
            <div>
               <p className="font-bold text-white">Upload Assets</p>
               <p className="text-xs text-muted">Supports Multiple Files, Zip, Audio, Video, PDF</p>
            </div>
          </div>
        )}
      </div>

      {/* --- CUSTOM COVER --- */}
      {(files.length > 1 || (files[0] && !files[0].type.startsWith("image/"))) && (
         <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
           <ImageIcon size={20} className="text-muted" />
           <div className="flex-1">
             <p className="text-sm font-bold text-white">Cover Image</p>
             <p className="text-[10px] text-muted">Required for bundles & non-image files.</p>
           </div>
           <input type="file" accept="image/*" onChange={(e) => setCustomCover(e.target.files?.[0] || null)} className="text-xs text-muted"/>
         </div>
      )}

      {/* --- DETAILS GRID --- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase">Name</label>
          <input type="text" onChange={e => setName(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase">Price (MOCK)</label>
          <input type="number" step="0.0001" onChange={e => setPrice(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
        </div>
        {/* NEW: Supply Input */}
        <div className="space-y-2 col-span-2">
          <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Layers size={12}/> Supply (Units)</label>
          <input type="number" min="1" value={supply} onChange={e => setSupply(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
          <p className="text-[10px] text-muted">How many copies can be sold?</p>
        </div>
      </div>

      <button 
        disabled={status !== "idle"} 
        className="w-full bg-primary hover:bg-primaryHover text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "idle" && "List Item"}
        {status === "zipping" && <><Archive size={16} className="animate-pulse"/> Zipping Files...</>}
        {status === "scanning" && "Scanning..."}
        {status === "encrypting" && "Encrypting..."}
        {status === "uploading" && "Uploading..."}
        {status === "signing" && "Check Wallet..."}
        {status === "mining" && "Listing on Chain..."}
        {status === "error" && "Failed. Try Again."}
      </button>
    </form>
  );
}