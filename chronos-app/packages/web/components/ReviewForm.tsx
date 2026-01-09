'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { StarRating } from './StarRating';
import { addReview, hasReviewed } from '@/lib/reviews';
import { cn } from '@/lib/utils';
import { Send, AlertCircle, Check } from 'lucide-react';

interface ReviewFormProps {
    itemId: string;
    chainId: number;
    sellerAddress: string;
    isOwner: boolean;
    onSubmit?: () => void;
}

export function ReviewForm({ itemId, chainId, sellerAddress, isOwner, onSubmit }: ReviewFormProps) {
    const { address, isConnected } = useAccount();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Check if already reviewed
    const alreadyReviewed = address ? hasReviewed(itemId, chainId, address) : false;

    // Only show form if: connected, is owner (bought it), hasn't reviewed yet
    if (!isConnected || !address) {
        return (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-white/40">Connect wallet to leave a review</p>
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-white/40">Purchase this item to leave a review</p>
            </div>
        );
    }

    if (alreadyReviewed || submitted) {
        return (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                <Check size={16} className="text-green-400" />
                <p className="text-sm text-green-400">You've reviewed this item</p>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        if (comment.trim().length < 5) {
            setError('Review must be at least 5 characters');
            return;
        }

        setIsSubmitting(true);

        try {
            addReview({
                itemId,
                chainId,
                buyerAddress: address,
                sellerAddress,
                rating: rating as 1 | 2 | 3 | 4 | 5,
                comment: comment.trim()
            });

            setSubmitted(true);
            onSubmit?.();
        } catch (e) {
            setError('Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <h4 className="text-sm font-bold uppercase text-white/60">Leave a Review</h4>

            {/* Rating */}
            <div className="space-y-2">
                <label className="text-xs text-white/40">Your Rating</label>
                <StarRating
                    rating={rating}
                    size="lg"
                    interactive
                    onChange={setRating}
                />
            </div>

            {/* Comment */}
            <div className="space-y-2">
                <label className="text-xs text-white/40">Your Review</label>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Share your experience with this product..."
                    className="w-full h-24 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:border-primary/50 outline-none resize-none"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    isSubmitting
                        ? "bg-primary/20 text-primary cursor-wait"
                        : "bg-primary text-black hover:bg-white"
                )}
            >
                {isSubmitting ? (
                    'Submitting...'
                ) : (
                    <>
                        <Send size={14} /> Submit Review
                    </>
                )}
            </button>
        </form>
    );
}
