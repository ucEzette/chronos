'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    rating: number;
    maxStars?: number;
    size?: 'sm' | 'md' | 'lg';
    interactive?: boolean;
    onChange?: (rating: number) => void;
    showValue?: boolean;
}

export function StarRating({
    rating,
    maxStars = 5,
    size = 'md',
    interactive = false,
    onChange,
    showValue = false
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);

    const sizes = {
        sm: 12,
        md: 16,
        lg: 20
    };

    const iconSize = sizes[size];
    const displayRating = hoverRating || rating;

    return (
        <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
                {Array.from({ length: maxStars }, (_, i) => {
                    const starValue = i + 1;
                    const isFilled = starValue <= displayRating;
                    const isHalf = starValue - 0.5 === displayRating;

                    return (
                        <button
                            key={i}
                            type="button"
                            disabled={!interactive}
                            onClick={() => interactive && onChange?.(starValue)}
                            onMouseEnter={() => interactive && setHoverRating(starValue)}
                            onMouseLeave={() => interactive && setHoverRating(0)}
                            className={cn(
                                "transition-all",
                                interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
                            )}
                        >
                            <Star
                                size={iconSize}
                                className={cn(
                                    "transition-colors",
                                    isFilled
                                        ? "text-yellow-400 fill-yellow-400"
                                        : isHalf
                                            ? "text-yellow-400 fill-yellow-400/50"
                                            : "text-white/20"
                                )}
                            />
                        </button>
                    );
                })}
            </div>
            {showValue && (
                <span className={cn(
                    "font-mono font-bold",
                    size === 'sm' ? "text-xs" : size === 'md' ? "text-sm" : "text-base"
                )}>
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
}

// Review count badge component
export function ReviewCount({ count }: { count: number }) {
    return (
        <span className="text-xs text-white/40">
            ({count} review{count !== 1 ? 's' : ''})
        </span>
    );
}
