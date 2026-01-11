// Favorites System - Supabase with localStorage fallback
import { getSupabase, isSupabaseConfigured } from './supabase';

const FAVORITES_STORAGE_KEY = 'oneroad_favorites';

export interface FavoriteItem {
    itemId: string;
    chainId: number;
    name: string;
    previewUrl: string;
    price: bigint;
    seller: string;
    addedAt: number;
}

// ====== LOCAL STORAGE HELPERS ======
function serializeFavorites(items: FavoriteItem[]): string {
    return JSON.stringify(items.map(item => ({
        ...item,
        price: item.price.toString()
    })));
}

function deserializeFavorites(data: string): FavoriteItem[] {
    try {
        const parsed = JSON.parse(data);
        return parsed.map((item: any) => ({
            ...item,
            price: BigInt(item.price)
        }));
    } catch {
        return [];
    }
}

function getLocalFavorites(userAddress: string): FavoriteItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(`${FAVORITES_STORAGE_KEY}_${userAddress.toLowerCase()}`);
    if (!stored) return [];
    return deserializeFavorites(stored);
}

function saveLocalFavorites(userAddress: string, favorites: FavoriteItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
        `${FAVORITES_STORAGE_KEY}_${userAddress.toLowerCase()}`,
        serializeFavorites(favorites)
    );
}

// ====== SUPABASE FUNCTIONS ======

// Get all favorites for a user
export async function getFavorites(userAddress: string): Promise<FavoriteItem[]> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('*')
                .eq('wallet_address', userAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (!error && data) {
                return data.map(f => ({
                    itemId: f.item_id,
                    chainId: f.chain_id,
                    name: f.name || '',
                    previewUrl: f.preview_url || '',
                    price: BigInt(f.price || '0'),
                    seller: f.seller || '',
                    addedAt: new Date(f.created_at).getTime()
                }));
            }
        } catch (e) {
            console.warn('Supabase fetch failed, using localStorage:', e);
        }
    }

    return getLocalFavorites(userAddress);
}

// Add to favorites
export async function addFavorite(userAddress: string, item: Omit<FavoriteItem, 'addedAt'>): Promise<boolean> {
    const newItem: FavoriteItem = {
        ...item,
        addedAt: Date.now()
    };

    // Save to localStorage as backup
    const localFavorites = getLocalFavorites(userAddress);
    if (localFavorites.some(f => f.itemId === item.itemId && f.chainId === item.chainId)) {
        return false; // Already exists
    }
    localFavorites.push(newItem);
    saveLocalFavorites(userAddress, localFavorites);

    // Try to save to Supabase
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
        try {
            await supabase
                .from('favorites')
                .upsert({
                    wallet_address: userAddress.toLowerCase(),
                    item_id: item.itemId,
                    chain_id: item.chainId,
                    name: item.name,
                    preview_url: item.previewUrl,
                    price: item.price.toString(),
                    seller: item.seller
                }, {
                    onConflict: 'wallet_address,item_id,chain_id'
                });
        } catch (e) {
            console.error('Failed to save favorite to Supabase:', e);
        }
    }

    return true;
}

// Remove from favorites
export async function removeFavorite(userAddress: string, itemId: string, chainId: number): Promise<boolean> {
    // Remove from localStorage
    const localFavorites = getLocalFavorites(userAddress);
    const filtered = localFavorites.filter(f => !(f.itemId === itemId && f.chainId === chainId));
    saveLocalFavorites(userAddress, filtered);

    // Try to remove from Supabase
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
        try {
            await supabase
                .from('favorites')
                .delete()
                .eq('wallet_address', userAddress.toLowerCase())
                .eq('item_id', itemId)
                .eq('chain_id', chainId);
        } catch (e) {
            console.error('Failed to remove favorite from Supabase:', e);
        }
    }

    return filtered.length !== localFavorites.length;
}

// Check if item is favorited
export async function isFavorited(userAddress: string, itemId: string, chainId: number): Promise<boolean> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('id')
                .eq('wallet_address', userAddress.toLowerCase())
                .eq('item_id', itemId)
                .eq('chain_id', chainId)
                .single();

            if (!error && data) return true;
            return false;
        } catch {
            // Not found
        }
    }

    const favorites = getLocalFavorites(userAddress);
    return favorites.some(f => f.itemId === itemId && f.chainId === chainId);
}

// Toggle favorite
export async function toggleFavorite(userAddress: string, item: Omit<FavoriteItem, 'addedAt'>): Promise<boolean> {
    const favorited = await isFavorited(userAddress, item.itemId, item.chainId);

    if (favorited) {
        await removeFavorite(userAddress, item.itemId, item.chainId);
        return false;
    } else {
        await addFavorite(userAddress, item);
        return true;
    }
}

// ====== SYNC FUNCTIONS (for backwards compatibility) ======
export function getFavoritesSync(userAddress: string): FavoriteItem[] {
    return getLocalFavorites(userAddress);
}

export function isFavoritedSync(userAddress: string, itemId: string, chainId: number): boolean {
    const favorites = getLocalFavorites(userAddress);
    return favorites.some(f => f.itemId === itemId && f.chainId === chainId);
}

export function toggleFavoriteSync(userAddress: string, item: Omit<FavoriteItem, 'addedAt'>): boolean {
    const favorited = isFavoritedSync(userAddress, item.itemId, item.chainId);

    if (favorited) {
        const favorites = getLocalFavorites(userAddress);
        saveLocalFavorites(userAddress, favorites.filter(f => !(f.itemId === item.itemId && f.chainId === item.chainId)));

        // Also try Supabase in background
        const supabase = getSupabase();
        if (isSupabaseConfigured() && supabase) {
            supabase.from('favorites')
                .delete()
                .eq('wallet_address', userAddress.toLowerCase())
                .eq('item_id', item.itemId)
                .eq('chain_id', item.chainId)
                .then(() => { });
        }
        return false;
    } else {
        const favorites = getLocalFavorites(userAddress);
        favorites.push({ ...item, addedAt: Date.now() });
        saveLocalFavorites(userAddress, favorites);

        // Also try Supabase in background
        const supabase = getSupabase();
        if (isSupabaseConfigured() && supabase) {
            supabase.from('favorites')
                .upsert({
                    wallet_address: userAddress.toLowerCase(),
                    item_id: item.itemId,
                    chain_id: item.chainId,
                    name: item.name,
                    preview_url: item.previewUrl,
                    price: item.price.toString(),
                    seller: item.seller
                }, { onConflict: 'wallet_address,item_id,chain_id' })
                .then(() => { });
        }
        return true;
    }
}
