"use client";

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { generateFileKey, encryptFile, encryptKey } from '@/lib/crypto';
import { VAULT_ABI, VAULT_ADDRESS } from '@/lib/contracts';
import { uploadToIPFS } from '@/lib/ipfs'; // Ensure this file exists from previous steps
import { Loader2, Lock, UploadCloud, Calendar, FileText, Download, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VaultForm() {
  const [file, setFile] = useState<File | null>(null);
  const [unlockDate, setUnlockDate] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("idle");
  const [recoveryData, setRecoveryData] = useState<any>(null);

  const { data: hash, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !unlockDate || !password) return;

    try {
      // 1. Encrypt File
      setStatus("encrypting");
      const aesKey = generateFileKey(); 
      const encryptedBlob = await encryptFile(file, aesKey); 
      const encryptedFile = new File([encryptedBlob], file.name + ".enc", { type: "text/plain" });

      // 2. Upload to IPFS
      setStatus("uploading");
      const ipfsCid = await uploadToIPFS(encryptedFile);

      // 3. Lock on Chain
      setStatus("signing");
      const safeKey = encryptKey(aesKey, password); // Encrypt key with password
      const unlockTimestamp = BigInt(Math.floor(new Date(unlockDate).getTime() / 1000));

      // ERROR WAS HERE: Updated to match the new ABI (3 args)
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'createCapsule',
        args: [
          ipfsCid,                                                       // 1. IPFS CID (string)
          `0x${Buffer.from(safeKey).toString('hex')}` as `0x${string}`,  // 2. Encrypted Key (bytes)
          unlockTimestamp                                                // 3. Unlock Time (uint256)
        ],
      });

      // 4. Prepare Recovery Certificate
      setRecoveryData({
        fileName: file.name,
        unlockDate,
        ipfsCid,
        decryptionKey: aesKey,
        txHash: hash
      });

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("idle"); // Reset status on error so user can try again
      alert("Upload failed. Check console.");
    }
  };

  const downloadCertificate = () => {
    if (!recoveryData) return;
    const content = `
CHRONOS RECOVERY KIT
--------------------
DO NOT SHARE THIS FILE. IT CONTAINS YOUR DECRYPTION KEYS.

File Name: ${recoveryData.fileName}
Unlock Date: ${recoveryData.unlockDate}
IPFS CID: ${recoveryData.ipfsCid}
Transaction: ${recoveryData.txHash}

--- EMERGENCY DECRYPTION KEY ---
If you forget your password, use this key to decrypt your file:
${recoveryData.decryptionKey}
--------------------------------
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chronos-Key-${recoveryData.fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isSuccess && recoveryData) {
    return (
      <div className="text-center space-y-6 py-10 animate-in fade-in zoom-in">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
          <CheckCircle size={40} />
        </div>
        <h3 className="text-3xl font-bold text-white">Capsule Secured</h3>
        <p className="text-muted max-w-md mx-auto">
          Your file is encrypted and stored on IPFS. The key is locked on DataHaven.
        </p>
        
        <button 
          onClick={downloadCertificate}
          className="bg-primary hover:bg-primaryHover text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 mx-auto shadow-lg hover:scale-105 transition-all"
        >
          <Download size={20} /> Download Recovery Kit
        </button>
        <p className="text-xs text-red-400">Save this! It is the only way to recover your file if you forget your password.</p>
        
        <button onClick={() => window.location.reload()} className="text-muted hover:text-white underline text-sm mt-4">
          Upload Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Secure Time Capsule</h2>
        <p className="text-muted text-sm">Encrypt data client-side and lock it on-chain.</p>
      </div>

      <form onSubmit={handleUpload} className="space-y-6">
         {/* File Input */}
         <div className={cn(
            "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer relative group flex flex-col items-center justify-center gap-4",
            file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-white/5"
          )}>
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {file ? (
              <>
                <FileText size={40} className="text-primary" />
                <p className="font-bold text-white">{file.name}</p>
              </>
            ) : (
              <>
                <UploadCloud size={32} className="text-muted group-hover:text-white" />
                <p className="font-medium text-white">Click to upload file</p>
              </>
            )}
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                <Calendar size={12}/> Unlock Date
              </label>
              <input 
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                <Lock size={12}/> Encryption Password
              </label>
              <input 
                type="password"
                required
                placeholder="Secret Password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg p-3 text-white outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={status !== "idle"}
            className="w-full bg-primary hover:bg-primaryHover text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg"
          >
            {status === "idle" && "Encrypt & Upload"}
            {status === "encrypting" && "Encrypting..."}
            {status === "uploading" && "Uploading to IPFS..."}
            {status === "signing" && "Waiting for Wallet..."}
            {(isConfirming || isSuccess) && <><Loader2 className="animate-spin" size={16}/> Confirming...</>}
          </button>
      </form>
    </div>
  );
}