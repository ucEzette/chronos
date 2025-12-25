"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, Download, Lock, CheckCircle2, Clock } from "lucide-react";

interface InventoryProps {
  items: any[];
  isLoading?: boolean;
}

/**
 * CHRONOS INVENTORY GRID
 * Verified to sync with blockchain "isDelivered" status.
 */
export function ProfileInventory({ items, isLoading }: InventoryProps) {
  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block animate-spin size-8 border-4 border-t-primary border-white/10 rounded-full mb-4" />
        <p className="font-mono text-xs text-primary animate-pulse tracking-widest uppercase">Synchronizing_Local_Ledger...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {items.map((item) => (
        <div 
          key={item.id.toString()} 
          className="group relative bg-glass-surface border border-glass-border rounded-xl p-5 hover:border-primary/50 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        >
          {/* Real-time Status Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className={cn(
              "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter",
              item.isDelivered 
                ? "bg-neon-lime/10 text-neon-lime border-neon-lime/30 shadow-glow-lime" 
                : "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30"
            )}>
              {item.isDelivered ? "Unlocked" : "Awaiting_Key"}
            </span>
          </div>

          <div className="flex gap-4 items-start mb-6">
            <div className="h-14 w-14 bg-black/40 rounded border border-white/5 flex items-center justify-center text-primary group-hover:shadow-glow-primary transition-all">
              <span className="material-symbols-outlined text-2xl">
                {item.fileType === 'audio' ? 'audio_file' : 'folder_zip'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm uppercase truncate mb-1">
                {item.name}
              </h4>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                ID: #{item.id.toString().slice(-4)} // {item.fileType}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Conditional Action Button based on Delivery Status */}
            {item.isDelivered ? (
              <button className="w-full py-2.5 bg-primary hover:bg-primary-dark text-black font-black text-[10px] uppercase rounded shadow-glow-primary flex items-center justify-center gap-2 transition-all active:scale-95">
                <Download size={14} /> Download_Artifact
              </button>
            ) : (
              <div className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-500 font-bold text-[10px] uppercase rounded flex items-center justify-center gap-2 italic cursor-wait">
                <Clock size={14} className="animate-pulse" /> Decryption_Pending
              </div>
            )}
            
            <button className="w-full py-2 text-gray-500 hover:text-white text-[9px] font-mono uppercase tracking-widest transition-colors">
              View_Transaction_Manifest
            </button>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="col-span-full py-32 border border-dashed border-glass-border rounded-2xl flex flex-col items-center justify-center bg-white/2 opacity-40">
          <Lock size={48} className="mb-4 text-gray-600" />
          <p className="font-mono text-xs uppercase tracking-widest text-gray-500">No Acquired Artifacts Detected</p>
        </div>
      )}
    </div>
  );
}