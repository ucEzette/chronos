"use client";

import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import {
    Shield, Flag, Eye, EyeOff, Ban, CheckCircle, XCircle,
    AlertTriangle, Clock, Search, Filter, RefreshCw,
    ChevronDown, ExternalLink, Loader2, Trash2, UserX
} from "lucide-react";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

interface Report {
    id: string;
    item_id: string;
    chain_id: number;
    item_name: string;
    seller_address: string;
    reporter_address: string;
    reason: string;
    description: string | null;
    status: "pending" | "reviewing" | "approved" | "rejected" | "actioned";
    action_taken: string | null;
    admin_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
}

interface ModeratedItem {
    id: string;
    item_id: string;
    chain_id: number;
    action: "hidden" | "removed";
    reason: string;
    moderated_by: string;
    created_at: string;
}

interface BannedUser {
    id: string;
    wallet_address: string;
    reason: string;
    banned_by: string;
    permanent: boolean;
    expires_at: string | null;
    created_at: string;
}

const REASON_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    scam: { label: "Scam", color: "red", icon: "🚨" },
    nsfw: { label: "NSFW", color: "pink", icon: "🔞" },
    illegal: { label: "Illegal", color: "orange", icon: "⚠️" },
    copyright: { label: "Copyright", color: "yellow", icon: "©️" },
    spam: { label: "Spam", color: "gray", icon: "📧" },
    other: { label: "Other", color: "blue", icon: "❓" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "yellow" },
    reviewing: { label: "Reviewing", color: "blue" },
    approved: { label: "Approved", color: "green" },
    rejected: { label: "Rejected", color: "gray" },
    actioned: { label: "Actioned", color: "purple" },
};

export default function ModerationPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");

    const [activeTab, setActiveTab] = useState<"reports" | "moderated" | "banned">("reports");
    const [reports, setReports] = useState<Report[]>([]);
    const [moderatedItems, setModeratedItems] = useState<ModeratedItem[]>([]);
    const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [reasonFilter, setReasonFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [actionNotes, setActionNotes] = useState("");
    const [isActioning, setIsActioning] = useState(false);

    // Auth handler
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setAuthError("");
        } else {
            setAuthError("Invalid password");
        }
    };

    // Fetch reports
    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from("content_reports")
                .select("*")
                .order("created_at", { ascending: false });

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }
            if (reasonFilter !== "all") {
                query = query.eq("reason", reasonFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error("Failed to fetch reports:", err);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, reasonFilter]);

    // Fetch moderated items
    const fetchModeratedItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("moderated_content")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setModeratedItems(data || []);
        } catch (err) {
            console.error("Failed to fetch moderated items:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch banned users
    const fetchBannedUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("banned_users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setBannedUsers(data || []);
        } catch (err) {
            console.error("Failed to fetch banned users:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            if (activeTab === "reports") fetchReports();
            else if (activeTab === "moderated") fetchModeratedItems();
            else if (activeTab === "banned") fetchBannedUsers();
        }
    }, [isAuthenticated, activeTab, fetchReports, fetchModeratedItems, fetchBannedUsers]);

    // Take action on report
    const handleAction = async (action: "approve" | "reject" | "hide" | "remove" | "ban") => {
        if (!selectedReport) return;
        setIsActioning(true);

        try {
            // Update report status
            const newStatus = action === "reject" ? "rejected" : "actioned";
            const actionTaken = action === "approve" ? "none" : action === "hide" ? "hidden" : action === "remove" ? "removed" : action === "ban" ? "banned" : "none";

            await supabase
                .from("content_reports")
                .update({
                    status: newStatus,
                    action_taken: actionTaken,
                    admin_notes: actionNotes || null,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: "admin",
                })
                .eq("id", selectedReport.id);

            // If hiding or removing, add to moderated_content
            if (action === "hide" || action === "remove") {
                await supabase.from("moderated_content").upsert({
                    item_id: selectedReport.item_id,
                    chain_id: selectedReport.chain_id,
                    action: action === "hide" ? "hidden" : "removed",
                    reason: selectedReport.reason,
                    report_id: selectedReport.id,
                    moderated_by: "admin",
                });
            }

            // If banning user
            if (action === "ban") {
                await supabase.from("banned_users").upsert({
                    wallet_address: selectedReport.seller_address,
                    reason: `Report: ${selectedReport.reason}`,
                    report_id: selectedReport.id,
                    banned_by: "admin",
                    permanent: true,
                });
            }

            setSelectedReport(null);
            setActionNotes("");
            fetchReports();
        } catch (err) {
            console.error("Action failed:", err);
        } finally {
            setIsActioning(false);
        }
    };

    // Remove moderation
    const handleUnmoderate = async (item: ModeratedItem) => {
        try {
            await supabase.from("moderated_content").delete().eq("id", item.id);
            fetchModeratedItems();
        } catch (err) {
            console.error("Failed to unmoderate:", err);
        }
    };

    // Unban user
    const handleUnban = async (user: BannedUser) => {
        try {
            await supabase.from("banned_users").delete().eq("id", user.id);
            fetchBannedUsers();
        } catch (err) {
            console.error("Failed to unban:", err);
        }
    };

    // Filter reports by search
    const filteredReports = reports.filter((r) =>
        searchQuery
            ? r.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.seller_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.reporter_address?.toLowerCase().includes(searchQuery.toLowerCase())
            : true
    );

    // Login screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <form onSubmit={handleLogin} className="w-full max-w-sm p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="text-red-500" size={32} />
                        <h1 className="text-2xl font-bold">Moderation Panel</h1>
                    </div>

                    <input
                        type="password"
                        placeholder="Admin Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none mb-4"
                    />

                    {authError && (
                        <p className="text-red-400 text-sm mb-4">{authError}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 font-bold transition-colors"
                    >
                        Access Panel
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navigation />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-red-500/10">
                            <Shield className="text-red-500" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Content Moderation</h1>
                            <p className="text-white/50 text-sm">Review reported content and take action</p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (activeTab === "reports") fetchReports();
                            else if (activeTab === "moderated") fetchModeratedItems();
                            else fetchBannedUsers();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
                    {[
                        { key: "reports", label: "Reports", icon: Flag, count: reports.filter((r) => r.status === "pending").length },
                        { key: "moderated", label: "Moderated", icon: EyeOff, count: moderatedItems.length },
                        { key: "banned", label: "Banned Users", icon: Ban, count: bannedUsers.length },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.key
                                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                    : "hover:bg-white/5"
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Reports Tab */}
                {activeTab === "reports" && (
                    <>
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by item, seller, or reporter..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-sm"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="reviewing">Reviewing</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="actioned">Actioned</option>
                            </select>

                            <select
                                value={reasonFilter}
                                onChange={(e) => setReasonFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none"
                            >
                                <option value="all">All Reasons</option>
                                <option value="scam">Scam</option>
                                <option value="nsfw">NSFW</option>
                                <option value="illegal">Illegal</option>
                                <option value="copyright">Copyright</option>
                                <option value="spam">Spam</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Reports List */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="text-center py-12 text-white/40">
                                <Flag size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No reports found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredReports.map((report) => (
                                    <div
                                        key={report.id}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedReport?.id === report.id
                                                ? "border-red-500/50 bg-red-500/5"
                                                : "border-white/10 hover:border-white/20 bg-white/5"
                                            }`}
                                        onClick={() => setSelectedReport(report)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-lg">{REASON_LABELS[report.reason]?.icon}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${REASON_LABELS[report.reason]?.color}-500/20 text-${REASON_LABELS[report.reason]?.color}-400`}>
                                                        {REASON_LABELS[report.reason]?.label}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${STATUS_LABELS[report.status]?.color}-500/20 text-${STATUS_LABELS[report.status]?.color}-400`}>
                                                        {STATUS_LABELS[report.status]?.label}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold truncate mb-1">{report.item_name || `Item #${report.item_id}`}</h4>

                                                <div className="flex flex-wrap gap-4 text-xs text-white/50">
                                                    <span>Seller: {report.seller_address?.slice(0, 8)}...</span>
                                                    <span>Reporter: {report.reporter_address?.slice(0, 8)}...</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {new Date(report.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {report.description && (
                                                    <p className="mt-2 text-sm text-white/60 line-clamp-2">{report.description}</p>
                                                )}
                                            </div>

                                            <ChevronDown
                                                className={`text-white/40 transition-transform ${selectedReport?.id === report.id ? "rotate-180" : ""
                                                    }`}
                                                size={20}
                                            />
                                        </div>

                                        {/* Expanded actions */}
                                        {selectedReport?.id === report.id && report.status === "pending" && (
                                            <div className="mt-4 pt-4 border-t border-white/10">
                                                <textarea
                                                    placeholder="Admin notes (optional)..."
                                                    value={actionNotes}
                                                    onChange={(e) => setActionNotes(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full p-3 rounded-lg bg-black/50 border border-white/10 text-sm mb-3 focus:outline-none resize-none h-20"
                                                />

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction("reject"); }}
                                                        disabled={isActioning}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 text-sm font-medium transition-colors"
                                                    >
                                                        <XCircle size={16} />
                                                        Dismiss
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction("approve"); }}
                                                        disabled={isActioning}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Approve (No Action)
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction("hide"); }}
                                                        disabled={isActioning}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-sm font-medium transition-colors"
                                                    >
                                                        <EyeOff size={16} />
                                                        Hide Content
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction("remove"); }}
                                                        disabled={isActioning}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                        Remove
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction("ban"); }}
                                                        disabled={isActioning}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium transition-colors"
                                                    >
                                                        <UserX size={16} />
                                                        Ban Seller
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Moderated Tab */}
                {activeTab === "moderated" && (
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : moderatedItems.length === 0 ? (
                            <div className="text-center py-12 text-white/40">
                                <EyeOff size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No moderated content</p>
                            </div>
                        ) : (
                            moderatedItems.map((item) => (
                                <div key={item.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.action === "hidden" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {item.action === "hidden" ? "HIDDEN" : "REMOVED"}
                                            </span>
                                            <span className="text-xs text-white/40">Chain: {item.chain_id}</span>
                                        </div>
                                        <p className="font-medium">Item #{item.item_id}</p>
                                        <p className="text-xs text-white/50">{new Date(item.created_at).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => handleUnmoderate(item)}
                                        className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium"
                                    >
                                        Restore
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Banned Tab */}
                {activeTab === "banned" && (
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : bannedUsers.length === 0 ? (
                            <div className="text-center py-12 text-white/40">
                                <Ban size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No banned users</p>
                            </div>
                        ) : (
                            bannedUsers.map((user) => (
                                <div key={user.id} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">
                                                {user.permanent ? "PERMANENT BAN" : "TEMP BAN"}
                                            </span>
                                        </div>
                                        <p className="font-mono text-sm">{user.wallet_address}</p>
                                        <p className="text-xs text-white/50">{user.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => handleUnban(user)}
                                        className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium"
                                    >
                                        Unban
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
