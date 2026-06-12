import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: ["android/**", "ios/**", ".next/**", "out/**"],
  },
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
