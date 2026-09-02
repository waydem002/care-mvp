import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        surface: "#FFFFFF",
        ink: "#1D1D1B",
        muted: "#6B6A64",
        border: "#E4E2DA",
        brand: {
          DEFAULT: "#33415C",
          dark: "#242E42",
          light: "#4A5D82",
        },
        status: {
          confirmed: "#4C8C6B",
          confirmedBg: "#E9F2EC",
          pending: "#C98A3B",
          pendingBg: "#FAF0E1",
          missed: "#B9503F",
          missedBg: "#FBEBE7",
        },
      },
      fontFamily: {
        sans: ["Public Sans", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum" 1',
      },
    },
  },
  plugins: [],
};

export default config;
