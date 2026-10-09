import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // T-29: arquivos GERADOS (service worker do Serwist e workers empacotados). Não são código nosso.
    "public/sw.js",
    "public/swe-worker*.js",
    "public/worker-*.js",
  ]),
  {
    // T-29: scripts utilitários em CommonJS (rodam com `node arquivo.js`): `require` é o jeito certo.
    files: ["*.js", "scripts/**/*.js", "worker/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // T-29: regras novas do React Compiler (eslint-plugin-react-hooks 7). Elas apontam padrões que
    // funcionam hoje (ler localStorage/matchMedia depois de montar, Math.random em animação de
    // canvas). Ficam como AVISO, não erro: o conserto é caso a caso, junto com T-27 (componentes
    // compartilhados). Não bloqueiam o CI, mas continuam listadas em `npm run lint`.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
