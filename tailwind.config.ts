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
          DEFAULT: "#0E1116",
          soft: "#161B22",
        },
        paper: "#F7F5EF",
        line: "#E7E2D5",
        canvas: "#F7F5EF",
        surface: "#FFFFFF",
        raised: "#F1EEE5",
        muted: "#8A8578",
        violet: {
          DEFAULT: "#5B4FE5",
          deep: "#4338CA",
          soft: "#EEECFC",
          bright: "#6D62F2",
        },
        mint: {
          DEFAULT: "#1FAE73",
          soft: "#E3F6ED",
        },
        amber: {
          DEFAULT: "#D98C2B",
          soft: "#FBEEDD",
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
          "0%": { boxShadow: "0 0 0 0 rgba(31,174,115,0.45)" },
          "70%": { boxShadow: "0 0 0 6px rgba(31,174,115,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(31,174,115,0)" },
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