import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "prefer-const": "off"
    }
  },
  {
    // A CommonJS runner that patches Node's module resolver before anything is
    // loaded cannot use ESM imports: `import` is hoisted and evaluated before
    // any statement that would install the patch, which is the whole job of the
    // file. require() is not a style choice here, it is the mechanism.
    files: ["prisma/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design handoff bundle from claude.ai/design — HTML/CSS/JS prototypes kept as
    // visual authority, never compiled or shipped. Linting them reports defects in
    // someone else's prototype as defects in the platform.
    "verity-app-ui-mockups/**",
  ]),
]);

export default eslintConfig;
