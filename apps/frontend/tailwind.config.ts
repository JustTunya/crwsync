import { type Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./providers/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        figtree: ["var(--font-figtree)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
  // Safelist for dynamic classes
  safelist: [
    'animate-pulse',
    'backdrop-blur-sm',
    'backdrop-blur-md',
  ],
};

export default config;