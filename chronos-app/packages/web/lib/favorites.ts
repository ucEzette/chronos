// Favorites System - Stored in localStorage for MVP
// Allows users to bookmark/favorite products

const FAVORITES_STORAGE_KEY = 'chronos_favorites';

export interface FavoriteItem {
    itemId: string;
    chainId: number;
    name: string;
    previewUrl: string;
    price: bigint;
    seller: string;
    addedAt: number;
}

// Serialize favorites for storage (BigInt to string)
function serializeFavorites(items: FavoriteItem[]): string {
    return JSON.stringify(items.map(item => ({
        ...item,
        price: item.price.toString()
    })));
}

// Deserialize favorites from storage (string to BigInt)
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

// Get all favorites for a user
export function getFavorites(userAddress: string): FavoriteItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(`${FAVORITES_STORAGE_KEY}_${userAddress.toLowerCase()}`);
    if (!stored) return [];
    return deserializeFavorites(stored);
}

// Add to favorites
export function addFavorite(userAddress: string, item: Omit<FavoriteItem, 'addedAt'>): boolean {
    const favorites = getFavorites(userAddress);

    // Check if already favorited
    if (favorites.some(f => f.itemId === item.itemId && f.chainId === item.chainId)) {
        return false;
    }

    favorites.push({
        ...item,
        addedAt: Date.now()
    });

    localStorage.setItem(
        `${FAVORITES_STORAGE_KEY}_${userAddress.toLowerCase()}`,
        serializeFavorites(favorites)
    );
    return true;
}

// Remove from favorites
export function removeFavorite(userAddress: string, itemId: string, chainId: number): boolean {
    const favorites = getFavorites(userAddress);
    const filtered = favorites.filter(f => !(f.itemId === itemId && f.chainId === chainId));

    if (filtered.length === favorites.length) return false;

    localStorage.setItem(
        `${FAVORITES_STORAGE_KEY}_${userAddress.toLowerCase()}`,
        serializeFavorites(filtered)
    );
    return true;
}

// Check if item is favorited
export function isFavorited(userAddress: string, itemId: string, chainId: number): boolean {
    const favorites = getFavorites(userAddress);
    return favorites.some(f => f.itemId === itemId && f.chainId === chainId);
}

// Toggle favorite
export function toggleFavorite(userAddress: string, item: Omit<FavoriteItem, 'addedAt'>): boolean {
    if (isFavorited(userAddress, item.itemId, item.chainId)) {
        removeFavorite(userAddress, item.itemId, item.chainId);
        return false;
    } else {
        addFavorite(userAddress, item);
        return true;
    }
}
