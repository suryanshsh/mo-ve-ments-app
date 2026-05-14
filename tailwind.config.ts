import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#C4501B",
        surface: "#FFFFFF",
        bg: "#FAFAF7",
        bgAlt: "#F3F2EE",
        text: "#1C1C1A",
        textMid: "#5A5A56",
        textLight: "#9C9C96",
        border: "#E8E6E0",
      },
      fontFamily: {
        serif: ["Instrument Serif", "serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
}
export default config
