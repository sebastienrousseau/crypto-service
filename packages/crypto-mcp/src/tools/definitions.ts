// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPTool } from "../types";

/** Key types accepted by `crypto_generate_key`. */
export const KEY_TYPES = ["rsa", "ecc", "ed25519", "ml-kem-768"];

/** RSA modulus lengths accepted by `crypto_generate_key`. */
export const RSA_MODULUS_LENGTHS = [2048, 3072, 4096];

/** Elliptic curves accepted by `crypto_generate_key`. */
export const EC_CURVES = ["prime256v1", "secp384r1", "secp256k1"];

/** Digest algorithms accepted by `crypto_hash`. */
export const HASH_ALGORITHMS = [
  "sha256",
  "sha384",
  "sha512",
  "sha3-256",
  "blake2b512",
];

/** JSON-schema definitions of every tool exposed by the MCP server. */
export const TOOLS: MCPTool[] = [
  {
    name: "crypto_generate_key",
    description:
      "Generate cryptographic keypairs for classical (RSA, ECC, Ed25519) or post-quantum (ML-KEM-768, FIPS 203) algorithms.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Key algorithm: 'rsa', 'ecc', 'ed25519', or 'ml-kem-768'.",
          enum: KEY_TYPES,
        },
        modulusLength: {
          type: "number",
          description:
            "Modulus length for RSA (2048, 3072, 4096). Default is 2048.",
        },
        curve: {
          type: "string",
          description:
            "Elliptic curve: 'prime256v1' (P-256), 'secp384r1' (P-384), or 'secp256k1'.",
          enum: EC_CURVES,
        },
      },
      required: ["type"],
    },
  },
  {
    name: "crypto_encrypt",
    description:
      "Encrypt plaintext using authenticated symmetric encryption (AES-256-GCM, ChaCha20-Poly1305) or asymmetric keys.",
    inputSchema: {
      type: "object",
      properties: {
        plaintext: {
          type: "string",
          description: "Plaintext string to encrypt.",
        },
        algorithm: {
          type: "string",
          description:
            "Encryption algorithm ('aes-256-gcm' or 'chacha20-poly1305'). Default is 'aes-256-gcm'.",
          enum: ["aes-256-gcm", "chacha20-poly1305"],
        },
        key: {
          type: "string",
          description:
            "Hex-encoded 256-bit key (64 hex characters). If omitted, a secure 256-bit key is generated and returned.",
        },
      },
      required: ["plaintext"],
    },
  },
  {
    name: "crypto_decrypt",
    description:
      "Decrypt ciphertext encrypted with authenticated AES-256-GCM or ChaCha20-Poly1305.",
    inputSchema: {
      type: "object",
      properties: {
        ciphertext: {
          type: "string",
          description: "Hex-encoded or base64-encoded ciphertext payload.",
        },
        algorithm: {
          type: "string",
          description:
            "Algorithm used for encryption ('aes-256-gcm' or 'chacha20-poly1305').",
          enum: ["aes-256-gcm", "chacha20-poly1305"],
        },
        key: {
          type: "string",
          description: "Hex-encoded 256-bit key (64 hex characters).",
        },
        iv: {
          type: "string",
          description: "Hex-encoded initialization vector / nonce.",
        },
        authTag: {
          type: "string",
          description: "Hex-encoded 128-bit authentication tag.",
        },
      },
      required: ["ciphertext", "key", "iv", "authTag"],
    },
  },
  {
    name: "crypto_sign",
    description: "Digitally sign data using Ed25519, RSA-PSS, or HMAC.",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Data string to sign.",
        },
        algorithm: {
          type: "string",
          description:
            "Signing algorithm ('ed25519', 'rsa-pss', or 'hmac-sha256').",
          enum: ["ed25519", "rsa-pss", "hmac-sha256"],
        },
        privateKey: {
          type: "string",
          description: "Private key in PEM format or secret key for HMAC.",
        },
      },
      required: ["data", "algorithm", "privateKey"],
    },
  },
  {
    name: "crypto_verify",
    description:
      "Verify digital signature against original data and public key.",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Original data string.",
        },
        signature: {
          type: "string",
          description: "Hex-encoded signature.",
        },
        algorithm: {
          type: "string",
          description:
            "Signing algorithm ('ed25519', 'rsa-pss', or 'hmac-sha256').",
          enum: ["ed25519", "rsa-pss", "hmac-sha256"],
        },
        publicKey: {
          type: "string",
          description: "Public key in PEM format or secret key for HMAC.",
        },
      },
      required: ["data", "signature", "algorithm", "publicKey"],
    },
  },
  {
    name: "crypto_hash",
    description:
      "Compute cryptographic digest (SHA-256, SHA-384, SHA-512, SHA3-256, BLAKE2b512).",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "string",
          description: "Data string to hash.",
        },
        algorithm: {
          type: "string",
          description: "Hash algorithm.",
          enum: HASH_ALGORITHMS,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "crypto_kms_wrap",
    description:
      "Wrap a Data Encryption Key (DEK) under a Key Encryption Key held by a KMS provider. Only the 'local' provider (random, in-process key material that does not survive a restart) is configured.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "KMS provider ('aws', 'gcp', 'azure', 'vault', or 'local'). Only 'local' is configured; the others return an error.",
          enum: ["aws", "gcp", "azure", "vault", "local"],
        },
        keyId: {
          type: "string",
          description:
            "Label of the Key Encryption Key (KEK). It names the key; it is never used to derive it.",
        },
        dek: {
          type: "string",
          description: "Hex-encoded 256-bit Data Encryption Key to wrap.",
        },
      },
      required: ["provider", "keyId", "dek"],
    },
  },
  {
    name: "crypto_kms_unwrap",
    description:
      "Unwrap a Data Encryption Key (DEK) previously wrapped by crypto_kms_wrap in this server process. Only the 'local' provider is configured.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "KMS provider ('aws', 'gcp', 'azure', 'vault', or 'local'). Only 'local' is configured; the others return an error.",
          enum: ["aws", "gcp", "azure", "vault", "local"],
        },
        keyId: {
          type: "string",
          description: "Key Encryption Key (KEK) identifier.",
        },
        wrappedKey: {
          type: "string",
          description: "Hex-encoded wrapped key payload.",
        },
      },
      required: ["provider", "keyId", "wrappedKey"],
    },
  },
  {
    name: "crypto_inspect_key",
    description:
      "Inspect and parse PEM certificate, public key, or OpenPGP armored block.",
    inputSchema: {
      type: "object",
      properties: {
        keyData: {
          type: "string",
          description: "PEM or armored key string.",
        },
      },
      required: ["keyData"],
    },
  },
  {
    name: "crypto_audit_cbom",
    description:
      "Generate a Cryptographic Bill of Materials (CBOM) inventory from cryptographic identifiers.",
    inputSchema: {
      type: "object",
      properties: {
        algorithms: {
          type: "string",
          description:
            "Comma-separated list of algorithm names to evaluate (e.g. 'RSA-2048,AES-256-GCM,ML-KEM-768,SHA-1').",
        },
      },
      required: ["algorithms"],
    },
  },
];
