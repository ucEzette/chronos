"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useBalance, useEnsName, useEnsAvatar, useDisconnect } from "wagmi";
import { formatEther, parseAbiItem, createPublicClient, http } from "viem";
import { Navigation } from "../../../components/Navigation";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "../../../lib/contracts"; // Use Address Map
import { datahaven, arcTestnet } from "../../../lib/chains"; // Import Chains
import { fetchIPFS } from "../../../lib/ipfs";
import { decryptFile } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { ProfileInventory } from "../ProfileInventory";
import { 
  Settings, Power, Copy, Wallet, Activity, Search, 
  CheckCircle2, RefreshCw, Download, Music, Video, FileText, User, 
  Clock, ArrowUpRight, ArrowDownLeft, Code, Twitter, Upload, Edit3, 
  Link as LinkIcon, X, Camera, Shield, Ban, Globe
} from "lucide-react";

// --- MULTI-CHAIN HELPERS ---
const SUPPORTED_CHAINS = [datahaven, arcTestnet];

// Helper to create a client for a specific chain on the fly
const getClientForChain = (chain: any) => createPublicClient({ chain, transport: http() });

const formatTimeAgo = (timestamp: number | undefined) => {
  if (!timestamp) return "Pending...";
  const diff = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const { disconnect } = useDisconnect();
  
  const profileAddress = (params?.address as string) || "";
  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress.toLowerCase();

  // Basic Hooks (Active Chain Only for Balance - optional to aggregate balances too)
  const { data: balanceData } = useBalance({ address: profileAddress as `0x${string}` });
  const { data: ensName } = useEnsName({ address: profileAddress as `0x${string}` });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! });

  // State
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'TRANSACTIONS' | 'SETTINGS'>('INVENTORY');
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reputation, setReputation] = useState(50);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({ displayName: "", avatarUrl: "", twitterHandle: "", ghostMode: false });

  // --- AGGREGATED DATA FETCHING ---
  useEffect(() => {
    if (!profileAddress) return;

    const fetchAllChainData = async () => {
      setIsLoading(true);
      const allItems: any[] = [];
      const allTxs: any[] = [];
      let totalSales = 0;
      let totalCancels = 0;

      try {
        // Iterate over all supported chains
        await Promise.all(SUPPORTED_CHAINS.map(async (chain) => {
          const client = getClientForChain(chain);
          const contractAddr = CONTRACT_ADDRESSES[chain.id];
          
          if(!contractAddr) return;

          // 1. Fetch Items
          try {
            const rawItems = await client.readContract({
              address: contractAddr,
              abi: PAYLOCK_ABI,
              functionName: 'getMarketplaceItems',
            }) as any[];

            // Check ownership for each item on THIS chain
            // We use multicast if possible, but map for simplicity here
            const enrichedItems = await Promise.all(rawItems.map(async (item) => {
              const ownership = await client.readContract({
                address: contractAddr,
                abi: PAYLOCK_ABI,
                functionName: 'checkOwnership',
                args: [item.id, profileAddress as `0x${string}`]
              }) as [boolean, string];

              // If user bought it, add to inventory
              if (ownership[0]) {
                return {
                  ...item,
                  chainId: chain.id,
                  chainName: chain.name,
                  currency: chain.nativeCurrency.symbol,
                  hasKey: !!(ownership[1] && ownership[1].length > 0),
                  receivedKey: ownership[1]
                };
              }
              return null;
            }));
            
            allItems.push(...enrichedItems.filter(Boolean));

            // 2. Fetch Transactions (Logs)
            const currentBlock = await client.getBlockNumber();
            const fromBlock = currentBlock - BigInt(10000) > BigInt(0) ? currentBlock - BigInt(10000) : BigInt(0); // Restrict range for RPC safety

            const [purchases, listings, cancels] = await Promise.all([
              client.getLogs({ 
                address: contractAddr, 
                event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'), 
                args: { buyer: profileAddress as `0x${string}` }, 
                fromBlock 
              }),
              client.getLogs({ 
                address: contractAddr, 
                event: parseAbiItem('event ItemListed(uint256 indexed id, address indexed seller, uint256 price)'), 
                args: { seller: profileAddress as `0x${string}` }, 
                fromBlock 
              }),
              client.getLogs({ 
                address: contractAddr, 
                event: parseAbiItem('event ItemCanceled(uint256 indexed id, address indexed seller)'), 
                args: { seller: profileAddress as `0x${string}` }, 
                fromBlock 
              })
            ]);

            // Calculate Reputation Stats
            const mySales = await client.getLogs({
                address: contractAddr, 
                event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)'), 
                fromBlock 
            });
            // Filter purchases where the item ID matches an item sold by this profile
            const myItemIds = new Set(rawItems.filter((i:any) => i.seller.toLowerCase() === profileAddress.toLowerCase()).map((i:any) => i.id.toString()));
            totalSales += mySales.filter(l => myItemIds.has(l.args.id?.toString() || "")).length;
            totalCancels += cancels.length;

            // Format Txs
            const formatLog = (log: any, type: string) => ({
              type,
              hash: log.transactionHash,
              block: log.blockNumber,
              id: log.args.id?.toString(),
              chainId: chain.id,
              chainSymbol: chain.nativeCurrency.symbol
            });

            allTxs.push(...purchases.map(l => formatLog(l, 'PURCHASE')));
            allTxs.push(...listings.map(l => formatLog(l, 'LISTING')));
            allTxs.push(...cancels.map(l => formatLog(l, 'CANCEL')));

          } catch (err) {
            console.error(`Error fetching chain ${chain.id}:`, err);
          }
        }));

        setInventory(allItems);
        setTransactions(allTxs.sort((a, b) => Number(b.block - a.block)));
        
        // Update Reputation
        let score = 50 + (totalSales * 5) - (totalCancels * 10);
        setReputation(Math.min(Math.max(score, 0), 100));

      } finally {
        setIsLoading(false);
      }
    };

    fetchAllChainData();
  }, [profileAddress]);

  // Handlers
  const handleCopy = () => { navigator.clipboard.writeText(profileAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDecrypt = async (item: any) => {
    try {
      const blob = await fetchIPFS(item.ipfsCid);
      const decryptedBlob = await decryptFile(blob, item.receivedKey);
      const url = window.URL.createObjectURL(decryptedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.name);
      document.body.appendChild(link);
      link.click();
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const displayAvatar = settings.avatarUrl || ensAvatar;
  const userLevel = Math.floor(Math.sqrt(inventory.length)) + 1;

  return (
    <div className="bg-[#020e14] text-white min-h-screen font-display overflow-x-hidden relative">
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
      <Navigation />

      <main className="flex-grow w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* PROFILE SIDEBAR */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="rounded-xl border border-white/10 bg-[#0b1a24]/80 backdrop-blur-md p-6 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary"></div>
            
            <div className="w-32 h-32 rounded-xl bg-black ring-4 ring-white/5 shadow-neon mb-4 overflow-hidden">
               {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-8 text-primary/50" />}
            </div>

            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight truncate w-full">{settings.displayName || "Time Traveler"}</h1>
            <p className="text-primary text-sm font-medium mb-4">Level {userLevel} User</p>

            <div className="w-full bg-black/40 rounded-lg p-3 mb-4 border border-white/5 hover:border-primary/30 transition-colors">
              <button onClick={handleCopy} className="flex justify-between items-center w-full group">
                <code className="text-blue-400 text-xs font-mono truncate mr-2">{profileAddress.slice(0, 10)}...{profileAddress.slice(-8)}</code>
                {copied ? <CheckCircle2 size={14} className="text-green-500"/> : <Copy size={14} className="text-gray-500 group-hover:text-white"/>}
              </button>
            </div>

            {/* Aggregated Stats */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Reputation</p>
                <p className={cn("font-bold font-mono text-sm", reputation > 70 ? "text-green-400" : "text-yellow-400")}>{reputation}/100</p>
              </div>
              <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Artifacts</p>
                <p className="text-white font-bold font-mono text-sm">{inventory.length}</p>
              </div>
            </div>

            {isOwnProfile && <button onClick={() => { if(confirm("Disconnect?")) { disconnect(); router.push("/"); } }} className="w-full py-3 px-4 bg-black/40 hover:bg-red-900/20 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-400 rounded-lg transition-all text-xs font-mono flex items-center justify-center gap-2 group uppercase tracking-widest"><Power size={16}/> Disconnect</button>}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
           
           {/* Tabs */}
           <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-1 border-b border-white/10">
            {['INVENTORY', 'TRANSACTIONS', 'SETTINGS'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-6 py-3 rounded-t-lg font-bold text-xs tracking-wide transition-all border-t border-x", activeTab === tab ? "bg-primary text-black border-primary shadow-[0_-4px_20px_-5px_rgba(0,229,255,0.3)] relative z-10" : "bg-[#0f172a] text-gray-400 hover:text-white border-white/5 hover:bg-white/5")}>{tab}</button>
            ))}
          </div>
           
           {/* Inventory Tab */}
           {activeTab === 'INVENTORY' && (
             <ProfileInventory items={inventory} isLoading={isLoading} onDecrypt={handleDecrypt} />
           )}
           
           {/* Transactions Tab */}
           {activeTab === 'TRANSACTIONS' && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isLoading ? (
                <div className="py-20 text-center"><RefreshCw className="animate-spin mx-auto text-primary"/></div>
              ) : transactions.length > 0 ? (
                transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[#0b1a24]/60 border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded border", 
                        tx.type === 'PURCHASE' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                        tx.type === 'LISTING' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {tx.type === 'PURCHASE' ? <ArrowDownLeft size={18}/> : tx.type === 'LISTING' ? <ArrowUpRight size={18}/> : <Ban size={18}/>}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm flex items-center gap-2">
                          {tx.type} <span className="text-[10px] text-gray-500">#{tx.id}</span>
                          {/* Chain Badge */}
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", tx.chainId === 55931 ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-blue-600/20 text-blue-400 border-blue-600/30")}>
                            {tx.chainId === 55931 ? "DH" : "ARC"}
                          </span>
                        </h4>
                        <p className="text-[10px] text-gray-500 font-mono">{tx.hash.slice(0,12)}...</p>
                      </div>
                    </div>
                    <a href={tx.chainId === 55931 ? `https://testnet.dhscan.io/tx/${tx.hash}` : `https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-primary">
                      Explorer <ArrowUpRight size={14}/>
                    </a>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-gray-500 font-mono text-xs uppercase bg-black/20 rounded-xl border border-white/5 border-dashed">
                  No transaction history found on any chain.
                </div>
              )}
            </div>
           )}

           {/* Settings Tab (Same as before) */}
           {activeTab === 'SETTINGS' && (
             <div className="rounded-xl border border-white/10 bg-[#0b1a24]/80 p-6 animate-in fade-in space-y-8">
               <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                 <h3 className="text-white font-bold mb-2">Local Settings</h3>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-400">Display Name</span>
                   <input className="bg-black/50 border border-white/10 rounded px-2 py-1 text-sm text-white" value={settings.displayName} onChange={e => setSettings({...settings, displayName: e.target.value})} />
                 </div>
               </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}