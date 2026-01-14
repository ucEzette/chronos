"use client";

import { useEffect, useRef } from "react";
import { useImageSequence } from "@/hooks/useImageSequence";

interface KeySequenceProps {
    progress: number; // 0 to 1
}

export function KeySequence({ progress }: KeySequenceProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const totalFrames = 240;

    // Helper to generate path: /sequence/oneroad-frame-001.jpg
    const getPath = (index: number) =>
        `/sequence/oneroad-frame-${index.toString().padStart(3, '0')}.jpg`;

    const { images, isLoading } = useImageSequence(totalFrames, getPath);

    // Draw frame logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || isLoading || images.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate frame index
        const frameIndex = Math.min(
            totalFrames - 1,
            Math.floor(progress * totalFrames)
        );

        const img = images[frameIndex];
        if (!img) return;

        // "Cover" fit logic
        const drawImage = () => {
            // Set canvas to full window size for high resolution
            // We rely on CSS to size the canvas element, but we need internal dimensions to match
            // However, for this specific use case, we usually want the canvas to fill its container
            // Let's assume the parent handles sizing or we use window size.
            // For best quality, set canvas width/height to its clientWidth * DPR

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.scale(dpr, dpr);

            // Calculate aspect ratios
            const canvasRatio = rect.width / rect.height;
            const imageRatio = img.width / img.height;

            let drawWidth, drawHeight, offsetX, offsetY;

            const zoom = 1.05; // Zoom in slightly to crop out edge watermarks

            if (canvasRatio > imageRatio) {
                // Canvas is wider than image -> fit width (with zoom)
                drawWidth = rect.width * zoom;
                drawHeight = (rect.width / imageRatio) * zoom;
                offsetX = (rect.width - drawWidth) / 2;
                offsetY = (rect.height - drawHeight) / 2;
            } else {
                // Canvas is taller -> fit height (with zoom)
                drawHeight = rect.height * zoom;
                drawWidth = (rect.height * imageRatio) * zoom;
                offsetX = (rect.width - drawWidth) / 2;
                offsetY = (rect.height - drawHeight) / 2;
            }

            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        };

        requestAnimationFrame(drawImage);

    }, [progress, images, isLoading]);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
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
