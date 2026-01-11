import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
    return Boolean(
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl.startsWith('https://') &&
        supabaseAnonKey.length > 10
    );
}

// Create client only if configured, otherwise return null
let _supabase: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
    _supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
    });
}

// Export as getter function to avoid build-time errors
export function getSupabase(): SupabaseClient | null {
    return _supabase;
}

// Convenience export (may be null if not configured)
export const supabase = _supabase;

// Database types
export interface DbNotification {
    id: string;
    wallet_address: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    read: boolean;
    created_at: string;
}

export interface DbProfile {
    id: string;
    wallet_address: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
}

export interface DbFavorite {
    id: string;
    wallet_address: string;
    item_id: string;
    created_at: string;
}

export interface DbReview {
    id: string;
    item_id: string;
    wallet_address: string;
    rating: number;
    comment: string | null;
    created_at: string;
}
