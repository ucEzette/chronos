import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full py-8 mt-auto border-t border-white/10 bg-[#020e14] relative z-10">
      <div className="max-w-[1440px] mx-auto px-6 flex flex-col items-center justify-center gap-2">
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          Chronos Protocol // V.2.0.77
        </p>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <span>Developed with</span>
          <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" />
          <span>by</span>
          <a 
            href="https://x.com/runicsorcerer" 
            target="_blank" 
            rel="noreferrer" 
            className="text-primary hover:text-cyan-300 transition-colors font-bold hover:underline decoration-primary/50 underline-offset-4"
          >
            @runicsorcerer
          </a>
        </div>
      </div>
    </footer>
  );
}