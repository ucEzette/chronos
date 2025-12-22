"use client";

import { useConnect, useAccount, useConnectors } from "wagmi";
import { useEffect, useState } from "react";

export function ConnectModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { connect, isPending, error: connectError } = useConnect();
  const connectors = useConnectors();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050f14]/90 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md bg-[#0b1a24]/80 border border-[#40E0D0]/20 rounded-2xl p-8 relative z-10">
        <h2 className="text-2xl font-bold uppercase text-white mb-8 text-center tracking-widest">Connect Wallet</h2>

        <div className="space-y-3">
          {connectors.map((c) => (
            <button key={c.id} onClick={() => connect({ connector: c })} className="w-full p-4 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/5 transition-all">
              {c.name}
            </button>
          ))}
        </div>

        {/* FIXED: Removed stray symbols and wrapped properly */}
        {connectError && (
          <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-mono uppercase tracking-tighter">
            <span>{">"} Uplink Failed: {connectError.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}