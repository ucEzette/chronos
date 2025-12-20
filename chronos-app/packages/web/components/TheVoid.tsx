"use client";

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VAULT_ABI } from '../lib/contracts'; 
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

export function TheVoid() {
  const [fileId, setFileId] = useState("");
  const { data: hash, writeContractAsync } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleNuke = async () => {
    if (!fileId) return;
    try {
      await writeContractAsync({
        address: process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'signalVoid',
        args: [BigInt(fileId)],
      });
    } catch (e) { console.error(e); }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-green-500">Signal Sent!</h3>
        <p className="text-muted text-sm">
          Fisherman nodes are verifying the deletion. <br/>
          You will receive a Proof of Oblivion via email shortly.
        </p>
        <p className="text-xs text-zinc-600 font-mono mt-4">Tx: {hash}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-danger">The Void</h2>
        <p className="text-muted text-sm">Permanently delete data & receive cryptographic proof.</p>
      </div>

      <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 flex gap-3 text-sm text-danger/80">
        <AlertTriangle className="shrink-0" size={20} />
        <p>Warning: This action triggers a network-wide purge. Once verified by Fisherman nodes, the data is irretrievable.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">File ID to Purge</label>
          <input 
            type="text"
            placeholder="e.g. 10492"
            value={fileId}
            onChange={(e) => setFileId(e.target.value)}
            className="w-full bg-black/20 border border-border rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-danger focus:border-transparent outline-none font-mono"
          />
        </div>

        <button 
          onClick={handleNuke}
          disabled={isLoading || !fileId}
          className="w-full py-3 bg-danger hover:bg-red-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Broadcasting Signal..." : <><Trash2 size={16}/> Nuke from Network</>}
        </button>
      </div>
    </div>
  );
}