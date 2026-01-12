"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Maximize2, Minimize2 } from "lucide-react";

export default function DeckPage() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="text-sm font-medium hidden sm:inline">Back to Home</span>
                        </Link>
                        <div className="h-6 w-px bg-white/10" />
                        <h1 className="text-lg sm:text-xl font-bold">
                            <span className="text-primary">ONEROAD</span> Pitch Deck
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href="https://www.canva.com/design/DAG-KaEUwKg/1ePQdUr9ZbR45ewsvQ4yUg/view"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-sm font-medium"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Open in Canva</span>
                        </a>
                        <button
                            onClick={toggleFullscreen}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all text-sm font-medium"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Canva Presentation Viewer */}
            <main className="flex-1 flex flex-col">
                <div className="flex-1 w-full max-w-6xl mx-auto p-4">
                    <div className="relative w-full h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-white/10 bg-black">
                        <iframe
                            src="https://www.canva.com/design/DAG-KaEUwKg/1ePQdUr9ZbR45ewsvQ4yUg/view?embed"
                            className="w-full h-full"
                            title="ONEROAD Pitch Deck"
                            allowFullScreen
                            allow="fullscreen"
                        />
                    </div>
                </div>

                {/* Mobile fallback message */}
                <div className="sm:hidden px-4 pb-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                        <p className="text-sm text-white/70 mb-3">
                            Having trouble viewing? Open in Canva directly:
                        </p>
                        <a
                            href="https://www.canva.com/design/DAG-KaEUwKg/1ePQdUr9ZbR45ewsvQ4yUg/view"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-bold text-sm"
                        >
                            <Maximize2 size={16} />
                            Open Presentation
                        </a>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 py-4 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-white/40">
                    <span>© 2026 ONEROAD</span>
                    <span>•</span>
                    <span>Decentralized Digital Marketplace</span>
                </div>
            </footer>
        </div>
    );
}
