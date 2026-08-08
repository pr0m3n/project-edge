import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/guides/**",
      "**/*.min.js",
      "next-env.d.ts",
      "**/ProjectEdge hideg email kampány/**"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/triple-slash-reference": "off",
      "react/no-deprecated": "warn",
      "react/jsx-no-comment-textnodes": "warn",
      "@next/next/no-assign-module-variable": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn"
    }
  }
];

export default config;
