import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0B",
        surface: "#111114",
        "surface-elevated": "#17171C",
        border: "rgba(255,255,255,0.1)",
        muted: "#A1A1AA",
        accent: "#6366F1",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0,0,0,0.28)",
        glow: "0 18px 45px rgba(99,102,241,0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms ease-out both",
        "page-in": "page-in 280ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
