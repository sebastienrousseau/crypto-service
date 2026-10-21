// SPDX-License-Identifier: Apache-2.0 OR MIT

import { CodeAction, Diagnostic, Range } from "./types";

/** A replacement offered for a diagnostic's range. */
interface Fix {
  title: string;
  newText: string;
}

/** Fixes per rule; the first one is the preferred fix. */
const FIXES = new Map<Diagnostic["code"], Fix[]>([
  [
    "CRYPTO-001",
    [
      { title: "Replace with secure SHA-256", newText: "sha256" },
      { title: "Replace with high-security SHA-512", newText: "sha512" },
    ],
  ],
  [
    "CRYPTO-002",
    [
      { title: "Upgrade to authenticated AES-256-GCM", newText: "aes-256-gcm" },
      {
        title: "Upgrade to ChaCha20-Poly1305 (zero-latency AEAD)",
        newText: "chacha20-poly1305",
      },
    ],
  ],
  [
    "CRYPTO-003",
    [
      {
        title: "Upgrade key length to 3072 bits (CNSA compliant)",
        newText: "modulusLength: 3072",
      },
    ],
  ],
  [
    "CRYPTO-004",
    [
      {
        title: "Migrate to Post-Quantum ML-KEM-768 (NIST FIPS 203)",
        newText: "ml-kem-768",
      },
      {
        title: "Migrate to Post-Quantum ML-DSA-65 (NIST FIPS 204)",
        newText: "ml-dsa-65",
      },
    ],
  ],
]);

function toAction(
  uri: string,
  diagnostic: Diagnostic,
  fix: Fix,
  preferred: boolean,
): CodeAction {
  return {
    title: fix.title,
    kind: "quickfix",
    diagnostics: [diagnostic],
    ...(preferred ? { isPreferred: true } : {}),
    edit: {
      changes: {
        [uri]: [{ range: diagnostic.range, newText: fix.newText }],
      },
    },
  };
}

/**
 * Generates automated QuickFix code actions for diagnosed cryptographic issues.
 */
export function getCodeActions(
  uri: string,
  text: string,
  range: Range,
  diagnostics: Diagnostic[],
): CodeAction[] {
  const lines = text.split(/\r?\n/);
  if (lines[range.start.line] === undefined) {
    return [];
  }
  // Only diagnostics on the requested line get fixes.
  return diagnostics
    .filter((diagnostic) => diagnostic.range.start.line === range.start.line)
    .flatMap((diagnostic) =>
      (FIXES.get(diagnostic.code) ?? []).map((fix, i) =>
        toAction(uri, diagnostic, fix, i === 0),
      ),
    );
}
