"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http, formatEther, parseAbiItem } from "viem";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { datahaven, arcTestnet } from "@/lib/chains";
import { cn } from "@/lib/utils";
import {
    BarChart3, Users, ShoppingCart, Coins, TrendingUp,
    RefreshCw, Activity, Package, DollarSign, ArrowUpRight,
    ArrowDownLeft, Clock, Shield, Zap, Globe, Lock, Eye, EyeOff
} from "lucide-react";

// Admin password from environment variable
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

interface ChainStats {
    chainId: number;
    chainName: string;
    totalListings: number;
    activeListings: number;
    totalSales: number;
    totalVolume: bigint;
    accumulatedFees: bigint;
    serviceFeePercentage: number;
    uniqueSellers: Set<string>;
    uniqueBuyers: Set<string>;
    recentTransactions: Transaction[];
}

interface Transaction {
    type: 'listing' | 'purchase' | 'delivery';
    itemId: string;
    address: string;
    timestamp: number;
    chainId: number;
    value?: bigint;
}

const SUPPORTED_CHAINS = [datahaven, arcTestnet];

export default function AdminDashboard() {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState("");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Dashboard state
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [chainStats, setChainStats] = useState<ChainStats[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Check for existing session on mount
    useEffect(() => {
        const savedAuth = sessionStorage.getItem("oneroad_admin_auth");
        if (savedAuth === "true") {
            setIsAuthenticated(true);
        }
        setIsCheckingAuth(false);
    }, []);

    // Handle login
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setAuthError("");
            sessionStorage.setItem("oneroad_admin_auth", "true");
        } else {
            setAuthError("Invalid password. Please try again.");
        }
    };

    // Handle logout
    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem("oneroad_admin_auth");
    };

    const fetchAnalytics = async () => {
        if (chainStats.length > 0) setIsRefreshing(true);
        else setIsLoading(true);

        const allStats: ChainStats[] = [];

        await Promise.all(SUPPORTED_CHAINS.map(async (chain) => {
            try {
                const client = createPublicClient({ chain, transport: http() });
                const contractAddr = CONTRACT_ADDRESSES[chain.id];
                if (!contractAddr) return;

                // Fetch contract data
                const [items, accumulatedFees, serviceFeePercentage] = await Promise.all([
                    client.readContract({
                        address: contractAddr,
                        abi: PAYLOCK_ABI,
                        functionName: 'getMarketplaceItems',
                    }) as Promise<any[]>,
                    client.readContract({
                        address: contractAddr,
                        abi: PAYLOCK_ABI,
                        functionName: 'accumulatedFees',
                    }) as Promise<bigint>,
                    client.readContract({
                        address: contractAddr,
                        abi: PAYLOCK_ABI,
                        functionName: 'serviceFeePercentage',
                    }) as Promise<bigint>,
                ]);

                // Calculate stats from items
                const uniqueSellers = new Set<string>();
                let totalSales = 0;
                let totalVolume = BigInt(0);
                let activeListings = 0;

                items.forEach((item: any) => {
                    uniqueSellers.add(item.seller.toLowerCase());
                    const soldCount = Number(item.soldCount);
                    totalSales += soldCount;
                    totalVolume += BigInt(soldCount) * item.price;
                    if (item.isActive && !item.isSoldOut) activeListings++;
                });

                // Fetch events for unique buyers
                const uniqueBuyers = new Set<string>();
                const recentTransactions: Transaction[] = [];

                try {
                    const currentBlock = await client.getBlockNumber();
                    const SCAN_DEPTH = BigInt(50000);
                    const fromBlock = currentBlock - SCAN_DEPTH > BigInt(0) ? currentBlock - SCAN_DEPTH : BigInt(0);

                    // Fetch purchase events
                    const purchaseLogs = await client.getLogs({
                        address: contractAddr,
                        event: parseAbiItem('event ItemPurchased(uint256 indexed id, address indexed buyer)') as any,
                        fromBlock,
                        toBlock: currentBlock
                    });

                    purchaseLogs.forEach((log: any) => {
                        if (log.args?.buyer) {
                            uniqueBuyers.add(log.args.buyer.toLowerCase());
                            recentTransactions.push({
                                type: 'purchase',
                                itemId: log.args.id?.toString() || '0',
                                address: log.args.buyer,
                                timestamp: Date.now() / 1000, // Approximate
                                chainId: chain.id
                            });
                        }
                    });

                    // Fetch listing events
                    const listingLogs = await client.getLogs({
                        address: contractAddr,
                        event: parseAbiItem('event ItemListed(uint256 indexed id, address indexed seller, uint256 price, string name, uint256 maxSupply)') as any,
                        fromBlock,
                        toBlock: currentBlock
                    });

                    listingLogs.forEach((log: any) => {
                        if (log.args?.seller) {
                            recentTransactions.push({
                                type: 'listing',
                                itemId: log.args.id?.toString() || '0',
                                address: log.args.seller,
                                timestamp: Date.now() / 1000,
                                chainId: chain.id,
                                value: log.args.price
                            });
                        }
                    });

                } catch (e) {
                    console.warn(`Failed to fetch events for ${chain.name}:`, e);
                }

                allStats.push({
                    chainId: chain.id,
                    chainName: chain.name,
                    totalListings: items.length,
                    activeListings,
                    totalSales,
                    totalVolume,
                    accumulatedFees: accumulatedFees || BigInt(0),
                    serviceFeePercentage: Number(serviceFeePercentage) || 5,
                    uniqueSellers,
                    uniqueBuyers,
                    recentTransactions: recentTransactions.slice(-20).reverse()
                });

            } catch (e) {
                console.error(`Error fetching from ${chain.name}:`, e);
            }
        }));

        setChainStats(allStats);
        setLastUpdated(new Date());
        setIsLoading(false);
        setIsRefreshing(false);
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchAnalytics();
            const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    // Aggregate stats across all chains
    const aggregateStats = {
        totalListings: chainStats.reduce((sum, s) => sum + s.totalListings, 0),
        activeListings: chainStats.reduce((sum, s) => sum + s.activeListings, 0),
        totalSales: chainStats.reduce((sum, s) => sum + s.totalSales, 0),
        totalVolume: chainStats.reduce((sum, s) => sum + s.totalVolume, BigInt(0)),
        accumulatedFees: chainStats.reduce((sum, s) => sum + s.accumulatedFees, BigInt(0)),
        uniqueSellers: new Set(chainStats.flatMap(s => Array.from(s.uniqueSellers))).size,
        uniqueBuyers: new Set(chainStats.flatMap(s => Array.from(s.uniqueBuyers))).size,
    };

    const allTransactions = chainStats.flatMap(s => s.recentTransactions).slice(0, 20);

    // Loading auth check
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <RefreshCw className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    // Login Screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="p-8 rounded-2xl bg-surface border border-white/10 shadow-2xl">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 rounded-xl bg-primary/10 text-primary">
                                <Lock size={32} />
                            </div>
                        </div>

                        <h1 className="text-2xl font-black text-center mb-2">Admin Access</h1>
                        <p className="text-white/40 text-sm text-center mb-6">
                            Enter password to access the dashboard
                        </p>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter admin password"
                                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-all"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {authError && (
                                <p className="text-red-400 text-sm text-center">{authError}</p>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all"
                            >
                                Access Dashboard
                            </button>
                        </form>

                        <p className="text-white/20 text-xs text-center mt-6">
                            Protected by ONEROAD Security
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading analytics
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-primary" size={48} />
                    <p className="text-white/60 font-mono text-sm">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-white font-display flex flex-col">
            <Navigation />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-primary text-xs font-mono uppercase tracking-widest mb-2">
                            <Shield size={14} />
                            Admin Dashboard
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                            Platform Analytics
                        </h1>
                        <p className="text-white/40 text-sm mt-1">
                            Real-time metrics from all connected chains
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {lastUpdated && (
                            <span className="text-xs text-white/40 font-mono">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={fetchAnalytics}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-all text-sm font-bold"
                        >
                            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                            Refresh
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all text-sm font-bold"
                        >
                            <Lock size={14} />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Package}
                        label="Total Listings"
                        value={aggregateStats.totalListings.toString()}
                        subvalue={`${aggregateStats.activeListings} active`}
                        color="cyan"
                    />
                    <StatCard
                        icon={ShoppingCart}
                        label="Total Sales"
                        value={aggregateStats.totalSales.toString()}
                        subvalue="items sold"
                        color="green"
                    />
                    <StatCard
                        icon={Coins}
                        label="Total Volume"
                        value={`${parseFloat(formatEther(aggregateStats.totalVolume)).toFixed(4)}`}
                        subvalue="ETH traded"
                        color="yellow"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Platform Revenue"
                        value={`${parseFloat(formatEther(aggregateStats.accumulatedFees)).toFixed(4)}`}
                        subvalue="ETH in fees"
                        color="purple"
                    />
                </div>

                {/* Users Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="p-6 rounded-2xl bg-surface border border-white/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <Users size={20} />
                            </div>
                            <h3 className="font-bold text-lg">User Metrics</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-3xl font-black text-white">{aggregateStats.uniqueSellers}</p>
                                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Unique Sellers</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-3xl font-black text-white">{aggregateStats.uniqueBuyers}</p>
                                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Unique Buyers</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-surface border border-white/10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                                <Globe size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Chain Breakdown</h3>
                        </div>
                        <div className="space-y-3">
                            {chainStats.map((stat) => (
                                <div key={stat.chainId} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "size-2 rounded-full",
                                            stat.chainId === 55931 ? "bg-cyan-400" : "bg-blue-400"
                                        )} />
                                        <span className="text-sm font-medium">{stat.chainName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-mono text-white">{stat.totalListings} listings</span>
                                        <span className="text-xs text-white/40 ml-2">• {stat.totalSales} sales</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fee Configuration */}
                <div className="p-6 rounded-2xl bg-surface border border-white/10 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <Zap size={20} />
                        </div>
                        <h3 className="font-bold text-lg">Fee Configuration</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {chainStats.map((stat) => (
                            <div key={stat.chainId} className="p-4 rounded-xl bg-white/5">
                                <p className="text-xs text-white/40 uppercase mb-1">{stat.chainName}</p>
                                <p className="text-2xl font-black text-primary">{stat.serviceFeePercentage}%</p>
                                <p className="text-xs text-white/40 mt-1">Service Fee</p>
                                <p className="text-sm font-mono text-white/60 mt-2">
                                    Collected: {parseFloat(formatEther(stat.accumulatedFees)).toFixed(4)} ETH
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="p-6 rounded-2xl bg-surface border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                                <Activity size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Recent Activity</h3>
                        </div>
                        <span className="text-xs text-white/40">{allTransactions.length} events</span>
                    </div>

                    {allTransactions.length === 0 ? (
                        <p className="text-center text-white/40 py-8">No recent transactions found</p>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {allTransactions.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            tx.type === 'listing' ? "bg-blue-500/10 text-blue-400" :
                                                tx.type === 'purchase' ? "bg-green-500/10 text-green-400" :
                                                    "bg-purple-500/10 text-purple-400"
                                        )}>
                                            {tx.type === 'listing' ? <ArrowUpRight size={14} /> :
                                                tx.type === 'purchase' ? <ShoppingCart size={14} /> :
                                                    <ArrowDownLeft size={14} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium capitalize">{tx.type}</p>
                                            <p className="text-xs text-white/40 font-mono">
                                                {tx.address.slice(0, 6)}...{tx.address.slice(-4)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-white/60">Item #{tx.itemId}</p>
                                        <p className="text-xs text-white/40">
                                            {tx.chainId === 55931 ? "DataHaven" : "Arc"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subvalue, color }: {
    icon: any;
    label: string;
    value: string;
    subvalue: string;
    color: 'cyan' | 'green' | 'yellow' | 'purple';
}) {
    const colorClasses = {
        cyan: "bg-cyan-500/10 text-cyan-400",
        green: "bg-green-500/10 text-green-400",
        yellow: "bg-yellow-500/10 text-yellow-400",
        purple: "bg-purple-500/10 text-purple-400",
    };

    return (
        <div className="p-5 rounded-2xl bg-surface border border-white/10 hover:border-white/20 transition-all">
            <div className={cn("p-2 rounded-lg w-fit mb-3", colorClasses[color])}>
                <Icon size={18} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-white">{value}</p>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">{label}</p>
            <p className="text-xs text-white/60 mt-0.5">{subvalue}</p>
        </div>
    );
}
