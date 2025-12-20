"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { VaultForm } from "@/components/VaultForm";
import { TheVoid } from "@/components/TheVoid";
import { MyVault } from "@/components/MyVault";
import { SellForm } from "@/components/PayLock/SellForm";
import { Marketplace } from "@/components/PayLock/Marketplace";
import { ActivityHistory } from "@/components/PayLock/ActivityHistory";
import { cn } from "@/lib/utils";
import { Shield, Trash2, Wallet, LogOut, Terminal, Zap, Database, DollarSign, History } from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // DEFAULT TAB: PayLock
  const [activeTab, setActiveTab] = useState<"paylock" | "vault" | "void" | "view">("paylock");
  const [paylockMode, setPaylockMode] = useState<"buy" | "sell" | "history">("buy");

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background text-white selection:bg-primary/30 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">C</span>
            </div>
            <span className="font-bold text-xl tracking-tight">CHRONOS</span>
          </div>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                <span className="text-sm font-mono text-muted">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                <button onClick={() => disconnect()}><LogOut size={14} className="text-muted hover:text-white" /></button>
              </div>
            ) : (
              connectors.slice(0, 1).map((c) => (
                <button key={c.uid} onClick={() => connect({ connector: c })} className="bg-white text-black px-5 py-2 rounded-full font-bold text-sm">
                  Connect Wallet
                </button>
              ))
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-3xl mx-auto">
        {!isConnected ? (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-white">Secure Data.</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Zero Trace.</span>
            </h1>
            <p className="text-xl text-muted max-w-lg mx-auto">Decentralized Vending, Time Capsules, and Verifiable Deletion.</p>
          </div>
        ) : (
          <div className="w-full space-y-6 animate-in fade-in zoom-in duration-500">
            {/* Tabs */}
            <div className="grid grid-cols-4 p-1.5 bg-surface border border-border rounded-xl shadow-inner overflow-hidden">
              {[
                { id: "paylock", label: "PayLock", icon: DollarSign },
                { id: "vault", label: "Vault", icon: Shield },
                { id: "void", label: "Void", icon: Trash2 },
                { id: "view", label: "My Files", icon: Database },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
                    activeTab === tab.id 
                      ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" 
                      : "text-muted hover:text-white hover:bg-white/5"
                  )}
                >
                  <tab.icon size={16} /> <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="bg-[#0A0A0A] border border-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden min-h-[400px]">
              {activeTab === "vault" && <VaultForm />}
              {activeTab === "void" && <TheVoid />}
              {activeTab === "view" && <MyVault />}
              
              {activeTab === "paylock" && (
                <div className="space-y-6">
                  <div className="flex justify-center mb-6">
                     <div className="bg-surface p-1 rounded-full inline-flex border border-border">
                       <button onClick={() => setPaylockMode("buy")} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", paylockMode === "buy" ? "bg-primary text-white shadow-md" : "text-muted hover:text-white")}>
                         Marketplace
                       </button>
                       <button onClick={() => setPaylockMode("sell")} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", paylockMode === "sell" ? "bg-primary text-white shadow-md" : "text-muted hover:text-white")}>
                         Sell Data
                       </button>
                       <button onClick={() => setPaylockMode("history")} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2", paylockMode === "history" ? "bg-primary text-white shadow-md" : "text-muted hover:text-white")}>
                         <History size={16} /> History
                       </button>
                    </div>
                  </div>
                  {paylockMode === "buy" && <Marketplace />}
                  {paylockMode === "sell" && <SellForm />}
                  {paylockMode === "history" && <ActivityHistory />}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 font-mono">
              <Terminal size={12} /> <span>Network: DataHaven Testnet</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}