"use client";

import { useReadContract, useAccount } from "wagmi";
import { VAULT_ABI, VAULT_ADDRESS } from "@/lib/contracts";
import { Loader2, File, Lock, Unlock, Database } from "lucide-react";
import { formatDate } from "@/lib/utils";

function CapsuleCard({ id }: { id: bigint }) {
  const { data: capsule } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getCapsule",
    args: [id],
  });

  if (!capsule) return <div className="h-24 bg-white/5 animate-pulse rounded-xl" />;

  // Destructure: struct Capsule { id, ipfsCid, encryptedKey, unlockTime, owner, isClaimed }
  // Note: Depending on wagmi version, this might be an array or object. 
  // We assume array based on standard ABI generation: [id, cid, key, time, owner, claimed]
  const cid = (capsule as any)[1]; 
  const unlockTime = (capsule as any)[3];
  
  const isLocked = BigInt(Date.now() / 1000) < unlockTime;

  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between group hover:border-primary/50 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLocked ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
          {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
        </div>
        <div>
          <h4 className="font-bold text-white">Capsule #{id.toString()}</h4>
          <p className="text-xs text-muted font-mono">Unlock: {formatDate(unlockTime)}</p>
        </div>
      </div>
      
      <a 
        href={`https://gateway.pinata.cloud/ipfs/${cid}`} 
        target="_blank"
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-white transition-colors"
      >
        View Data
      </a>
    </div>
  );
}

export function MyVault() {
  const { address } = useAccount();
  
  const { data: capsuleIds, isLoading } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "getMyCapsules",
    account: address,
  });

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

  const ids = (capsuleIds || []) as bigint[];

  if (ids.length === 0) {
    return (
      <div className="text-center py-12 text-muted border border-dashed border-white/10 rounded-xl">
        <Database size={40} className="mx-auto mb-4 opacity-50" />
        <p>No capsules found in your vault.</p>
        <p className="text-xs mt-2">Create one in the "Vault" tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {ids.map((id) => (
        <CapsuleCard key={id.toString()} id={id} />
      ))}
    </div>
  );
}