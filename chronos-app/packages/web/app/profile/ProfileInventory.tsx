"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, Download, Lock, CheckCircle2, Clock, Globe } from "lucide-react";

interface InventoryProps {
  items: any[];
  isLoading?: boolean;
  onDecrypt: (item: any) => void;
}

export function ProfileInventory({ items, isLoading, onDecrypt }: InventoryProps) {
  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin size-8 border-4 border-t-primary border-white/10 rounded-full mb-4" />
        <p className="font-mono text-xs text-primary animate-pulse tracking-widest uppercase">Synchronizing Multi-Chain Ledger...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {items.map((item) => (
        <div 
          key={`${item.chainId}-${item.id}`} 
          className="group relative bg-[#0b1a24]/60 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-primary/50 transition-all duration-300 shadow-lg"
        >
          {/* Status & Chain Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* Chain Badge */}
            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter flex items-center gap-1",
              item.chainId === 55931 ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-blue-600/10 text-blue-400 border-blue-600/30"
            )}>
              <Globe size={8} />
              {item.chainId === 55931 ? "DH" : "ARC"}
            </span>

            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter",
              item.hasKey 
                ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]" 
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
            )}>
              {item.hasKey ? "Unlocked" : "Pending"}
            </span>
          </div>

          <div className="flex gap-4 items-start mb-6">
            <div className="h-14 w-14 bg-black/40 rounded border border-white/5 flex items-center justify-center text-primary group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
              {item.fileType?.includes('audio') ? <span className="material-symbols-outlined">audio_file</span> : <span className="material-symbols-outlined">folder_zip</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm uppercase truncate mb-1">
                {item.name}
              </h4>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                ID: #{item.id.toString()} // {item.fileType || "DATA"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {item.hasKey ? (
              <button 
                onClick={() => onDecrypt(item)}
                className="w-full py-2.5 bg-primary hover:bg-cyan-400 text-black font-black text-[10px] uppercase rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download size={14} /> Download_Artifact
              </button>
            ) : (
              <div className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-500 font-bold text-[10px] uppercase rounded flex items-center justify-center gap-2 italic cursor-wait">
                <Clock size={14} className="animate-pulse" /> Decryption_Pending
              </div>
            )}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="col-span-full py-32 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center bg-white/5">
          <Lock size={48} className="mb-4 text-white/20" />
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">No Acquired Artifacts Detected</p>
        </div>
      )}
    </div>
  );
}