import std from "@blaahaj/std/eslint";
import pluginJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  ...std,
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { ignores: ["dist/**"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
];
