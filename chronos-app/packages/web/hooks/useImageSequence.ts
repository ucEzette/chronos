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

        // Prioritize loading the first frame immediately
        const imgFirst = new Image();
        imgFirst.src = basePath(1);
        imgFirst.onload = () => {
            if (!mounted) return;
            loadedImages[0] = imgFirst;
            // Force update for the first frame so the user sees something ASAP
            setImages([...loadedImages]);
            setIsLoading(false); // Stop showing loading state as soon as we have frame 1
            loadedCount++;
            setLoadProgress(loadedCount / frameCount);
        };
        imgFirst.onerror = () => {
            console.error(`Failed to load first image: ${imgFirst.src}`);
            if (!mounted) return;
            setIsLoading(false); // If first image fails, stop loading state
            loadedCount++;
            setLoadProgress(loadedCount / frameCount);
        };


        const loadRemainingImages = async () => {
            const promises = Array.from({ length: frameCount - 1 }).map((_, i) => {
                return new Promise<void>((resolve) => {
                    const actualIndex = i + 1; // Start from frame 2 (index 1)
                    const img = new Image();
                    img.src = basePath(actualIndex + 1);
                    img.onload = () => {
                        if (!mounted) return;
                        loadedImages[actualIndex] = img;
                        loadedCount++;
                        setLoadProgress(loadedCount / frameCount);
                        setImages([...loadedImages]); // Update state progressively
                        resolve();
                    };
                    img.onerror = () => {
                        console.error(`Failed to load image: ${img.src}`);
                        if (!mounted) return;
                        loadedCount++; // Still count as "attempted" for progress
                        setLoadProgress(loadedCount / frameCount);
                        resolve(); // Resolve anyway to avoid hanging
                    };
                });
            });

            await Promise.all(promises);
            // After all promises resolve, ensure final state is consistent
            if (mounted) {
                // If frameCount is 1, the above loop won't run, but the first image load handles it.
                // If frameCount > 1, and all remaining images are loaded, ensure progress is 1.
                if (loadedCount === frameCount) {
                    setLoadProgress(1);
                }
                // If isLoading is still true (e.g., first image failed or frameCount was 0), set to false
                setIsLoading(false);
            }
        };

        // Start loading the first image immediately
        // Then start loading the rest
        if (frameCount > 0) {
            // The first image load is handled by imgFirst.onload/onerror
            // The remaining images are handled by loadRemainingImages
            loadRemainingImages();
        } else {
            // If frameCount is 0, there's nothing to load
            setIsLoading(false);
            setLoadProgress(1);
        }


        return () => {
            mounted = false;
        };
    }, [frameCount, basePath]);

    return { images, progress: loadProgress, isLoading };
}
