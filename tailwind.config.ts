import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: "#22c55e",
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in":     "fadeIn 0.5s ease-out both",
        "slide-up":    "slideUp 0.5s ease-out both",
        "slide-right": "slideRight 0.4s ease-out both",
        "pulse-slow":  "pulse 3s ease-in-out infinite",
        "blink":       "blink 1s step-end infinite",
        "float":       "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideRight:{ from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        blink:     { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        float:     { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
