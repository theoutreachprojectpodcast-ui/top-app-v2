/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/components/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/hooks/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C58B2A",
          light: "#E0A843",
          dark: "#8A5E1A",
        },
        cyan: {
          DEFAULT: "#2ED3E6",
          light: "#6FE7F5",
          dark: "#1AA3B5",
        },
        bg: {
          primary: "#0B1F24",
          secondary: "#102A30",
          surface: "#15333A",
        },
        text: {
          primary: "#E6F1F2",
          secondary: "#9FB4B8",
        },
        border: "#1F3A40",
      },
      boxShadow: {
        "glow-cyan": "0 0 12px #2ED3E6, 0 0 24px rgba(46, 211, 230, 0.25)",
        "glow-gold": "0 0 10px rgba(224, 168, 67, 0.35)",
        "depth-card": "0 8px 20px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

