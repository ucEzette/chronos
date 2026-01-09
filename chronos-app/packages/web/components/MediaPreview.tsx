"use client";

import { useState, useEffect, useRef } from "react";
import { getIPFSUrl } from "@/lib/ipfs";
import { Loader2, AlertCircle, Play, Pause, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  cid: string;
  type: string; // 'VIDEO', 'AUDIO', 'IMAGE', 'OTHER'
  alt: string;
  className?: string;
  autoPlay?: boolean;
}

export function MediaPreview({ cid, type, alt, className, autoPlay = false }: MediaPreviewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!cid) return;

    // Check if cid is already a full URL
    let url: string | null;
    if (cid.startsWith('http://') || cid.startsWith('https://') || cid.startsWith('/')) {
      url = cid; // Already a URL, use directly
    } else {
      url = getIPFSUrl(cid);
    }

    if (url) {
      setSrc(url);
      // Images load via onLoad, media loads via onLoadedData
      if (!['VIDEO', 'AUDIO'].includes(type.toUpperCase())) setLoading(true);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [cid, type]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    if (type.includes("VIDEO") && videoRef.current) {
      if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
      else { videoRef.current.pause(); setIsPlaying(false); }
    } else if (type.includes("AUDIO") && audioRef.current) {
      if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
      else { audioRef.current.pause(); setIsPlaying(false); }
    }
  };

  if (error || !src) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-white/5 text-white/40 h-full w-full", className)}>
        <AlertCircle size={32} className="mb-2" />
        <span className="text-xs font-mono">Preview Unavailable</span>
      </div>
    );
  }

  const fileType = type.toUpperCase();

  return (
    <div className={cn("relative overflow-hidden bg-black/50 group w-full h-full", className)}>
      {/* LOADING SPINNER */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-sm">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {/* CONTENT RENDERER */}
      {fileType.includes("VIDEO") ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          loop
          muted={!isPlaying && !autoPlay}
          playsInline
          onLoadedData={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
        />
      ) : fileType.includes("AUDIO") ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
          <audio ref={audioRef} src={src} loop onLoadedData={() => setLoading(false)} />
          <div className={cn("p-6 rounded-full bg-white/5 border border-white/10 transition-all", isPlaying && "animate-pulse border-primary/50 shadow-neon")}>
            <Music size={48} className={cn("text-gray-400", isPlaying && "text-primary")} />
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onLoad={() => setLoading(false)}
          onError={() => { setError(true); setLoading(false); }}
        />
      )}

      {/* PLAY OVERLAY (For Media) */}
      {(fileType.includes("VIDEO") || fileType.includes("AUDIO")) && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all z-20 cursor-pointer" onClick={togglePlay}>
          <button className={cn("bg-primary/90 text-black p-4 rounded-full shadow-neon transform transition-all duration-300 active:scale-95", isPlaying ? "opacity-0 group-hover:opacity-100 scale-90" : "opacity-100 scale-100")}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
        </div>
      )}
    </div>
  );
}