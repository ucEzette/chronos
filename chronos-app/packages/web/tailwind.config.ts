import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Glassmorphism Palette with Turquoise Blue
        background: {
          DEFAULT: "#1a2332",
          dark: "#0f1621",
          light: "#3d4a5c",
        },
        surface: "#2a3444",
        primary: {
          DEFAULT: "#00CED1",  // Turquoise Blue
          dark: "#00A8AB",
          light: "#40E0D0",
          glow: "rgba(0, 206, 209, 0.5)"
        },
        secondary: {
          DEFAULT: "#64748b",  // Slate
          glow: "rgba(100, 116, 139, 0.3)"
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        // Glass colors
        glass: {
          white: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.15)",
          highlight: "rgba(255, 255, 255, 0.25)",
        }
      },
      fontFamily: {
        grenze: ['"Grenze Gotisch"', 'serif'],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        // Glass shadows
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.3)",
        "glass-inset": "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        // Turquoise glow
        "neon": "0 0 15px rgba(0, 206, 209, 0.4), 0 0 30px rgba(0, 206, 209, 0.2)",
        "neon-strong": "0 0 20px rgba(0, 206, 209, 0.6), 0 0 40px rgba(0, 206, 209, 0.3)",
        // Inner edge highlight
        "edge-highlight": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.15), inset 1px 0 1px 0 rgba(255, 255, 255, 0.08)",
      },
      backgroundImage: {
        // Slate gradient backgrounds
        "gradient-slate": "linear-gradient(135deg, #1a2332 0%, #3d4a5c 100%)",
        "gradient-slate-dark": "linear-gradient(180deg, #0f1621 0%, #1a2332 50%, #2a3444 100%)",
        // Glass gradient for edges
        "glass-edge": "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 20s linear infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" }
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(0, 206, 209, 0.4)" },
          "50%": { boxShadow: "0 0 25px rgba(0, 206, 209, 0.6)" }
        }
      },
      borderRadius: {
        "pill": "9999px",
      }
    },
  },
  plugins: [],
};
export default config;