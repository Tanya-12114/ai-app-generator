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
          DEFAULT: "#EDE8DB",
          soft: "#C9C2AE",
        },
        paper: "#15140F",
        line: "#332E22",
        canvas: "#15140F",
        surface: "#1D1B14",
        raised: "#272318",
        muted: "#A39C87",
        violet: {
          DEFAULT: "#1FBFA0",
          deep: "#15876F",
          soft: "#163B34",
          bright: "#3FD9BA",
        },
        mint: {
          DEFAULT: "#34D399",
          soft: "#16342A",
        },
        amber: {
          DEFAULT: "#E2703B",
          soft: "#3B2014",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.3)",
        hover: "0 4px 16px rgba(0,0,0,0.5)",
        glow: "0 8px 30px rgba(0,0,0,0.55)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        // Faint dot grid — reads as graph/blueprint paper, the surface a
        // schema gets drafted on, rather than decoration for its own sake.
        "dot-grid": "radial-gradient(circle, #EDE8DB1A 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "16px 16px",
      },
      keyframes: {
        pulse_ring: {
          "0%": { boxShadow: "0 0 0 0 rgba(52,211,153,0.45)" },
          "70%": { boxShadow: "0 0 0 6px rgba(52,211,153,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(52,211,153,0)" },
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