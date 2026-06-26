import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default [
  { ignores: ["dist/**", ".astro/**", "node_modules/**"] },
  js.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: "module", ecmaVersion: "latest" },
      globals: { ...globals.browser },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
