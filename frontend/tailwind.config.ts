import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          50: "#FDF2F2",
          100: "#F9E8E8",
          200: "#F0D0D4",
          300: "#E8BFC4",
          400: "#E8B4B8",
          500: "#D4949A",
          600: "#C4848A",
          700: "#A86A70",
          800: "#8C5056",
          900: "#6E3A3E",
        },
        cream: {
          50: "#FFFCF8",
          100: "#FFF8F0",
          200: "#F5F0EB",
          300: "#EDE5DD",
          400: "#DDD3C8",
        },
        gold: {
          300: "#E0BE96",
          400: "#D4A574",
          500: "#C9956B",
          600: "#B8845A",
          700: "#9C6E48",
        },
        "warm-gray": {
          100: "#F0ECEC",
          200: "#DDD6D6",
          300: "#C4BABA",
          400: "#8B7D7D",
          500: "#7A6C6C",
          600: "#6B5B5B",
          700: "#524545",
          800: "#3D3535",
          900: "#2A2222",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        soft: "8px",
        card: "12px",
        "card-lg": "20px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(107, 91, 91, 0.06), 0 1px 2px -1px rgba(107, 91, 91, 0.06)",
        "card-hover": "0 4px 12px 0 rgba(107, 91, 91, 0.08), 0 2px 4px -2px rgba(107, 91, 91, 0.06)",
        modal: "0 20px 60px -12px rgba(61, 53, 53, 0.2)",
        "rose-glow": "0 0 0 3px rgba(232, 180, 184, 0.25)",
        "gold-glow": "0 0 0 3px rgba(212, 165, 116, 0.2)",
        /* Editorial warm-ink shadow system: tinted toward warm-gray ink, never black */
        soft: "0 1px 2px rgba(61, 53, 53, 0.04), 0 10px 28px -10px rgba(61, 53, 53, 0.09)",
        lifted:
          "0 2px 6px rgba(61, 53, 53, 0.05), 0 22px 44px -14px rgba(61, 53, 53, 0.13)",
        "btn-rose": "0 2px 10px rgba(168, 106, 112, 0.25)",
        "btn-rose-hover": "0 8px 22px -4px rgba(168, 106, 112, 0.35)",
        "btn-gold": "0 2px 10px rgba(156, 110, 72, 0.22)",
        "btn-gold-hover": "0 8px 22px -4px rgba(156, 110, 72, 0.32)",
      },
      letterSpacing: {
        eyebrow: "0.32em",
        "eyebrow-wide": "0.55em",
      },
      fontSize: {
        /* Half-pixel UI type tuning */
        ui: ["13.5px", { lineHeight: "1.5" }],
        "ui-sm": ["12.5px", { lineHeight: "1.45" }],
        "ui-xs": ["11.5px", { lineHeight: "1.4" }],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        120: "30rem",
      },
    },
  },
  plugins: [],
};

export default config;
