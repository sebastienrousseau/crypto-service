// SPDX-License-Identifier: Apache-2.0 OR MIT

import { Hover, Position } from "./types";

interface HoverDoc {
  title: string;
  category: string;
  securityLevel: string;
  quantumSafe: boolean;
  standard: string;
  description: string;
}

const KNOWLEDGE_BASE: Record<string, HoverDoc> = {
  "ml-kem": {
    title: "ML-KEM (Module-Lattice-Based Key-Encapsulation Mechanism)",
    category: "Post-Quantum Key Exchange",
    securityLevel: "NIST Security Categories 1, 3, 5 (ML-KEM-512, 768, 1024)",
    quantumSafe: true,
    standard: "NIST FIPS 203 (Final August 2024)",
    description:
      "Primary post-quantum key encapsulation mechanism standardized by NIST to replace classical Diffie-Hellman and RSA key transport against quantum decryption.",
  },
  "ml-dsa": {
    title: "ML-DSA (Module-Lattice-Based Digital Signature Algorithm)",
    category: "Post-Quantum Digital Signature",
    securityLevel: "NIST Security Categories 2, 3, 5 (ML-DSA-44, 65, 87)",
    quantumSafe: true,
    standard: "NIST FIPS 204 (Final August 2024)",
    description:
      "Primary post-quantum digital signature algorithm standardized by NIST based on the CRYSTALS-Dilithium lattice problem.",
  },
  "slh-dsa": {
    title: "SLH-DSA (Stateless Hash-Based Digital Signature Algorithm)",
    category: "Post-Quantum Digital Signature",
    securityLevel: "NIST Security Categories 1, 3, 5 (SPHINCS+)",
    quantumSafe: true,
    standard: "NIST FIPS 205 (Final August 2024)",
    description:
      "Stateless hash-based digital signature serving as a conservative mathematical fallback independent of structured lattice hardness assumptions.",
  },
  "aes-256-gcm": {
    title: "AES-256-GCM (Galois/Counter Mode)",
    category: "Authenticated Symmetric Cipher (AEAD)",
    securityLevel:
      "256-bit key (128-bit quantum security via Grover's algorithm)",
    quantumSafe: true,
    standard: "NIST SP 800-38D / FIPS 197",
    description:
      "Industry-standard authenticated encryption providing high-throughput confidentiality and data integrity with hardware acceleration.",
  },
  "chacha20-poly1305": {
    title: "ChaCha20-Poly1305",
    category: "Authenticated Symmetric Cipher (AEAD)",
    securityLevel: "256-bit key",
    quantumSafe: true,
    standard: "RFC 8439 / IETF",
    description:
      "High-speed stream cipher with Poly1305 authenticator, immune to cache-timing side-channel attacks on architectures without AES-NI instructions.",
  },
  ed25519: {
    title: "Ed25519 (Edwards-curve Digital Signature Algorithm)",
    category: "Classical Elliptic Curve Signature",
    securityLevel: "128-bit classical security margin",
    quantumSafe: false,
    standard: "RFC 8032 / FIPS 186-5",
    description:
      "Fast, deterministic signature scheme over Curve25519. Vulnerable to Shor's algorithm on a Cryptanalytically Relevant Quantum Computer (CRQC).",
  },
  rsa: {
    title: "RSA (Rivest-Shamir-Adleman)",
    category: "Classical Public-Key Cryptosystem",
    securityLevel: "2048-bit: ~112-bit security | 3072-bit: ~128-bit security",
    quantumSafe: false,
    standard: "PKCS #1 / RFC 8017 / NIST SP 800-56B",
    description:
      "Classical integer factorization-based cryptosystem. Fully vulnerable to polynomial-time recovery via Shor's algorithm on a CRQC.",
  },
  md5: {
    title: "MD5 (Message Digest Algorithm 5)",
    category: "Cryptographic Hash Function (DEPRECATED)",
    securityLevel: "0-bit collision resistance (Cryptographically Broken)",
    quantumSafe: false,
    standard: "DEPRECATED (RFC 6151 / NIST SP 800-131A)",
    description:
      "Severely vulnerable to practical collision attacks. Must never be used for security-sensitive operations or signatures.",
  },
  "sha-1": {
    title: "SHA-1 (Secure Hash Algorithm 1)",
    category: "Cryptographic Hash Function (DEPRECATED)",
    securityLevel: "< 60-bit collision resistance (Demonstrated Collisions)",
    quantumSafe: false,
    standard: "DEPRECATED (NIST SP 800-131A / SHAttered)",
    description:
      "Practical collisions generated since 2017. Disallowed for digital signatures and certificates across all modern compliance regimes.",
  },
};

/**
 * Returns hover documentation for the cryptographic token at the given position.
 */
export function getHover(text: string, position: Position): Hover | null {
  const lines = text.split(/\r?\n/);
  if (position.line < 0 || position.line >= lines.length) {
    return null;
  }

  const line = lines[position.line];
  const char = position.character;

  for (const [key, doc] of Object.entries(KNOWLEDGE_BASE)) {
    const regex = new RegExp(`\\b${key.replace(/-/g, "[ -]?")}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (char >= start && char <= end) {
        const md = [
          `### ${doc.title}`,
          `**Category:** ${doc.category}`,
          `**Security:** ${doc.securityLevel}`,
          `**Quantum Resistant:** ${doc.quantumSafe ? "✅ Yes" : "❌ No (Vulnerable to Shor's Algorithm)"}`,
          `**Standard:** ${doc.standard}`,
          "",
          doc.description,
        ].join("\n\n");

        return {
          contents: { kind: "markdown", value: md },
          range: {
            start: { line: position.line, character: start },
            end: { line: position.line, character: end },
          },
        };
      }
    }
  }

  return null;
}
