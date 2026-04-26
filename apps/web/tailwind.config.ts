import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        fg: "hsl(var(--fg) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        primaryFg: "hsl(var(--primary-fg) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        accentFg: "hsl(var(--accent-fg) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        dangerFg: "hsl(var(--danger-fg) / <alpha-value>)"
      },
      borderRadius: {
        sm: "12px",
        DEFAULT: "12px",
        md: "14px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px"
      },
      boxShadow: {
        soft: "0 10px 30px hsl(var(--shadow) / 0.10)",
        card: "0 12px 40px hsl(var(--shadow) / 0.12)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
