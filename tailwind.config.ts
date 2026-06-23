import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      // Design tokens for the "compiler" identity: a warm paper canvas,
      // an ink-black surface for anything representing the runtime/build
      // system, and a status palette (violet=primary, mint=live,
      // amber=pending) instead of a single generic accent color.
      colors: {
        ink: {
          DEFAULT: "#15140F",
          soft: "#211F18",
        },
        paper: "#F5F1E6",
        line: "#E2DBC8",
        canvas: "#F5F1E6",
        surface: "#FFFFFF",
        raised: "#EFE9D9",
        muted: "#6E6655",
        violet: {
          DEFAULT: "#0F6B5C",
          deep: "#0B4F44",
          soft: "#DCEFE9",
          bright: "#149E86",
        },
        mint: {
          DEFAULT: "#1E9E5C",
          soft: "#E2F4E9",
        },
        amber: {
          DEFAULT: "#C2541F",
          soft: "#FBE7DB",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,17,22,0.06), 0 1px 1px rgba(14,17,22,0.04)",
        hover: "0 4px 12px rgba(14,17,22,0.10)",
        glow: "0 8px 30px rgba(14,17,22,0.12)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        // Faint dot grid — reads as graph/blueprint paper, the surface a
        // schema gets drafted on, rather than decoration for its own sake.
        "dot-grid": "radial-gradient(circle, #00000014 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "16px 16px",
      },
      keyframes: {
        pulse_ring: {
          "0%": { boxShadow: "0 0 0 0 rgba(30,158,92,0.45)" },
          "70%": { boxShadow: "0 0 0 6px rgba(30,158,92,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(30,158,92,0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse_ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;