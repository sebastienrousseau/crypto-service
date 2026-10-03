// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "node:fs";
import path from "node:path";
import {
  CryptoAsset,
  CryptographicAssetType,
  QuantumResistanceLevel,
} from "./types";

interface AssetRule {
  pattern: RegExp;
  name: string;
  algorithm: string;
  type: CryptographicAssetType;
  keySize?: number;
  mode?: string;
  resistanceLevel: QuantumResistanceLevel;
  standard: string;
}

const ASSET_RULES: AssetRule[] = [
  // Post-Quantum KEM
  {
    pattern: /\bml[-_]?kem[-_]?512\b/i,
    name: "ML-KEM-512",
    algorithm: "ML-KEM",
    type: "kem",
    keySize: 512,
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 203",
  },
  {
    pattern: /(?<!(?:x25519|x448)[-_])\bml[-_]?kem[-_]?768\b/i,
    name: "ML-KEM-768",
    algorithm: "ML-KEM",
    type: "kem",
    keySize: 768,
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 203",
  },
  {
    pattern: /\bml[-_]?kem[-_]?1024\b/i,
    name: "ML-KEM-1024",
    algorithm: "ML-KEM",
    type: "kem",
    keySize: 1024,
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 203",
  },

  // Post-Quantum Signatures
  {
    pattern: /\bml[-_]?dsa[-_]?44\b/i,
    name: "ML-DSA-44",
    algorithm: "ML-DSA",
    type: "signature",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 204",
  },
  {
    pattern: /\bml[-_]?dsa[-_]?65\b/i,
    name: "ML-DSA-65",
    algorithm: "ML-DSA",
    type: "signature",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 204",
  },
  {
    pattern: /\bml[-_]?dsa[-_]?87\b/i,
    name: "ML-DSA-87",
    algorithm: "ML-DSA",
    type: "signature",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 204",
  },
  {
    pattern: /\bslh[-_]?dsa\b/i,
    name: "SLH-DSA",
    algorithm: "SLH-DSA",
    type: "signature",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 205",
  },
  {
    pattern: /\bfn[-_]?dsa\b/i,
    name: "FN-DSA",
    algorithm: "FN-DSA",
    type: "signature",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 206",
  },
  {
    pattern: /\bx25519[-_]ml[-_]?kem[-_]?768\b/i,
    name: "X25519 + ML-KEM-768",
    algorithm: "Hybrid KEM",
    type: "kem",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "IETF Hybrid / NIST IR 8547",
  },

  // Symmetric Ciphers
  {
    pattern: /\baes[-_]?256[-_]?gcm\b/i,
    name: "AES-256-GCM",
    algorithm: "AES",
    type: "cipher",
    keySize: 256,
    mode: "GCM",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST SP 800-38D",
  },
  {
    pattern: /\baes[-_]?128[-_]?gcm\b/i,
    name: "AES-128-GCM",
    algorithm: "AES",
    type: "cipher",
    keySize: 128,
    mode: "GCM",
    resistanceLevel: "TRANSITIONAL_HYBRID",
    standard: "NIST SP 800-38D",
  },
  {
    pattern: /\baes[-_]?(?:128|256)[-_]?cbc\b/i,
    name: "AES-CBC",
    algorithm: "AES",
    type: "cipher",
    mode: "CBC",
    resistanceLevel: "TRANSITIONAL_HYBRID",
    standard: "NIST SP 800-38A",
  },
  {
    pattern: /\baes[-_]?(?:128|256)[-_]?ecb\b/i,
    name: "AES-ECB",
    algorithm: "AES",
    type: "cipher",
    mode: "ECB",
    resistanceLevel: "DEPRECATED_BROKEN",
    standard: "INSECURE (NIST Disallowed)",
  },
  {
    pattern: /\bchacha20[-_]?poly1305\b/i,
    name: "ChaCha20-Poly1305",
    algorithm: "ChaCha20",
    type: "cipher",
    keySize: 256,
    mode: "Poly1305",
    resistanceLevel: "QUANTUM_SAFE",
    standard: "RFC 8439",
  },
  {
    pattern: /\b(?:3des|des[-_]?ede3)\b/i,
    name: "Triple-DES",
    algorithm: "3DES",
    type: "cipher",
    resistanceLevel: "DEPRECATED_BROKEN",
    standard: "DEPRECATED (NIST SP 800-131A)",
  },
  {
    pattern: /\b(?:des|rc4|blowfish)\b/i,
    name: "Legacy Cipher",
    algorithm: "Legacy",
    type: "cipher",
    resistanceLevel: "DEPRECATED_BROKEN",
    standard: "DEPRECATED (Broken)",
  },

  // Classical Public Key
  {
    pattern: /\bed25519\b/i,
    name: "Ed25519",
    algorithm: "Ed25519",
    type: "signature",
    keySize: 256,
    resistanceLevel: "VULNERABLE_CRQC",
    standard: "RFC 8032",
  },
  {
    pattern: /\bx25519\b(?![-_]ml[-_]?kem)/i,
    name: "X25519",
    algorithm: "X25519",
    type: "kdf",
    keySize: 256,
    resistanceLevel: "VULNERABLE_CRQC",
    standard: "RFC 7748",
  },
  {
    pattern: /\b(?:ecdsa|ecdh|prime256v1|secp256r1|secp384r1)\b/i,
    name: "ECDSA / ECDH",
    algorithm: "ECC",
    type: "signature",
    resistanceLevel: "VULNERABLE_CRQC",
    standard: "NIST FIPS 186-5",
  },
  {
    pattern: /\brsa\b/i,
    name: "RSA",
    algorithm: "RSA",
    type: "cipher",
    resistanceLevel: "VULNERABLE_CRQC",
    standard: "PKCS #1",
  },

  // Hashes
  {
    pattern: /\bsha[-_]?256\b/i,
    name: "SHA-256",
    algorithm: "SHA-2",
    type: "hash",
    keySize: 256,
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 180-4",
  },
  {
    pattern: /\bsha[-_]?512\b/i,
    name: "SHA-512",
    algorithm: "SHA-2",
    type: "hash",
    keySize: 512,
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 180-4",
  },
  {
    pattern: /\bsha[-_]?3[-_]?256\b/i,
    name: "SHA3-256",
    algorithm: "SHA-3",
    type: "hash",
    keySize: 256,
    resistanceLevel: "QUANTUM_SAFE",
    standard: "NIST FIPS 202",
  },
  {
    pattern: /\b(?:md5|md4|ripemd160)\b/i,
    name: "Broken Hash",
    algorithm: "MD5/MD4",
    type: "hash",
    resistanceLevel: "DEPRECATED_BROKEN",
    standard: "DEPRECATED (RFC 6151)",
  },
  {
    pattern: /\bsha[-_]?1\b/i,
    name: "SHA-1",
    algorithm: "SHA-1",
    type: "hash",
    keySize: 160,
    resistanceLevel: "DEPRECATED_BROKEN",
    standard: "DEPRECATED (NIST SP 800-131A)",
  },

  // Certificates & Armored Keys
  {
    pattern: /-----BEGIN CERTIFICATE-----/,
    name: "X.509 Certificate",
    algorithm: "X.509",
    type: "certificate",
    resistanceLevel: "VULNERABLE_CRQC",
    standard: "RFC 5280",
  },
  {
    pattern: /-----BEGIN (?:RSA|EC) PRIVATE KEY-----/,
    name: "Private Key Material",
    algorithm: "PKCS",
    type: "key",
    resistanceLevel: "VULNERABLE_CRQC",
    standard: "RFC 7468",
  },
];

/**
 * Scans a code string and extracts cryptographic assets.
 */
export function scanCode(
  sourceText: string,
  filename = "unknown",
): CryptoAsset[] {
  const assets: CryptoAsset[] = [];
  const lines = sourceText.split(/\r?\n/);
  const seenOnLine = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of ASSET_RULES) {
      if (rule.pattern.test(line)) {
        const dedupeKey = `${i}:${rule.name}`;
        if (!seenOnLine.has(dedupeKey)) {
          seenOnLine.add(dedupeKey);
          assets.push({
            name: rule.name,
            algorithm: rule.algorithm,
            type: rule.type,
            keySize: rule.keySize,
            mode: rule.mode,
            quantumResistant: rule.resistanceLevel === "QUANTUM_SAFE",
            resistanceLevel: rule.resistanceLevel,
            standard: rule.standard,
            file: filename,
            line: i + 1,
          });
        }
      }
    }
  }

  return assets;
}

/**
 * Recursively scans a directory for files and extracts cryptographic assets.
 */
export function scanDirectory(dirPath: string): CryptoAsset[] {
  const assets: CryptoAsset[] = [];
  if (!fs.existsSync(dirPath)) {
    return assets;
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    const content = fs.readFileSync(dirPath, "utf8");
    return scanCode(content, dirPath);
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist"
    ) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      assets.push(...scanDirectory(fullPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (
        [
          ".ts",
          ".js",
          ".mjs",
          ".cjs",
          ".json",
          ".pem",
          ".crt",
          ".key",
        ].includes(ext)
      ) {
        const content = fs.readFileSync(fullPath, "utf8");
        assets.push(...scanCode(content, fullPath));
      }
    }
  }

  return assets;
}
