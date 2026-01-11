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
        // Oneroad Color Palette - matches logo background
        primary: {
          DEFAULT: "#13ecda",
          dark: "#0fc5b8",
          light: "#4ff5e8",
          glow: "rgba(19, 236, 218, 0.5)"
        },
        background: {
          DEFAULT: "#050505",
          dark: "#000000",
          light: "#0a0e14",
        },
        surface: "#0a0e14",
        "matte-grey": "#0f1419",
        // Glass colors
        glass: {
          white: "rgba(255, 255, 255, 0.03)",
          border: "rgba(255, 255, 255, 0.08)",
          highlight: "rgba(255, 255, 255, 0.1)",
        }
      },
      fontFamily: {
        // Display/Hero: Sora Black / Space Grotesk Bold
        display: ["Sora", "Space Grotesk", "sans-serif"],
        // Headings: Satoshi / Manrope Medium
        heading: ["Satoshi", "Manrope", "sans-serif"],
        // Body: Manrope / Switzer
        body: ["Manrope", "Switzer", "sans-serif"],
        // Code: Space Mono
        mono: ["Space Mono", "monospace"],
        // Legacy
        grenze: ['"Grenze Gotisch"', 'serif'],
      },
      boxShadow: {
        // Primary button glow
        "glow": "0 0 20px rgba(19, 236, 218, 0.3)",
        "glow-strong": "0 0 30px rgba(19, 236, 218, 0.5)",
        "glow-xl": "0 0 40px rgba(19, 236, 218, 0.4)",
        // Glass shadows
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.3)",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        "full": "9999px"
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 20s linear infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
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
      },
    },
  },
  plugins: [],
};
export default config;