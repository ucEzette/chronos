"use client";

import { useEffect, useRef, useCallback } from "react";
import { useImageSequence } from "@/hooks/useImageSequence";

import { MotionValue } from "framer-motion";

interface KeySequenceProps {
    progress: MotionValue<number>;
}

export function KeySequence({ progress }: KeySequenceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const totalFrames = 56;

    // Memoize the path generator to prevent re-triggering the hook
    const getPath = useCallback((index: number) =>
        `/sequenceNW/frame-${index.toString().padStart(3, '0')}.webp`, []);

    const { images, isLoading } = useImageSequence(totalFrames, getPath);

    // Draw frame logic
    useEffect(() => {
        // Draw logic extracted to be callable from subscription
        const drawFrame = (latestProgress: number) => {
            const canvas = canvasRef.current;
            if (!canvas || images.length === 0) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Calculate frame index
            const frameIndex = Math.min(
                totalFrames - 1,
                Math.floor(latestProgress * totalFrames)
            );

            const img = images[frameIndex];
            if (!img) return;

            // "Cover" fit logic
            // .. reuse previous logic ..
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            // Only set dimensions if they changed to avoid accumulation/flicker? 
            // Actually, setting width/height clears canvas, which is fine here.
            // But doing it every frame might be expensive if layout thrashes.
            // Ideally we only touch DOM if size changed. 
            // For now, let's keep it robust.

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.scale(dpr, dpr);

            const canvasRatio = rect.width / rect.height;
            const imageRatio = img.width / img.height;

            let drawWidth, drawHeight, offsetX, offsetY;
            const zoom = 1.05;

            if (canvasRatio > imageRatio) {
                drawWidth = rect.width * zoom;
                drawHeight = (rect.width / imageRatio) * zoom;
                offsetX = (rect.width - drawWidth) / 2;
                offsetY = (rect.height - drawHeight) / 2;
            } else {
                drawHeight = rect.height * zoom;
                drawWidth = (rect.height * imageRatio) * zoom;
                offsetX = (rect.width - drawWidth) / 2;
                offsetY = (rect.height - drawHeight) / 2;
            }

            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        };

        // Subscribe to MotionValue changes
        const unsubscribe = progress.on("change", (latest) => {
            if (!isLoading) drawFrame(latest);
        });

        // Initial draw (if loaded)
        if (!isLoading) drawFrame(progress.get());

        return () => unsubscribe();
    }, [progress, images, isLoading]);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover pointer-events-none"
            />
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="text-primary font-mono text-xs animate-pulse">
                        LOADING SYSTEM...
                    </div>
                </div>
            )}
        </div>
    );
}
