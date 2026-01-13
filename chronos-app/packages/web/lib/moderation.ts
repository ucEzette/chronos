import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Check if an item has been moderated (hidden or removed)
 */
export async function isItemModerated(itemId: string, chainId: number): Promise<{ moderated: boolean; action?: string }> {
    try {
        const { data, error } = await supabase
            .from("moderated_content")
            .select("action")
            .eq("item_id", itemId)
            .eq("chain_id", chainId)
            .maybeSingle();

        if (error) {
            console.error("Error checking moderation status:", error);
            return { moderated: false };
        }

        return {
            moderated: !!data,
            action: data?.action,
        };
    } catch (err) {
        console.error("Moderation check failed:", err);
        return { moderated: false };
    }
}

/**
 * Check if a user/wallet is banned
 */
export async function isUserBanned(walletAddress: string): Promise<{ banned: boolean; reason?: string; permanent?: boolean }> {
    try {
        const { data, error } = await supabase
            .from("banned_users")
            .select("reason, permanent, expires_at")
            .eq("wallet_address", walletAddress.toLowerCase())
            .maybeSingle();

        if (error) {
            console.error("Error checking ban status:", error);
            return { banned: false };
        }

        if (!data) {
            return { banned: false };
        }

        // Check if temporary ban has expired
        if (!data.permanent && data.expires_at) {
            const expiresAt = new Date(data.expires_at);
            if (expiresAt < new Date()) {
                return { banned: false };
            }
        }

        return {
            banned: true,
            reason: data.reason,
            permanent: data.permanent,
        };
    } catch (err) {
        console.error("Ban check failed:", err);
        return { banned: false };
    }
}

/**
 * Get moderation stats for admin dashboard
 */
export async function getModerationStats(): Promise<{
    pendingReports: number;
    totalModerated: number;
    totalBanned: number;
}> {
    try {
        const [reportsRes, moderatedRes, bannedRes] = await Promise.all([
            supabase.from("content_reports").select("id", { count: "exact" }).eq("status", "pending"),
            supabase.from("moderated_content").select("id", { count: "exact" }),
            supabase.from("banned_users").select("id", { count: "exact" }),
        ]);

        return {
            pendingReports: reportsRes.count || 0,
            totalModerated: moderatedRes.count || 0,
            totalBanned: bannedRes.count || 0,
        };
    } catch (err) {
        console.error("Failed to get moderation stats:", err);
        return { pendingReports: 0, totalModerated: 0, totalBanned: 0 };
    }
}

/**
 * Submit a content report
 */
export async function submitReport(report: {
    itemId: string;
    chainId: number;
    itemName: string;
    sellerAddress: string;
    reporterAddress: string;
    reason: string;
    description?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.from("content_reports").insert({
            item_id: report.itemId,
            chain_id: report.chainId,
            item_name: report.itemName,
            seller_address: report.sellerAddress,
            reporter_address: report.reporterAddress,
            reason: report.reason,
            description: report.description || null,
            status: "pending",
        });

        if (error) {
            // Check for duplicate report
            if (error.code === "23505") {
                return { success: false, error: "You have already reported this item" };
            }
            throw error;
        }

        return { success: true };
    } catch (err: any) {
        console.error("Report submission failed:", err);
        return { success: false, error: err.message || "Failed to submit report" };
    }
}
