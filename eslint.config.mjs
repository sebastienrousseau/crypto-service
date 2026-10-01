// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// One flat config for the whole workspace (ESLint 10 dropped .eslintrc).
// ESLint looks it up from each linted file, so `pnpm run lint` inside a
// package and root-level runs (lint-staged, the complexity gate) apply
// the same rules: eslint:recommended plus typescript-eslint recommended,
// as the per-package .eslintrc.json files did.

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import chaiFriendly from "eslint-plugin-chai-friendly";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["**/dist/", "**/node_modules/", "**/examples/", "**/docs/"] },
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, sourceType: "module" },
    rules: {
      // A leading underscore marks a parameter an interface requires but
      // this implementation does not use (the KMS provider stubs).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Chai assertions such as `expect(x).to.be.true` are property reads;
    // the chai-aware rule allows those and still flags real unused
    // expressions.
    files: ["**/__tests__/**/*.ts"],
    plugins: { "chai-friendly": chaiFriendly },
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "chai-friendly/no-unused-expressions": "error",
    },
  },
);
