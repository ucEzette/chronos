// Reviews System - Supabase with localStorage fallback
import { getSupabase, isSupabaseConfigured } from './supabase';

export interface Review {
    id: string;
    itemId: string;
    chainId: number;
    buyerAddress: string;
    sellerAddress: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment: string;
    timestamp: number;
}

const REVIEWS_STORAGE_KEY = 'oneroad_reviews';

// ====== LOCAL STORAGE HELPERS ======
function getLocalReviews(): Review[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveLocalReviews(reviews: Review[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
}

// ====== SUPABASE FUNCTIONS ======

// Get all reviews (Supabase first, then localStorage fallback)
export async function getAllReviews(): Promise<Review[]> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                return data.map(r => ({
                    id: r.id,
                    itemId: r.item_id,
                    chainId: r.chain_id,
                    buyerAddress: r.wallet_address,
                    sellerAddress: r.seller_address || '',
                    rating: r.rating as 1 | 2 | 3 | 4 | 5,
                    comment: r.comment || '',
                    timestamp: new Date(r.created_at).getTime()
                }));
            }
        } catch (e) {
            console.warn('Supabase fetch failed, using localStorage:', e);
        }
    }

    return getLocalReviews();
}

// Get reviews for a specific item
export async function getItemReviews(itemId: string, chainId: number): Promise<Review[]> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('item_id', itemId)
                .eq('chain_id', chainId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                return data.map(r => ({
                    id: r.id,
                    itemId: r.item_id,
                    chainId: r.chain_id,
                    buyerAddress: r.wallet_address,
                    sellerAddress: r.seller_address || '',
                    rating: r.rating as 1 | 2 | 3 | 4 | 5,
                    comment: r.comment || '',
                    timestamp: new Date(r.created_at).getTime()
                }));
            }
        } catch (e) {
            console.warn('Supabase fetch failed:', e);
        }
    }

    return getLocalReviews().filter(r => r.itemId === itemId && r.chainId === chainId);
}

// Get reviews for a specific seller
export async function getSellerReviews(sellerAddress: string): Promise<Review[]> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('seller_address', sellerAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (!error && data) {
                return data.map(r => ({
                    id: r.id,
                    itemId: r.item_id,
                    chainId: r.chain_id,
                    buyerAddress: r.wallet_address,
                    sellerAddress: r.seller_address || '',
                    rating: r.rating as 1 | 2 | 3 | 4 | 5,
                    comment: r.comment || '',
                    timestamp: new Date(r.created_at).getTime()
                }));
            }
        } catch (e) {
            console.warn('Supabase fetch failed:', e);
        }
    }

    return getLocalReviews().filter(r => r.sellerAddress.toLowerCase() === sellerAddress.toLowerCase());
}

// Get average rating for an item
export async function getItemAverageRating(itemId: string, chainId: number): Promise<{ average: number; count: number }> {
    const reviews = await getItemReviews(itemId, chainId);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
}

// Get average rating for a seller
export async function getSellerAverageRating(sellerAddress: string): Promise<{ average: number; count: number }> {
    const reviews = await getSellerReviews(sellerAddress);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
}

// Check if buyer has already reviewed an item
export async function hasReviewed(itemId: string, chainId: number, buyerAddress: string): Promise<boolean> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('id')
                .eq('item_id', itemId)
                .eq('chain_id', chainId)
                .eq('wallet_address', buyerAddress.toLowerCase())
                .single();

            if (!error && data) return true;
            return false;
        } catch {
            // Not found or error
        }
    }

    const reviews = getLocalReviews();
    return reviews.some(
        r => r.itemId === itemId && r.chainId === chainId && r.buyerAddress.toLowerCase() === buyerAddress.toLowerCase()
    );
}

// Add a new review
export async function addReview(review: Omit<Review, 'id' | 'timestamp'>): Promise<Review> {
    const newReview: Review = {
        ...review,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now()
    };

    // Save to localStorage as backup
    const localReviews = getLocalReviews();
    localReviews.push(newReview);
    saveLocalReviews(localReviews);

    // Try to save to Supabase
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .insert({
                    item_id: review.itemId,
                    chain_id: review.chainId,
                    wallet_address: review.buyerAddress.toLowerCase(),
                    seller_address: review.sellerAddress.toLowerCase(),
                    rating: review.rating,
                    comment: review.comment
                })
                .select()
                .single();

            if (!error && data) {
                newReview.id = data.id;
            }
        } catch (e) {
            console.error('Failed to save review to Supabase:', e);
        }
    }

    return newReview;
}

// Delete a review (only buyer can delete)
export async function deleteReview(reviewId: string, buyerAddress: string): Promise<boolean> {
    const supabase = getSupabase();

    if (isSupabaseConfigured() && supabase) {
        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewId)
                .eq('wallet_address', buyerAddress.toLowerCase());

            if (!error) {
                // Also remove from localStorage
                const reviews = getLocalReviews();
                saveLocalReviews(reviews.filter(r => r.id !== reviewId));
                return true;
            }
        } catch (e) {
            console.error('Failed to delete review from Supabase:', e);
        }
    }

    // Fallback to localStorage
    const reviews = getLocalReviews();
    const review = reviews.find(r => r.id === reviewId);

    if (!review || review.buyerAddress.toLowerCase() !== buyerAddress.toLowerCase()) {
        return false;
    }

    saveLocalReviews(reviews.filter(r => r.id !== reviewId));
    return true;
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString();
}

// ====== SYNC FUNCTIONS (for migration) ======
export function getLocalReviewsSync(): Review[] {
    return getLocalReviews();
}

export function getItemReviewsSync(itemId: string, chainId: number): Review[] {
    return getLocalReviews().filter(r => r.itemId === itemId && r.chainId === chainId);
}

export function hasReviewedSync(itemId: string, chainId: number, buyerAddress: string): boolean {
    return getLocalReviews().some(
        r => r.itemId === itemId && r.chainId === chainId && r.buyerAddress.toLowerCase() === buyerAddress.toLowerCase()
    );
}

export function getItemAverageRatingSync(itemId: string, chainId: number): { average: number; count: number } {
    const reviews = getLocalReviews().filter(r => r.itemId === itemId && r.chainId === chainId);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
}
