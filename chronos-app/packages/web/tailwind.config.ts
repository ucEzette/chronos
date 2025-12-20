import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", // Scan lib just in case
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Fallback scan
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#121212",
        border: "#27272a",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
        danger: "#ef4444",
        muted: "#a1a1aa",
      },
    },
  },
  plugins: [],
};
export default config;