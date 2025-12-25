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
        background: "#020609", // Deep Space Black
        surface: "#0b1a24",    // Glass Surface
        primary: {
          DEFAULT: "#00E5FF",  // Chronos Cyan
          dark: "#00B8CC",
          glow: "rgba(0, 229, 255, 0.5)"
        },
        secondary: {
          DEFAULT: "#2979FF",  // Electric Blue
          glow: "rgba(41, 121, 255, 0.5)"
        },
        success: "#00FFA3",    // Signal Green
        warning: "#FFBF00",    // Amber
        danger: "#FF003C",     // Crimson
        card: {
          DEFAULT: "rgba(11, 26, 36, 0.6)",
          border: "rgba(255, 255, 255, 0.1)"
        }
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        neon: "0 0 10px rgba(0, 229, 255, 0.5), 0 0 20px rgba(0, 229, 255, 0.3)",
        "neon-green": "0 0 10px rgba(0, 255, 163, 0.5), 0 0 20px rgba(0, 255, 163, 0.3)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 20s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" }
        }
      }
    },
  },
  plugins: [],
};
export default config;