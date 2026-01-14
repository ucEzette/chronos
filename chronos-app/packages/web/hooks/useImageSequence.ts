import { useState, useEffect } from 'react';

interface UseImageSequenceResult {
    images: (HTMLImageElement | null)[];
    progress: number;
    isLoading: boolean;
}

export function useImageSequence(
    frameCount: number,
    basePath: (index: number) => string
): UseImageSequenceResult {
    const [images, setImages] = useState<(HTMLImageElement | null)[]>([]);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadedImages: (HTMLImageElement | null)[] = new Array(frameCount).fill(null);
        let loadedCount = 0;

        const loadImages = async () => {
            const promises = Array.from({ length: frameCount }).map((_, i) => {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    img.src = basePath(i + 1); // 1-based indexing for files
                    img.onload = () => {
                        if (!mounted) return;
                        loadedImages[i] = img;
                        loadedCount++;
                        setLoadProgress(loadedCount / frameCount);
                        if (loadedCount === frameCount) {
                            setIsLoading(false);
                            setImages(loadedImages);
                        }
                        resolve();
                    };
                    img.onerror = () => {
                        console.error(`Failed to load image: ${img.src}`);
                        resolve(); // Resolve anyway to avoid hanging
                    };
                });
            });

            await Promise.all(promises);
        };

        loadImages();

        return () => {
            mounted = false;
        };
    }, [frameCount, basePath]);

    return { images, progress: loadProgress, isLoading };
}
