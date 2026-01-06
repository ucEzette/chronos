"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProfileSettings() {
  const [prefs, setPrefs] = useState({
    autoDecrypt: true,
    ghostMode: false,
    notifications: true
  });

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in">
      <div className="bg-[#0b1a24]/60 backdrop-blur-md p-6 rounded-xl border border-white/10 border-t-4 border-t-primary/50">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings</span>
            System Preferences
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <PreferenceToggle 
            label="Auto-Decrypt Downloads" 
            desc="Automatically burn keys upon receipt" 
            active={prefs.autoDecrypt} 
            onToggle={() => toggle('autoDecrypt')} 
          />
          <PreferenceToggle 
            label="Ghost Mode" 
            desc="Hide activity from public ledger" 
            active={prefs.ghostMode} 
            onToggle={() => toggle('ghostMode')} 
          />
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({ label, desc, active, onToggle }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer" onClick={onToggle}>
      <div className="flex flex-col">
        <span className="text-gray-300 text-sm font-medium tracking-tight group-hover:text-white transition-colors">{label}</span>
        <span className="text-[10px] text-gray-500 font-mono">{desc}</span>
      </div>
      <div className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", active ? "bg-primary/20" : "bg-gray-700")}>
        <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition shadow-[0_0_10px_rgba(255,255,255,0.5)]", active ? "translate-x-6 bg-primary" : "translate-x-1 bg-gray-400")} />
      </div>
    </div>
  );
}