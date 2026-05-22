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
        accent: "#82A5C2",
        brand: "#C4501B",
        surface: "#EAECEC",
        bg: "#F3F5F7",
        bgAlt: "#E2E7EA",
        text: "#2F3136",
        textMid: "#5F6670",
        textLight: "#89929D",
        border: "#D5DADB",
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
