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

// A deep import into another workspace package's build output. Slashes
// are written \x2F because esquery selector regexes cannot contain "/".
const DIST_IMPORT = /^@sebastienrousseau\x2F[^\x2F]+\x2Fdist(\x2F|$)/;
const DIST_IMPORT_MESSAGE =
  "Import from the package root or an exported subpath, not dist/.";

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
      // Workspace packages are consumed through their package.json
      // "exports" map, as a user would; a dist/ path bypasses it and
      // fails at runtime with ERR_PACKAGE_PATH_NOT_EXPORTED.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: DIST_IMPORT.source,
              message: DIST_IMPORT_MESSAGE,
            },
          ],
        },
      ],
      // no-restricted-imports sees only static imports; the same rule
      // for import() expressions and require() calls.
      "no-restricted-syntax": [
        "error",
        {
          selector: `ImportExpression[source.value=${DIST_IMPORT}]`,
          message: DIST_IMPORT_MESSAGE,
        },
        {
          selector: `CallExpression[callee.name='require'][arguments.0.value=${DIST_IMPORT}]`,
          message: DIST_IMPORT_MESSAGE,
        },
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
