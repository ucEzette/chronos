"use client";

import { useDisconnect } from "wagmi";

interface ProfileSidebarProps {
  address?: string;
  itemsCount: number; // FIX: Explicitly defined to resolve IDE red underline
}

export function ProfileSidebar({ address, itemsCount }: ProfileSidebarProps) {
  const { disconnect } = useDisconnect();

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 z-10 font-display">
      <div className="glass-panel rounded-xl p-6 flex flex-col items-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00E5FF] to-[#2979FF]" />
        
        <h1 className="text-2xl font-bold text-white mb-1">User Profile</h1>
        <div className="grid grid-cols-2 gap-3 w-full mb-6 mt-4">
          <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5">
            <p className="text-[10px] text-gray-400 uppercase">Artifacts</p>
            <p className="text-white font-bold font-mono text-xs">{itemsCount}</p>
          </div>
        </div>

        <button 
          onClick={() => disconnect()}
          className="w-full py-3 px-4 bg-black/40 hover:bg-red-900/20 border border-white/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
        >
          DISCONNECT
        </button>
      </div>
    </aside>
  );
}