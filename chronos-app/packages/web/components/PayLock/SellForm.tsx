"use client";

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import Cropper from 'react-easy-crop';
import JSZip from 'jszip';
import { generateFileKey, encryptFile } from '@/lib/crypto';
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from '@/lib/contracts';
import { uploadToIPFS } from '@/lib/ipfs';
import { scanFile } from '@/lib/security'; // Enterprise Virus Scanner
import { getCroppedImg, getVideoCover, getAudioSnippet } from '@/lib/media';
import { 
  Loader2, DollarSign, UploadCloud, CheckCircle, 
  Image as ImageIcon, FileAudio, FileVideo, FileText, X, Eye, Layers, Archive, ShieldCheck, Download
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
          }
        }
        else if (primaryFile.type.startsWith("audio/")) {
          const snippet = await getAudioSnippet(primaryFile);
          if (snippet) {
            setPreviewBlob(snippet);
            setPreviewUrl(URL.createObjectURL(snippet));
            setGeneratedInfo("Audio preview generated.");
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
      
      // 1. Handling Bundles
      if (files.length > 1) {
        setStatus("zipping");
        const zip = new JSZip();
        files.forEach(f => zip.file(f.name, f));
        const zipContent = await zip.generateAsync({ type: "blob" });
        fileToEncrypt = new File([zipContent], `${name.replace(/\s+/g, '_')}_bundle.zip`, { type: "application/zip" });
      }

      // 2. Enterprise Security Scan (Magic Byte Validation)
      setStatus("scanning");
      const scanResult = await scanFile(fileToEncrypt);
      if (!scanResult.safe) {
        throw new Error(scanResult.error || "Security scan failed.");
      }

      // 3. Upload Public Preview (Unencrypted)
      setStatus("previewing");
      let previewCid = "";
      if (customCover) {
         previewCid = await uploadToIPFS(customCover);
      } else if (previewBlob) {
         let type = files[0].type.startsWith("audio/") ? "audio/wav" : "image/jpeg";
         const previewFile = new File([previewBlob], "preview", { type });
         previewCid = await uploadToIPFS(previewFile);
      }

      // 4. Encryption & Mandatory Key Backup
      setStatus("encrypting");
      const rawKey = generateFileKey();
      
      // FORCE DOWNLOAD of secret key for Seller backup
      const keyBlob = new Blob([`Item: ${name}\nKey: ${rawKey}\n\nKEEP THIS FILE SAFE! You need this key to deliver the item to buyers.`], { type: 'text/plain' });
      const keyUrl = URL.createObjectURL(keyBlob);
      const link = document.createElement('a');
      link.href = keyUrl;
      link.download = `SECRET-KEY-${name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const encryptedBlob = await encryptFile(fileToEncrypt, rawKey);
      const encryptedFile = new File([encryptedBlob], fileToEncrypt.name + ".enc");

      // 5. IPFS Upload (Encrypted Content)
      setStatus("uploading");
      const ipfsCid = await uploadToIPFS(encryptedFile);
      
      // Fallback local storage
      localStorage.setItem(`paylock_key_${ipfsCid}`, rawKey);

      // 6. Blockchain Transaction
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
      setStatus("idle");
      alert(`Upload Blocked: ${err.message || "Unknown error"}`);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-green-500/5 rounded-xl border border-green-500/20 animate-in fade-in">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-bold text-white">Item Secured & Listed!</h3>
        <p className="text-sm text-muted mt-2">The encryption key has been downloaded to your device.</p>
        <button onClick={() => window.location.reload()} className="bg-primary px-6 py-2 rounded-lg text-white font-bold mt-6 hover:bg-primaryHover">List Another</button>
      </div>
    );
  }

  return (
    <>
      {/* Image Editor Modal */}
      {isEditing && files.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><Eye size={18}/> Configure Preview</h3>
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
                   <h4 className="text-xs font-bold text-muted uppercase">Public Blur Level</h4>
                   <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative border border-white/10">
                      <img src={URL.createObjectURL(files[0])} className="w-full h-full object-cover transition-all duration-75" style={{ filter: `blur(${blurAmount}px)`, transform: `scale(${zoom})` }} />
                   </div>
                 </div>
                 <div className="space-y-4">
                    <input type="range" min="0" max="25" value={blurAmount} onChange={(e) => setBlurAmount(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg cursor-pointer accent-primary"/>
                    <button onClick={handleSaveImagePreview} className="w-full bg-primary py-3 rounded-lg font-bold text-white hover:bg-primaryHover">Confirm Preview</button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleList} className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-white/5 cursor-pointer relative group transition-all">
          <input type="file" multiple onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          {files.length > 0 ? (
            <div className="space-y-4">
               <div className="relative w-full h-40 bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                 {(files.length > 1 || files[0].name.endsWith('.zip')) ? (
                   <div className="text-center text-primary">
                     <Archive size={40} className="mx-auto mb-2" />
                     <p className="text-xs font-bold text-white">{files.length > 1 ? `${files.length} Files Ready` : "ZIP Archive"}</p>
                   </div>
                 ) : previewUrl ? (
                    files[0].type.startsWith("audio/") ? (
                      <div className="text-center text-primary"><FileAudio size={40} className="mx-auto mb-2"/><p className="text-[10px] text-muted">Preview Generated</p></div>
                    ) : (
                      <img src={previewUrl} className="w-full h-full object-cover" />
                    )
                 ) : (
                    <div className="text-center text-muted">
                      <FileText size={40} className="mx-auto mb-2"/>
                      <p className="text-[10px]">{generatedInfo || "Validating..."}</p>
                    </div>
                 )}
               </div>
               <p className="font-bold text-white truncate px-4">{files.length > 1 ? "Multiple Assets" : files[0].name}</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              <UploadCloud className="mx-auto text-muted group-hover:text-primary transition-colors" size={40} />
              <p className="font-bold text-white">Select Files to Securely Vend</p>
              <p className="text-[10px] text-muted">Supports Images, Audio, Video, and ZIP Bundles</p>
            </div>
          )}
        </div>

        {/* Custom Cover Fallback */}
        {(files.length > 1 || (files[0] && !previewUrl && !files[0].type.startsWith("image/"))) && (
           <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border">
             <ImageIcon size={20} className="text-primary" />
             <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">Marketplace Cover</p>
                <p className="text-[10px] text-muted">Visible to all users before purchase</p>
             </div>
             <input type="file" accept="image/*" onChange={(e) => setCustomCover(e.target.files?.[0] || null)} className="text-xs text-muted max-w-[150px]"/>
           </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Item Name</label>
            <input required type="text" placeholder="e.g. Masterclass Video" onChange={e => setName(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Price (MOCK)</label>
            <input required type="number" step="0.0001" placeholder="0.05" onChange={e => setPrice(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary transition-all" />
          </div>
          <div className="space-y-2 col-span-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">License Supply</label>
            <input required type="number" min="1" value={supply} onChange={e => setSupply(e.target.value)} className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary transition-all" />
          </div>
        </div>

        <button 
          disabled={status !== "idle" || files.length === 0} 
          className="w-full bg-primary hover:bg-primaryHover text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
        >
          {status === "idle" ? (
            <>Secure & List Listing <ShieldCheck size={18} className="group-hover:scale-110 transition-transform"/></>
          ) : (
            <><Loader2 className="animate-spin" size={18}/> Processing {status}...</>
          )}
        </button>
      </form>
    </>
  );
}