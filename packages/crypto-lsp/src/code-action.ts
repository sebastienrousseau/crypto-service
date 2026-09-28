// SPDX-License-Identifier: Apache-2.0 OR MIT

import { CodeAction, Diagnostic, Range } from "./types";

/**
 * Generates automated QuickFix code actions for diagnosed cryptographic issues.
 */
export function getCodeActions(
  uri: string,
  text: string,
  range: Range,
  diagnostics: Diagnostic[],
): CodeAction[] {
  const actions: CodeAction[] = [];
  const lines = text.split(/\r?\n/);
  const targetLine = lines[range.start.line];
  if (targetLine === undefined) {
    return actions;
  }

  for (const diagnostic of diagnostics) {
    // Only process diagnostics intersecting target range
    if (diagnostic.range.start.line !== range.start.line) {
      continue;
    }

    if (diagnostic.code === "CRYPTO-001") {
      actions.push({
        title: "Replace with secure SHA-256",
        kind: "quickfix",
        diagnostics: [diagnostic],
        isPreferred: true,
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "sha256",
              },
            ],
          },
        },
      });
      actions.push({
        title: "Replace with high-security SHA-512",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "sha512",
              },
            ],
          },
        },
      });
    }

    if (diagnostic.code === "CRYPTO-002") {
      actions.push({
        title: "Upgrade to authenticated AES-256-GCM",
        kind: "quickfix",
        diagnostics: [diagnostic],
        isPreferred: true,
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "aes-256-gcm",
              },
            ],
          },
        },
      });
      actions.push({
        title: "Upgrade to ChaCha20-Poly1305 (zero-latency AEAD)",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "chacha20-poly1305",
              },
            ],
          },
        },
      });
    }

    if (diagnostic.code === "CRYPTO-003") {
      actions.push({
        title: "Upgrade key length to 3072 bits (CNSA compliant)",
        kind: "quickfix",
        diagnostics: [diagnostic],
        isPreferred: true,
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "modulusLength: 3072",
              },
            ],
          },
        },
      });
    }

    if (diagnostic.code === "CRYPTO-004") {
      actions.push({
        title: "Migrate to Post-Quantum ML-KEM-768 (NIST FIPS 203)",
        kind: "quickfix",
        diagnostics: [diagnostic],
        isPreferred: true,
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "ml-kem-768",
              },
            ],
          },
        },
      });
      actions.push({
        title: "Migrate to Post-Quantum ML-DSA-65 (NIST FIPS 204)",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [uri]: [
              {
                range: diagnostic.range,
                newText: "ml-dsa-65",
              },
            ],
          },
        },
      });
    }
  }

  return actions;
}
