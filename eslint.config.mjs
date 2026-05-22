import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ["public/sw.js"],
  },
  {
    rules: {
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
