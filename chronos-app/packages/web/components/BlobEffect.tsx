"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import './BlobEffect.css';

// Helper to generate random number
const randomNum = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

interface BlobItem {
    id: number;
    size: number;
    initialLeft: number;
    tx: number; // target x for animation
    ty: number; // target y for animation
    delay: string;
}

interface BlobProps {
    className?: string;
    style?: React.CSSProperties;
    spread?: number;
    blobSize?: number;
}

export default function BlobEffect({ className, style, spread = 40, blobSize = 40 }: BlobProps) {
    const [blobs, setBlobs] = useState<BlobItem[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement | null>(null);
    const offsetRef = useRef({ x: 0, y: 0 });

    // Initialize blobs on mount (client-side only to avoid hydration mismatch with randoms)
    useEffect(() => {
        const newBlobs = Array.from({ length: 15 }).map((_, i) => {
            const sizeBase = blobSize;
            return {
                id: i,
                size: randomNum(sizeBase * 0.5, sizeBase), // Smaller variance
                initialLeft: randomNum(-spread, spread),
                tx: randomNum(-spread, spread),
                ty: randomNum(-spread, spread),
                delay: i === 0 ? '0s' : `${randomNum(1, 3)}s`
            };
        });
        setBlobs(newBlobs);
    }, [spread, blobSize]);

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, id: number) => {
        const element = e.currentTarget;
        selectedRef.current = element;

        // Calculate offset to keep cursor relative to element
        const rect = element.getBoundingClientRect();
        offsetRef.current = {
            x: e.clientX - rect.left - (rect.width / 2),
            y: e.clientY - rect.top - (rect.height / 2)
        };

        // Stop animation while dragging
        element.style.animation = 'none';
        element.style.zIndex = '100';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!selectedRef.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate position relative to the container center
        // The original logic was creating a global absolute position, we'll try to keep it relative to the glowing blob container
        const x = e.clientX - containerRect.left - (containerRect.width / 2);
        const y = e.clientY - containerRect.top - (containerRect.height / 2);

        selectedRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    const handleMouseUp = () => {
        if (!selectedRef.current) return;

        const el = selectedRef.current;
        selectedRef.current = null;

        // Animate back to origin
        // We trigger a transition by removing the manual transform and re-enabling the animation
        // However, standard CSS animation 'float' will snap. 
        // We can use a temporary transition or just reset.

        // Simple "bounceback" effect logic from original JS:
        el.style.transition = "transform 1s ease";
        el.style.transform = "translate(0, 0)";

        setTimeout(() => {
            el.style.transition = "";
            el.style.animation = ""; // Resets to CSS class animation
            el.style.zIndex = "";
        }, 1000);
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div className={`blob-container ${className || ''}`} style={style}>
            {/* SVG Filter Definition */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                            result="goo"
                        />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <div className="glowy-blob" ref={containerRef}>
                {blobs.map((blob) => (
                    <div
                        key={blob.id}
                        className="blob-item"
                        onMouseDown={(e) => handleMouseDown(e, blob.id)}
                        style={{
                            width: `${blob.size}px`,
                            height: `${blob.size}px`,
                            left: `${blob.initialLeft}px`,
                            // We pass custom properties for the CSS animation to use
                            // @ts-ignore
                            '--tx': `${blob.tx}px`,
                            '--ty': `${blob.ty}px`,
                            animationDelay: blob.delay
                        } as React.CSSProperties}
                    />
                ))}
            </div>
        </div>
    );
}
