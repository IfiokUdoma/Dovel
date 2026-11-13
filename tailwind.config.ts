import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { dovel: { ink: "#090909", panel: "#141414", muted: "#929292", red: "#F04438", gold: "#F5B942" } }, fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] }, boxShadow: { glow: "0 0 40px rgba(240,68,56,.22)" } } },
  plugins: [],
};
export default config;
