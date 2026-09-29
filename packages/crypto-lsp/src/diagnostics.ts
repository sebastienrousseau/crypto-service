// SPDX-License-Identifier: Apache-2.0 OR MIT

import { Diagnostic, Range } from "./types";
import { CRYPTO_RULES } from "./rules";

/**
 * Analyzes a text document and produces LSP diagnostics for cryptographic vulnerabilities.
 */
export function analyzeDocument(_uri: string, text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = text.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // CRYPTO-001: Broken Hash Functions (MD5, SHA-1, MD4, RIPEMD160)
    const brokenHashRegex = /["'](md5|sha1|sha-1|md4|ripemd160)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = brokenHashRegex.exec(line)) !== null) {
      const startChar = match.index + 1;
      const endChar = startChar + match[1].length;
      const rule = CRYPTO_RULES["CRYPTO-001"];
      diagnostics.push({
        range: createRange(lineIndex, startChar, lineIndex, endChar),
        severity: rule.severity,
        code: rule.id,
        source: "crypto-lsp",
        message: `${rule.description} ${rule.recommendation}`,
      });
    }

    // CRYPTO-002: Insecure Symmetric Cipher or Mode (DES, 3DES, RC4, ECB mode)
    const insecureCipherRegex =
      /["'](aes-(?:128|192|256)-ecb|des|3des|des-ede3|rc4|blowfish)["']/gi;
    while ((match = insecureCipherRegex.exec(line)) !== null) {
      const startChar = match.index + 1;
      const endChar = startChar + match[1].length;
      const rule = CRYPTO_RULES["CRYPTO-002"];
      diagnostics.push({
        range: createRange(lineIndex, startChar, lineIndex, endChar),
        severity: rule.severity,
        code: rule.id,
        source: "crypto-lsp",
        message: `${rule.description} ${rule.recommendation}`,
      });
    }

    // CRYPTO-003: Inadequate Key Size (RSA < 2048)
    const weakRsaRegex = /(?:modulusLength|bits)\s*[:=]\s*(512|1024)\b/gi;
    while ((match = weakRsaRegex.exec(line)) !== null) {
      const startChar = match.index;
      const endChar = match.index + match[0].length;
      const rule = CRYPTO_RULES["CRYPTO-003"];
      diagnostics.push({
        range: createRange(lineIndex, startChar, lineIndex, endChar),
        severity: rule.severity,
        code: rule.id,
        source: "crypto-lsp",
        message: `${rule.description} (${match[1]} bits detected). ${rule.recommendation}`,
      });
    }

    // CRYPTO-004: Quantum Vulnerable Public-Key Cryptography
    const classicalPqRegex =
      /(?:algorithm\s*[:=]\s*|generateKeyPair(?:Sync)?\s*\(\s*)["'](rsa|ec|ecdsa|ecdh|ed25519)["']/gi;
    while ((match = classicalPqRegex.exec(line)) !== null) {
      const alg = match[1];
      const startChar = line.indexOf(alg, match.index);
      const endChar = startChar + alg.length;
      const rule = CRYPTO_RULES["CRYPTO-004"];
      diagnostics.push({
        range: createRange(lineIndex, startChar, lineIndex, endChar),
        severity: rule.severity,
        code: rule.id,
        source: "crypto-lsp",
        message: `${rule.description} (${alg.toUpperCase()} detected). ${rule.recommendation}`,
      });
    }

    // CRYPTO-005: Hardcoded Secret Material
    const hardcodedKeyRegex =
      /(?:secret_key|private_key|apiKey|cryptoKey)\s*[:=]\s*["']([0-9a-fA-F]{32,})["']/gi;
    while ((match = hardcodedKeyRegex.exec(line)) !== null) {
      const startChar = line.indexOf(match[1], match.index);
      const endChar = startChar + match[1].length;
      const rule = CRYPTO_RULES["CRYPTO-005"];
      diagnostics.push({
        range: createRange(lineIndex, startChar, lineIndex, endChar),
        severity: rule.severity,
        code: rule.id,
        source: "crypto-lsp",
        message: `${rule.description} ${rule.recommendation}`,
      });
    }

    // CRYPTO-006: Malformed PEM Block
    if (
      line.includes("-----BEGIN") &&
      !line.match(/-----BEGIN [A-Z0-9 ]+-----/)
    ) {
      const startChar = line.indexOf("-----BEGIN");
      const endChar = line.length;
      const rule = CRYPTO_RULES["CRYPTO-006"];
      diagnostics.push({
        range: createRange(lineIndex, startChar, lineIndex, endChar),
        severity: rule.severity,
        code: rule.id,
        source: "crypto-lsp",
        message: `${rule.description} ${rule.recommendation}`,
      });
    }
  }

  return diagnostics;
}

function createRange(
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): Range {
  return {
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
  };
}
