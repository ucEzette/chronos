"use client";

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import Cropper from 'react-easy-crop';
import JSZip from 'jszip';
import { generateFileKey, encryptFile } from '@/lib/crypto';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { uploadToIPFS } from '@/lib/ipfs';
import { scanFile } from '@/lib/security';
import { getCroppedImg, getVideoCover, getAudioSnippet } from '@/lib/media';
import { 
  Loader2, DollarSign, UploadCloud, CheckCircle, 
  Image as ImageIcon, FileAudio, FileVideo, FileText, X, Eye, Layers, Archive
} from 'lucide-react';

type CropArea = { x: number; y: number; width: number; height: number };

export function SellForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [customCover, setCustomCover] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [supply, setSupply] = useState("1");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");

  const [isEditing, setIsEditing] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [blurAmount, setBlurAmount] = useState(0);
  
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedInfo, setGeneratedInfo] = useState<string>("");

  const { data: hash, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      const primaryFile = selectedFiles[0];
      
      setPreviewUrl(null);
      setPreviewBlob(null);
      setCustomCover(null);
      setGeneratedInfo("");

      if (selectedFiles.length > 1 || primaryFile.name.endsWith('.zip')) {
        setGeneratedInfo("Bundle/Zip detected. Please upload a Cover Image.");
        return;
      }

      setGeneratedInfo("Processing preview...");

      try {
        if (primaryFile.type.startsWith("image/")) {
          setPreviewUrl(URL.createObjectURL(primaryFile));
          setIsEditing(true); 
          setGeneratedInfo("");
        } 
        else if (primaryFile.type.startsWith("video/")) {
          const frame = await getVideoCover(primaryFile);
          if (frame) {
            setPreviewBlob(frame);
            setPreviewUrl(URL.createObjectURL(frame));
            setGeneratedInfo("Video snapshot generated.");
          } else {
            setGeneratedInfo("Could not generate snapshot. Upload a cover.");
          }
        }
        else if (primaryFile.type.startsWith("audio/")) {
          const snippet = await getAudioSnippet(primaryFile);
          if (snippet) {
            setPreviewBlob(snippet);
            setPreviewUrl(URL.createObjectURL(snippet));
            setGeneratedInfo("10s Audio snippet generated.");
          } else {
             setGeneratedInfo("Audio preview failed. Upload a cover.");
          }
        }
        else {
          setGeneratedInfo("Document detected. Upload a cover.");
        }
      } catch (err) {
        console.error("Preview error:", err);
        setGeneratedInfo("Preview failed. Please upload a cover.");
      }
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveImagePreview = async () => {
    if (!files[0] || !files[0].type.startsWith("image/") || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedImg(files[0], croppedAreaPixels, blurAmount);
      if (blob) {
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setIsEditing(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleList = async (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !price || !name || !supply) return;

    try {
      let fileToEncrypt = files[0];
      
      if (files.length > 1) {
        setStatus("zipping");
        const zip = new JSZip();
        files.forEach(f => zip.file(f.name, f));
        const zipContent = await zip.generateAsync({ type: "blob" });
        fileToEncrypt = new File([zipContent], `${name.replace(/\s+/g, '_')}_bundle.zip`, { type: "application/zip" });
      }

      setStatus("scanning");
      await scanFile(fileToEncrypt);

      setStatus("previewing");
      let previewCid = "";
      
      if (customCover) {
         previewCid = await uploadToIPFS(customCover);
      } else if (previewBlob) {
         let type = "image/jpeg";
         if (files[0].type.startsWith("audio/")) type = "audio/wav";
         const previewFile = new File([previewBlob], "preview", { type });
         previewCid = await uploadToIPFS(previewFile);
      }

      setStatus("encrypting");
      const rawKey = generateFileKey();
      const encryptedBlob = await encryptFile(fileToEncrypt, rawKey);
      const encryptedFile = new File([encryptedBlob], fileToEncrypt.name + ".enc");

      setStatus("uploading");
      const ipfsCid = await uploadToIPFS(encryptedFile);
      
      localStorage.setItem(`paylock_key_${ipfsCid}`, rawKey);

      setStatus("signing");
      
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
        args: [name, ipfsCid, previewCid, fileType, parseEther(price), BigInt(supply)],
      });
      
      setStatus("mining");

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      alert(`Error: ${err.message || "Unknown error"}`);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-green-500/5 rounded-xl border border-green-500/20 animate-in fade-in">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-white">Listed Successfully!</h3>
        <button onClick={() => window.location.reload()} className="text-primary hover:underline mt-4">List Another</button>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <>
      {isEditing && files.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><Eye size={18}/> Edit Public Preview</h3>
               <button onClick={() => setIsEditing(false)}><X size={20} className="text-muted hover:text-white"/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 h-[400px]">
               <div className="relative bg-black h-full border-r border-white/10">
                  <Cropper
                    image={URL.createObjectURL(files[0])}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
               </div>
               <div className="p-6 flex flex-col justify-between bg-zinc-900">
                 <div className="space-y-4">
                   <h4 className="text-xs font-bold text-muted uppercase">Live Result</h4>
                   <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-white/10">
                      <img src={URL.createObjectURL(files[0])} className="w-full h-full object-cover transition-all duration-75" style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoom})`, transformOrigin: 'center' }} />
                   </div>
                 </div>
                 <div className="space-y-4">
                    <input type="range" min="0" max="20" value={blurAmount} onChange={(e) => setBlurAmount(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg cursor-pointer accent-primary"/>
                    <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg cursor-pointer accent-primary"/>
                    <button onClick={handleSaveImagePreview} className="w-full bg-primary py-3 rounded-lg font-bold text-white hover:bg-primaryHover">Save Preview</button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleList} className="space-y-6">
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-white/5 cursor-pointer relative group transition-all">
          <input type="file" multiple onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          {files.length > 0 ? (
            <div className="space-y-4">
               <div className="relative w-full h-40 bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                 {(files.length > 1 || files[0].name.endsWith('.zip')) ? (
                   <div className="text-center">
                     <Archive size={40} className="mx-auto text-primary mb-2" />
                     <p className="text-xs font-bold text-white">{files.length > 1 ? `${files.length} Files Bundled` : "ZIP Archive"}</p>
                   </div>
                 ) : previewUrl ? (
                    files[0].type.startsWith("audio/") ? (
                      <div className="text-center"><FileAudio size={40} className="mx-auto text-primary mb-2"/><audio src={previewUrl} controls className="h-8 w-48"/></div>
                    ) : (
                      <img src={previewUrl} className="w-full h-full object-cover" />
                    )
                 ) : (
                    <div className="text-center">
                      <p className="text-xs text-muted mb-2">{generatedInfo || "No Preview"}</p>
                      {files[0].type.startsWith("audio") ? <FileAudio size={32} className="mx-auto text-muted"/> : <FileText size={32} className="mx-auto text-muted"/>}
                    </div>
                 )}
               </div>
               <div>
                 <p className="font-bold text-white text-lg truncate px-4">{files.length > 1 ? "Multiple Files" : files[0].name}</p>
                 {files.length === 1 && files[0].type.startsWith("image/") && <button type="button" onClick={(e) => {e.stopPropagation(); setIsEditing(true)}} className="text-xs text-primary underline mt-2 relative z-20">Edit Preview</button>}
               </div>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <UploadCloud className="mx-auto text-muted group-hover:text-white" size={40} />
              <p className="font-bold text-white">Upload Assets</p>
            </div>
          )}
        </div>

        {(files.length > 1 || (files[0] && !previewUrl && !files[0].type.startsWith("image/"))) && (
           <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
             <ImageIcon size={20} className="text-muted" />
             <div className="flex-1"><p className="text-sm font-bold text-white">Cover Image</p></div>
             <input type="file" accept="image/*" onChange={(e) => setCustomCover(e.target.files?.[0] || null)} className="text-xs text-muted"/>
           </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase">Name</label>
            <input type="text" onChange={e => setName(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase">Price</label>
            <input type="number" step="0.0001" onChange={e => setPrice(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
          </div>
          <div className="space-y-2 col-span-2">
            <label className="text-xs font-bold text-muted uppercase">Supply</label>
            <input type="number" min="1" value={supply} onChange={e => setSupply(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary" />
          </div>
        </div>

        <button disabled={status !== "idle"} className="w-full bg-primary hover:bg-primaryHover text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {status === "idle" ? "List Item" : <><Loader2 className="animate-spin" size={16}/> {status}...</>}
        </button>
      </form>
    </>
  );
}