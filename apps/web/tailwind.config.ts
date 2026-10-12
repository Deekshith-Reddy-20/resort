import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#123D2D",
        evergreen: "#09281F",
        ivory: "#F8F5ED",
        beige: "#E9E1D4",
        dragon: "#D93668",
        charcoal: "#242A25",
        stone: "#D9D2C4",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
