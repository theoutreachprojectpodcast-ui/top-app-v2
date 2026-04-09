/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-color-scheme="dark"]'],
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/components/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/features/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--color-bg-app)",
        subtle: "var(--color-bg-subtle)",
        card: "var(--color-bg-card)",
        "card-hover": "var(--color-bg-card-hover)",
        elevated: "var(--color-bg-elevated)",
        muted: "var(--color-bg-muted)",
        border: "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        "border-strong": "var(--color-border-strong)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        "text-accent": "var(--color-accent)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-soft": "var(--color-accent-soft)",
        link: "var(--color-link)",
        "focus-ring": "var(--color-focus-ring)",
        "on-accent": "var(--color-on-accent)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "bottom-nav": "var(--shadow-bottom-nav)",
        accent: "var(--glow-accent)",
      },
      borderRadius: {
        input: "var(--radius-input)",
        card: "var(--radius-card)",
        button: "var(--radius-button)",
      },
      ringColor: {
        DEFAULT: "var(--color-focus-ring)",
        focus: "var(--color-focus-ring)",
        accent: "var(--color-accent)",
      },
      backgroundColor: {
        navbar: "var(--color-navbar)",
      },
    },
  },
  plugins: [],
};
