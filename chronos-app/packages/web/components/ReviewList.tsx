'use client';

import { useState, useEffect } from 'react';
import { StarRating, ReviewCount } from './StarRating';
import { getItemReviewsSync, formatRelativeTime, type Review } from '@/lib/reviews';
import { cn } from '@/lib/utils';
import { MessageSquare, User } from 'lucide-react';

interface ReviewListProps {
    itemId: string;
    chainId: number;
    limit?: number;
}

export function ReviewList({ itemId, chainId, limit }: ReviewListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        setReviews(getItemReviewsSync(itemId, chainId));
    }, [itemId, chainId]);

    if (reviews.length === 0) {
        return (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                <MessageSquare size={24} className="mx-auto text-white/20 mb-2" />
                <p className="text-sm text-white/40">No reviews yet</p>
                <p className="text-xs text-white/20 mt-1">Be the first to review this product</p>
            </div>
        );
    }

    const sortedReviews = [...reviews].sort((a, b) => b.timestamp - a.timestamp);
    const displayReviews = limit && !showAll ? sortedReviews.slice(0, limit) : sortedReviews;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase text-white/60 flex items-center gap-2">
                    <MessageSquare size={14} /> Reviews
                </h4>
                <ReviewCount count={reviews.length} />
            </div>

            <div className="space-y-3">
                {displayReviews.map(review => (
                    <div
                        key={review.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                                    <User size={14} className="text-black" />
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-white/80">
                                        {review.buyerAddress.slice(0, 6)}...{review.buyerAddress.slice(-4)}
                                    </p>
                                    <p className="text-[10px] text-white/40">{formatRelativeTime(review.timestamp)}</p>
                                </div>
                            </div>
                            <StarRating rating={review.rating} size="sm" />
                        </div>

                        {/* Comment */}
                        <p className="text-sm text-white/70 leading-relaxed">{review.comment}</p>
                    </div>
                ))}
            </div>

            {/* Show More */}
            {limit && reviews.length > limit && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="w-full py-2 text-xs font-bold text-primary hover:underline"
                >
                    Show all {reviews.length} reviews
                </button>
            )}
        </div>
    );
}
