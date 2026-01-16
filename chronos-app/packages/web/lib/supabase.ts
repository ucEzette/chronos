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
        auth: {
            flowType: 'implicit',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
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

export interface DbSellerSettings {
    id: string;
    wallet_address: string;
    item_name: string;
    encryption_key: string;
    auto_deliver: boolean;
    chain_id: number;
    created_at: string;
}

// ====== SELLER SETTINGS FUNCTIONS ======

// Save seller key and settings (with localStorage fallback)
export async function saveSellerSettings(
    walletAddress: string,
    itemName: string,
    encryptionKey: string,
    autoDeliver: boolean,
    chainId: number
): Promise<boolean> {
    // Always save to localStorage as backup
    const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
    localKeys[itemName.trim()] = encryptionKey;
    localStorage.setItem('chronos_seller_keys', JSON.stringify(localKeys));

    const autoDeliverItems = JSON.parse(localStorage.getItem('oneroad_auto_deliver') || '{}');
    autoDeliverItems[itemName.trim()] = autoDeliver;
    localStorage.setItem('oneroad_auto_deliver', JSON.stringify(autoDeliverItems));

    // Try to save to Supabase if configured
    if (!isSupabaseConfigured() || !_supabase) {
        return true; // Fallback to localStorage only
    }

    try {
        const { error } = await _supabase
            .from('seller_settings')
            .upsert({
                wallet_address: walletAddress.toLowerCase(),
                item_name: itemName.trim(),
                encryption_key: encryptionKey,
                auto_deliver: autoDeliver,
                chain_id: chainId
            }, {
                onConflict: 'wallet_address,item_name'
            });

        if (error) {
            console.error('Supabase save error:', error);
            return true; // Still return true because localStorage saved
        }
        return true;
    } catch (e) {
        console.error('Error saving to Supabase:', e);
        return true; // Fallback worked
    }
}

// Get seller settings (Supabase first, then localStorage fallback)
export async function getSellerSettings(
    walletAddress: string,
    itemName: string
): Promise<{ encryptionKey: string | null; autoDeliver: boolean }> {
    // Try Supabase first
    if (isSupabaseConfigured() && _supabase) {
        try {
            const { data, error } = await _supabase
                .from('seller_settings')
                .select('encryption_key, auto_deliver')
                .eq('wallet_address', walletAddress.toLowerCase())
                .eq('item_name', itemName.trim())
                .single();

            if (!error && data) {
                return {
                    encryptionKey: data.encryption_key,
                    autoDeliver: data.auto_deliver
                };
            }
        } catch (e) {
            console.warn('Supabase fetch failed, using localStorage:', e);
        }
    }

    // Fallback to localStorage
    const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
    const autoDeliverItems = JSON.parse(localStorage.getItem('oneroad_auto_deliver') || '{}');

    return {
        encryptionKey: localKeys[itemName.trim()] || null,
        autoDeliver: autoDeliverItems[itemName.trim()] || false
    };
}

// Check if auto-deliver is enabled for an item
export async function isAutoDeliverEnabled(
    walletAddress: string,
    itemName: string
): Promise<boolean> {
    const settings = await getSellerSettings(walletAddress, itemName);
    return settings.autoDeliver;
}

// Get encryption key for an item
export async function getEncryptionKey(
    walletAddress: string,
    itemName: string
): Promise<string | null> {
    const settings = await getSellerSettings(walletAddress, itemName);
    return settings.encryptionKey;
}

// Get all seller settings for a wallet (for dashboard)
export async function getAllSellerSettings(
    walletAddress: string
): Promise<DbSellerSettings[]> {
    if (isSupabaseConfigured() && _supabase) {
        try {
            const { data, error } = await _supabase
                .from('seller_settings')
                .select('*')
                .eq('wallet_address', walletAddress.toLowerCase());

            if (!error && data) {
                return data;
            }
        } catch (e) {
            console.warn('Failed to fetch seller settings:', e);
        }
    }

    // Fallback: construct from localStorage
    const localKeys = JSON.parse(localStorage.getItem('chronos_seller_keys') || '{}');
    const autoDeliverItems = JSON.parse(localStorage.getItem('oneroad_auto_deliver') || '{}');

    return Object.entries(localKeys).map(([itemName, key]) => ({
        id: itemName,
        wallet_address: walletAddress.toLowerCase(),
        item_name: itemName,
        encryption_key: key as string,
        auto_deliver: autoDeliverItems[itemName] || false,
        chain_id: 0,
        created_at: new Date().toISOString()
    }));
}

// ====== USER PROFILE FUNCTIONS ======

export interface UserProfile {
    walletAddress: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    twitter: string | null;
    discord: string | null;
    website: string | null;
}

const PROFILE_STORAGE_KEY = 'chronos_profile';

// Get local profile
function getLocalProfile(walletAddress: string): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(`${PROFILE_STORAGE_KEY}_${walletAddress.toLowerCase()}`);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

// Save local profile
function saveLocalProfile(walletAddress: string, profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
        `${PROFILE_STORAGE_KEY}_${walletAddress.toLowerCase()}`,
        JSON.stringify(profile)
    );
}

// Get user profile (Supabase first, then localStorage)
export async function getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured() && _supabase) {
        try {
            const { data, error } = await _supabase
                .from('profiles')
                .select('*')
                .eq('wallet_address', walletAddress.toLowerCase())
                .single();

            if (!error && data) {
                return {
                    walletAddress: data.wallet_address,
                    displayName: data.display_name,
                    avatarUrl: data.avatar_url,
                    bio: data.bio,
                    twitter: data.twitter,
                    discord: data.discord,
                    website: data.website
                };
            }
        } catch (e) {
            console.warn('Supabase profile fetch failed:', e);
        }
    }

    return getLocalProfile(walletAddress);
}

// Save user profile
export async function saveUserProfile(
    walletAddress: string,
    profile: Partial<Omit<UserProfile, 'walletAddress'>>
): Promise<boolean> {
    const currentProfile = await getUserProfile(walletAddress) || {
        walletAddress,
        displayName: null,
        avatarUrl: null,
        bio: null,
        twitter: null,
        discord: null,
        website: null
    };

    const updatedProfile: UserProfile = {
        ...currentProfile,
        ...profile,
        walletAddress
    };

    // Save to localStorage as backup
    saveLocalProfile(walletAddress, updatedProfile);

    // Try to save to Supabase
    if (isSupabaseConfigured() && _supabase) {
        try {
            const { error } = await _supabase
                .from('profiles')
                .upsert({
                    wallet_address: walletAddress.toLowerCase(),
                    display_name: updatedProfile.displayName,
                    avatar_url: updatedProfile.avatarUrl,
                    bio: updatedProfile.bio,
                    twitter: updatedProfile.twitter,
                    discord: updatedProfile.discord,
                    website: updatedProfile.website
                }, {
                    onConflict: 'wallet_address'
                });

            if (error) {
                console.error('Supabase profile save error:', error);
            }
            return true;
        } catch (e) {
            console.error('Failed to save profile to Supabase:', e);
        }
    }

    return true;
}

// Update avatar
export async function updateUserAvatar(walletAddress: string, avatarUrl: string): Promise<boolean> {
    return saveUserProfile(walletAddress, { avatarUrl });
}

// Update bio
export async function updateUserBio(walletAddress: string, bio: string): Promise<boolean> {
    return saveUserProfile(walletAddress, { bio });
}

// Update socials
export async function updateUserSocials(
    walletAddress: string,
    socials: { twitter?: string; discord?: string; website?: string }
): Promise<boolean> {
    return saveUserProfile(walletAddress, socials);
}

// Sync function for backwards compatibility
export function getUserProfileSync(walletAddress: string): UserProfile | null {
    return getLocalProfile(walletAddress);
}
