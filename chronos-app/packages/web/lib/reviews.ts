// Reviews System - Stored in localStorage for MVP
// In production, this should use a backend API or on-chain storage

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

const REVIEWS_STORAGE_KEY = 'chronos_reviews';

// Get all reviews from storage
export function getAllReviews(): Review[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

// Get reviews for a specific item
export function getItemReviews(itemId: string, chainId: number): Review[] {
    return getAllReviews().filter(r => r.itemId === itemId && r.chainId === chainId);
}

// Get reviews for a specific seller
export function getSellerReviews(sellerAddress: string): Review[] {
    return getAllReviews().filter(r => r.sellerAddress.toLowerCase() === sellerAddress.toLowerCase());
}

// Get average rating for an item
export function getItemAverageRating(itemId: string, chainId: number): { average: number; count: number } {
    const reviews = getItemReviews(itemId, chainId);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
}

// Get average rating for a seller
export function getSellerAverageRating(sellerAddress: string): { average: number; count: number } {
    const reviews = getSellerReviews(sellerAddress);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
}

// Check if buyer has already reviewed an item
export function hasReviewed(itemId: string, chainId: number, buyerAddress: string): boolean {
    return getAllReviews().some(
        r => r.itemId === itemId && r.chainId === chainId && r.buyerAddress.toLowerCase() === buyerAddress.toLowerCase()
    );
}

// Add a new review
export function addReview(review: Omit<Review, 'id' | 'timestamp'>): Review {
    const newReview: Review = {
        ...review,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now()
    };

    const reviews = getAllReviews();
    reviews.push(newReview);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));

    return newReview;
}

// Delete a review (only buyer can delete)
export function deleteReview(reviewId: string, buyerAddress: string): boolean {
    const reviews = getAllReviews();
    const review = reviews.find(r => r.id === reviewId);

    if (!review || review.buyerAddress.toLowerCase() !== buyerAddress.toLowerCase()) {
        return false;
    }

    const filtered = reviews.filter(r => r.id !== reviewId);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(filtered));
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
