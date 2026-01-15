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
            const batchSize = 5;
            const remainingIndices = Array.from({ length: frameCount - 1 }, (_, i) => i + 1);

            for (let i = 0; i < remainingIndices.length; i += batchSize) {
                if (!mounted) break;

                const batch = remainingIndices.slice(i, i + batchSize);
                const promises = batch.map(index => {
                    return new Promise<void>((resolve) => {
                        const img = new Image();
                        img.src = basePath(index + 1);
                        img.onload = () => {
                            if (!mounted) return;
                            loadedImages[index] = img;
                            loadedCount++;
                            // Only update progress state periodically to reduce re-renders
                            if (loadedCount % 5 === 0 || loadedCount === frameCount) {
                                setLoadProgress(loadedCount / frameCount);
                                // For smoother performance, verify if we need to update 'images' state frequently
                                // Updating it every batch is good compromise
                                setImages([...loadedImages]);
                            }
                            resolve();
                        };
                        img.onerror = () => {
                            console.error(`Failed to load image: ${img.src}`);
                            if (!mounted) return;
                            loadedCount++;
                            setLoadProgress(loadedCount / frameCount);
                            resolve();
                        };
                    });
                });

                // Wait for the current batch to finish before starting the next
                // This prevents network saturation
                await Promise.all(promises);

                // Optional: Small delay to yield to main thread if needed
                // await new Promise(r => setTimeout(r, 0));
            }

            if (mounted) {
                // Ensure final state consistency
                if (loadedCount === frameCount) {
                    setLoadProgress(1);
                    setImages([...loadedImages]);
                }
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
