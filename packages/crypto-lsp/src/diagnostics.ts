// SPDX-License-Identifier: Apache-2.0 OR MIT

import { Diagnostic, Range } from "./types";
import { CRYPTO_RULES } from "./rules";

/** One rule violation on a line, before it becomes a Diagnostic. */
interface Finding {
  rule: string;
  start: number;
  end: number;
  /** Shown in brackets between the rule's description and recommendation. */
  detail?: string | undefined;
}

type Check = (line: string) => Finding[];
type Span = (match: RegExpExecArray, line: string) => [number, number];

/** The first capture group, inside the quotes the pattern matched. */
const quoted: Span = (m) => [m.index + 1, m.index + 1 + m[1].length];
/** The whole match. */
const whole: Span = (m) => [m.index, m.index + m[0].length];
/** The first capture group, wherever it sits in the match. */
const group: Span = (m, line) => {
  const start = line.indexOf(m[1], m.index);
  return [start, start + m[1].length];
};

/** A finding for every match of `pattern` (global) on a line. */
function scan(
  rule: string,
  pattern: RegExp,
  span: Span,
  detail?: (match: RegExpExecArray) => string,
): Check {
  return (line) => {
    const findings: Finding[] = [];
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      const [start, end] = span(match, line);
      findings.push({ rule, start, end, detail: detail?.(match) });
    }
    return findings;
  };
}

/** CRYPTO-006: a BEGIN boundary that is not `-----BEGIN LABEL-----`. */
const malformedPem: Check = (line) => {
  const start = line.indexOf("-----BEGIN");
  if (start === -1 || /-----BEGIN [A-Z0-9 ]+-----/.test(line)) return [];
  return [{ rule: "CRYPTO-006", start, end: line.length }];
};

/** Every check, in the order its diagnostics are reported on a line. */
const CHECKS: Check[] = [
  // CRYPTO-001: Broken Hash Functions (MD5, SHA-1, MD4, RIPEMD160)
  scan("CRYPTO-001", /["'](md5|sha1|sha-1|md4|ripemd160)["']/gi, quoted),
  // CRYPTO-002: Insecure Symmetric Cipher or Mode (DES, 3DES, RC4, ECB mode)
  scan(
    "CRYPTO-002",
    /["'](aes-(?:128|192|256)-ecb|des|3des|des-ede3|rc4|blowfish)["']/gi,
    quoted,
  ),
  // CRYPTO-003: Inadequate Key Size (RSA < 2048)
  scan(
    "CRYPTO-003",
    /(?:modulusLength|bits)\s*[:=]\s*(512|1024)\b/gi,
    whole,
    (m) => `${m[1]} bits detected`,
  ),
  // CRYPTO-004: Quantum Vulnerable Public-Key Cryptography
  scan(
    "CRYPTO-004",
    /(?:algorithm\s*[:=]\s*|generateKeyPair(?:Sync)?\s*\(\s*)["'](rsa|ec|ecdsa|ecdh|ed25519)["']/gi,
    group,
    (m) => `${m[1].toUpperCase()} detected`,
  ),
  // CRYPTO-005: Hardcoded Secret Material
  scan(
    "CRYPTO-005",
    /(?:secret_key|private_key|apiKey|cryptoKey)\s*[:=]\s*["']([0-9a-fA-F]{32,})["']/gi,
    group,
  ),
  // CRYPTO-006: Malformed PEM Block
  malformedPem,
];

function toDiagnostic(finding: Finding, line: number): Diagnostic {
  const rule = CRYPTO_RULES[finding.rule];
  const message = finding.detail
    ? `${rule.description} (${finding.detail}). ${rule.recommendation}`
    : `${rule.description} ${rule.recommendation}`;
  return {
    range: createRange(line, finding.start, line, finding.end),
    severity: rule.severity,
    code: rule.id,
    source: "crypto-lsp",
    message,
  };
}

/**
 * Analyzes a text document and produces LSP diagnostics for cryptographic vulnerabilities.
 */
export function analyzeDocument(_uri: string, text: string): Diagnostic[] {
  return text
    .split(/\r?\n/)
    .flatMap((line, lineIndex) =>
      CHECKS.flatMap((check) => check(line)).map((finding) =>
        toDiagnostic(finding, lineIndex),
      ),
    );
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
