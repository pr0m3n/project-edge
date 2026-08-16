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
      "**/ProjectEdge hideg email kampány/**",
      // Helyi, gitignore-olt biztonsagi mentes a forras egy regebbi allapotarol.
      // Nem epul be semmibe, a lint viszont vegigment rajta, es a duplikalt
      // regi kod figyelmeztetesei osszekeveredtek az elo kodeivel.
      ".backup_pre_improvements/**"
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
      /* Szandekosan "warn" es nem "error".
         A megmaradt eseteknel az effektbeli setState a helyes minta: olyan
         kezdoallapotot allitanak be, ami CSAK a bongeszoben letezik
         (localStorage-beli piszkozat, mentett ticket, sutidontes, chat-pozicio).
         Ha ez a render fazisban tortenne, a szerveren renderelt HTML elternene
         a kliensetol, azaz hidratacios hibat kapnank. A szabaly ezt a
         kulonbseget nem latja, ezert jelez — a figyelmeztetes tudatosan marad. */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn"
    }
  }
];

export default config;
