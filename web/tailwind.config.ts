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
        xevo: {
          bg: "#080607",
          panel: "#14090b",
          panel2: "#1d0b0e",
          border: "#64151d",
          red: "#e50914",
          redLight: "#ff3340",
          muted: "#c5aeb2",
          text: "#fff7f7",
          green: "#35d07f",
          yellow: "#ffd166",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
      boxShadow: {
        "xevo-brutal": "5px 5px 0 #3d0d12",
        "xevo-deep": "7px 9px 0 #111111",
        "xevo-btn": "4px 4px 0 #3d0d12",
      },
    },
  },
  plugins: [],
};
export default config;
