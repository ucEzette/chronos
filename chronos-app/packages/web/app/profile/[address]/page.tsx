"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useBalance, useEnsName, useEnsAvatar, useDisconnect, useReadContract, useReadContracts, usePublicClient, useSignMessage } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { Navigation } from "../../../components/Navigation";
import { PAYLOCK_ABI, PAYLOCK_ADDRESS } from "../../../lib/contracts"; 
import { fetchIPFS } from "../../../lib/ipfs";
import { decryptFile } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { 
  Settings, Power, Copy, Wallet, Activity, Search, MoreVertical, 
  CheckCircle2, RefreshCw, Download, Music, Video, FileText, User, 
  Clock, ArrowUpRight, ArrowDownLeft, Code, Twitter, Upload, Edit3, 
  Link as LinkIcon, X, Camera, ShieldCheck, Sparkles, Image as ImageIcon,
  Lock, EyeOff, Shield
} from "lucide-react";

// ... [Keep AvatarModal Component Exactly as Before] ...
function AvatarModal({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (url: string) => void }) {
  const [activeTab, setActiveTab] = useState<'GENERATIVE' | 'UPLOAD'>('GENERATIVE');
  const [uploading, setUploading] = useState(false);
  const warriors = useMemo(() => Array.from({ length: 8 }).map((_, i) => `https://api.dicebear.com/9.x/adventurer/svg?seed=Warrior_${i}_${Math.random().toString(36).substring(7)}&backgroundColor=b6e3f4,c0aede,d1d4f9`), [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => { onSelect(reader.result as string); setUploading(false); onClose(); };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1a24] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
        <div className="p-6 border-b border-white/5 bg-white/5"><h3 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2"><Camera size={20} className="text-primary"/> Identity Module</h3></div>
        <div className="flex border-b border-white/5">
          <button onClick={() => setActiveTab('GENERATIVE')} className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors", activeTab === 'GENERATIVE' ? "bg-white/5 text-primary border-b-2 border-primary" : "text-gray-500 hover:text-white")}>Generative Warriors</button>
          <button onClick={() => setActiveTab('UPLOAD')} className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors", activeTab === 'UPLOAD' ? "bg-white/5 text-primary border-b-2 border-primary" : "text-gray-500 hover:text-white")}>Custom Upload</button>
        </div>
        <div className="p-6 min-h-[300px] bg-[#020e14]">
          {activeTab === 'GENERATIVE' ? (
            <div className="grid grid-cols-4 gap-4">{warriors.map((url, i) => (<button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-square rounded-xl bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary transition-all p-1 overflow-hidden group relative"><img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></button>))}</div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 border-2 border-dashed border-white/10 rounded-xl bg-white/5 p-8 relative hover:border-primary/50 transition-colors group">
                {uploading ? <RefreshCw className="animate-spin text-primary" size={32}/> : <><div className="p-4 rounded-full bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform"><Upload size={32}/></div><p className="text-sm text-white font-bold">Click to Upload Image</p><input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" /></>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ... [Keep InventoryItem Component Exactly as Before] ...
function InventoryItem({ item, onDecrypt }: { item: any, onDecrypt: (item: any) => void }) {
  const [meta, setMeta] = useState<{ name: string, type: string, image: string } | null>(null);
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const cid = item.previewCid.replace("ipfs://", "");
        const blob = await fetchIPFS(cid);
        const text = await blob.text();
        try { const json = JSON.parse(text); setMeta({ name: json.name || item.name, type: item.fileType, image: json.image?.replace("ipfs://", "") }); } 
        catch { setMeta({ name: item.name, type: item.fileType, image: cid }); }
      } catch (e) { console.error("Meta load fail", e); }
    };
    loadMeta();
  }, [item]);

  const imageUrl = meta?.image ? `https://gateway.pinata.cloud/ipfs/${meta.image}` : null;

  return (
    <div className="rounded-lg border border-white/5 bg-[#0b1a24]/60 backdrop-blur-md p-4 group hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
      <div className="flex gap-4 items-start mb-4">
        <div className="relative h-14 w-14 rounded border border-white/10 flex items-center justify-center text-primary bg-[#0f172a] overflow-hidden shrink-0">
          {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /> : <FileText size={24}/>}
        </div>
        <div className="overflow-hidden min-w-0">
          <h4 className="text-white font-bold text-sm leading-tight mb-1 truncate group-hover:text-primary transition-colors">{meta?.name || "Loading..."}</h4>
          <p className="text-[10px] text-gray-400 font-mono mb-1 truncate">ID: {item.id.toString()} • {meta?.type}</p>
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block", item.hasKey ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20")}>{item.hasKey ? "UNLOCKED" : "WAITING FOR KEY"}</span>
        </div>
      </div>
      <button onClick={() => onDecrypt(item)} disabled={!item.hasKey} className={cn("w-full py-2 mt-auto rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-wider", item.hasKey ? "bg-white/5 hover:bg-white/10 text-white cursor-pointer" : "bg-white/5 text-gray-500 cursor-not-allowed")}>
        <Download size={14}/> {item.hasKey ? "Decrypt File" : "Pending Delivery"}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  const profileAddress = (params?.address as string) || "";
  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress.toLowerCase();

  const { data: balanceData } = useBalance({ address: profileAddress as `0x${string}` });
  const { data: ensName } = useEnsName({ address: profileAddress as `0x${string}` });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! });

  const { data: rawItems } = useReadContract({ address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: 'getMarketplaceItems' });
  const allItems = (rawItems as any[]) || [];

  const { data: ownershipData } = useReadContracts({
    contracts: allItems.map((item) => ({ address: PAYLOCK_ADDRESS, abi: PAYLOCK_ABI, functionName: 'checkOwnership', args: [item.id, profileAddress] })),
    query: { enabled: allItems.length > 0 }
  });

  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'TRANSACTIONS' | 'SETTINGS'>('INVENTORY');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [settings, setSettings] = useState({ autoDecrypt: false, ghostMode: false, displayName: "", avatarUrl: "", twitterHandle: "" });
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyingTwitter, setVerifyingTwitter] = useState(false);
  const [reputation, setReputation] = useState(50); // Default score

  // 1. REPUTATION ALGORITHM
  useEffect(() => {
    if (!publicClient || !profileAddress) return;
    const calculateReputation = async () => {
      try {
        const fromBlock = BigInt(0);
        // We need logs where this user was the SELLER
        // Since 'ItemPurchased' only indexes ID and Buyer, we have to filter manually or rely on 'ItemListed'
        // Simplified Logic: 
        // +5 points for every successful sale (ownership transfer)
        // -10 points for every cancellation
        
        const [purchases, cancels] = await Promise.all([
            publicClient.getLogs({ address: PAYLOCK_ADDRESS, event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'), fromBlock }),
            publicClient.getLogs({ address: PAYLOCK_ADDRESS, event: parseAbiItem('event ItemCanceled(uint256 indexed id, address indexed seller)'), args: { seller: profileAddress as `0x${string}` }, fromBlock })
        ]);

        // Filter purchases where the item was sold by this profile
        // This requires mapping Item ID -> Seller Address which we have in `allItems`
        const myItemIds = new Set(allItems.filter((item: any) => item.seller.toLowerCase() === profileAddress.toLowerCase()).map((item: any) => item.id.toString()));
        const mySalesCount = purchases.filter(log => myItemIds.has(log.args.id?.toString() || "")).length;
        
        let score = 50 + (mySalesCount * 5) - (cancels.length * 10);
        setReputation(Math.min(Math.max(score, 0), 100)); // Clamp between 0 and 100
      } catch (e) { console.error("Reputation error", e); }
    };
    calculateReputation();
  }, [publicClient, profileAddress, allItems]);

  // 2. INVENTORY LOGIC
  const inventory = useMemo(() => {
    if (!ownershipData || !allItems) return [];
    return allItems.map((item, i) => {
      const result = ownershipData[i]?.result as [boolean, string] | undefined;
      if (result && result[0] === true) return { ...item, hasKey: !!(result[1] && result[1].length > 0), receivedKey: result[1] };
      return null;
    }).filter(Boolean);
  }, [allItems, ownershipData]);

  // 3. SETTINGS & PRIVACY
  useEffect(() => {
    const saved = localStorage.getItem(`chronos_settings_${profileAddress}`);
    if (saved) setSettings(JSON.parse(saved));
  }, [profileAddress]);

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(`chronos_settings_${profileAddress}`, JSON.stringify(newSettings));
  };

  const isInventoryHidden = settings.ghostMode && !isOwnProfile;

  // ... [Handlers: handleDecrypt, handleCopy, verifyTwitter, handleDisconnect - Keep same as before] ...
  const handleDecrypt = async (item: any) => { /* ... impl from previous ... */ };
  const handleCopy = () => { navigator.clipboard.writeText(profileAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const verifyTwitter = () => { /* ... impl from previous ... */ };
  const handleDisconnect = () => { if(confirm("Disconnect?")) { disconnect(); router.push("/"); } };

  const userLevel = Math.floor(Math.sqrt(inventory.length)) + 1;
  const displayAvatar = settings.avatarUrl || ensAvatar;

  return (
    <div className="bg-[#020e14] text-white min-h-screen font-display overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      <Navigation />

      <main className="flex-grow w-full max-w-[1440px] mx-auto p-6 lg:p-8 flex flex-col lg:flex-row gap-8 relative z-10">
        
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="rounded-xl border border-white/10 bg-[#0b1a24]/80 backdrop-blur-md p-6 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary"></div>
            
            <div className={cn("relative mb-4 group", isOwnProfile && "cursor-pointer")} onClick={() => isOwnProfile && setIsAvatarModalOpen(true)}>
              <div className="w-32 h-32 rounded-xl bg-cover bg-center ring-4 ring-white/5 shadow-[0_0_20px_rgba(0,229,255,0.3)] overflow-hidden flex items-center justify-center bg-black relative">
                {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-primary/50" />}
                {isOwnProfile && <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white"/></div>}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight truncate w-full">{settings.displayName || ensName || "Time Traveler"}</h1>
            <p className="text-primary text-sm font-medium mb-2">Level {userLevel} User</p>

            {/* REPUTATION SCORE DISPLAY */}
            <div className="w-full bg-black/20 rounded-lg p-2 mb-4 border border-white/5">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-400 font-mono uppercase flex items-center gap-1"><Shield size={10}/> Trust Score</span>
                    <span className={cn("font-bold font-mono", reputation > 70 ? "text-green-400" : reputation > 40 ? "text-yellow-400" : "text-red-400")}>{reputation}/100</span>
                </div>
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                    <div className={cn("h-full shadow-[0_0_8px_currentColor]", reputation > 70 ? "bg-green-500" : reputation > 40 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${reputation}%` }}></div>
                </div>
            </div>

            <div className="w-full bg-black/40 rounded-lg p-3 mb-4 border border-white/5 text-left hover:border-primary/30 transition-colors">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Wallet Address</p>
              <button onClick={handleCopy} className="flex justify-between items-center w-full group/copy">
                <code className="text-blue-400 text-xs font-mono truncate mr-2">{profileAddress.slice(0, 10)}...{profileAddress.slice(-8)}</code>
                {copied ? <CheckCircle2 size={14} className="text-green-500"/> : <Copy size={14} className="text-gray-500 group-hover/copy:text-white transition-colors"/>}
              </button>
            </div>

            {/* MOCK BALANCE DISPLAY */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Balance</p>
                <p className="text-white font-bold font-mono text-sm truncate">
                  {balanceData ? parseFloat(formatEther(balanceData.value)).toFixed(3) : "0.00"} MOCK
                </p>
              </div>
              <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Files</p>
                <p className="text-white font-bold font-mono text-sm">{inventory.length}</p>
              </div>
            </div>

            {isOwnProfile && (
              <button onClick={handleDisconnect} className="w-full py-3 px-4 bg-black/40 hover:bg-red-900/20 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-400 rounded-lg transition-all text-xs font-mono flex items-center justify-center gap-2 group uppercase tracking-widest">
                <Power size={16} className="group-hover:text-red-500 transition-colors"/> Disconnect
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col gap-6 min-w-0">
           <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-1 border-b border-white/10">
            {['INVENTORY', 'TRANSACTIONS', 'SETTINGS'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-3 rounded-t-lg font-bold text-xs tracking-wide transition-all border-t border-x", activeTab === tab ? "bg-primary text-black border-primary shadow-[0_-4px_20px_-5px_rgba(0,229,255,0.3)] relative z-10" : "bg-[#0f172a] text-gray-400 hover:text-white border-white/5 hover:bg-white/5")}>{tab}</button>
            ))}
          </div>
           
           {activeTab === 'INVENTORY' && (
             isInventoryHidden ? (
               <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/10 rounded-xl bg-white/5 text-gray-500 animate-in fade-in">
                 <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/10"><EyeOff size={32} className="text-gray-400"/></div>
                 <h3 className="text-lg font-bold text-white mb-1">Inventory Hidden</h3>
                 <p className="text-xs font-mono opacity-60">This user has enabled Ghost Mode.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {inventory.map((item, i) => (
                    <InventoryItem key={i} item={item} onDecrypt={handleDecrypt} />
                 ))}
                 {inventory.length === 0 && <div className="col-span-full text-center py-20 text-gray-500">No items found.</div>}
               </div>
             )
           )}
           
           {/* ... Transactions and Settings Tabs (Same as previous, just ensure MOCK is used) ... */}
           {activeTab === 'SETTINGS' && (
            <div className="rounded-xl border border-white/10 bg-[#0b1a24]/80 p-6 animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
              {/* ... Profile & Socials ... */}
              
              <div className="space-y-4">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2 border-b border-white/5 pb-2"><Settings size={16} className="text-primary"/> System Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ... Auto Decrypt ... */}
                  <div className="flex items-center justify-between group p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => updateSetting('ghostMode', !settings.ghostMode)}>
                    <div className="flex flex-col">
                      <span className="text-gray-300 text-sm font-medium">Ghost Mode</span>
                      <span className="text-[10px] text-gray-500">Hide inventory from public view</span>
                    </div>
                    <div className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", settings.ghostMode ? "bg-primary/20" : "bg-gray-700")}>
                      <span className={cn("inline-block h-4 w-4 transform rounded-full transition-transform", settings.ghostMode ? "translate-x-6 bg-primary shadow-[0_0_10px_#00E5FF]" : "translate-x-1 bg-gray-400")}></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
           )}
        </div>
      </main>
      <AvatarModal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} onSelect={(url) => updateSetting('avatarUrl', url)} />
    </div>
  );
}