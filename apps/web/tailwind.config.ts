import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        primary: "hsl(var(--primary))",
        primaryFg: "hsl(var(--primary-fg))",
        accent: "hsl(var(--accent))",
        accentFg: "hsl(var(--accent-fg))",
        danger: "hsl(var(--danger))",
        dangerFg: "hsl(var(--danger-fg))"
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

