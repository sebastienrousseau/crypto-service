// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPTool } from "../types";
import {
  ML_KEM_768_PUBLIC_KEY_HEX,
  X25519_PUBLIC_KEY_HEX,
  hex,
  keyHandle,
  text,
} from "./schema-helpers";

export const STREAM_TOOLS: MCPTool[] = [
  {
    name: "crypto_stream_encrypt",
    description:
      "Encrypt plaintext using post-quantum hybrid STREAM AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305) with anti-truncation protection. Returns base64 ciphertext.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        plaintext: text("Plaintext string to encrypt."),
        x25519PublicKey: hex(
          "Hex-encoded X25519 public key (64 hex characters).",
          X25519_PUBLIC_KEY_HEX,
        ),
        mlKemPublicKey: hex(
          "Hex-encoded ML-KEM-768 public key (2368 hex characters).",
          ML_KEM_768_PUBLIC_KEY_HEX,
        ),
        chunkSize: {
          type: "integer",
          description: "Chunk size in bytes (minimum 64, default 65536).",
          minimum: 64,
        },
      },
      required: ["plaintext", "x25519PublicKey", "mlKemPublicKey"],
    },
  },
  {
    name: "crypto_stream_decrypt",
    description:
      "Decrypt a post-quantum hybrid STREAM AEAD ciphertext using server-held x25519 and ml-kem-768 key handles. Plaintext memory is wiped after decoding.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ciphertext: text("Base64-encoded STREAM ciphertext."),
        x25519KeyHandle: keyHandle(
          "Handle of the recipient X25519 key (or 32-byte symmetric-256 key).",
        ),
        mlKemKeyHandle: keyHandle("Handle of the recipient ML-KEM-768 key."),
        chunkSize: {
          type: "integer",
          description: "Chunk size used during encryption (default 65536).",
          minimum: 64,
        },
      },
      required: ["ciphertext", "x25519KeyHandle", "mlKemKeyHandle"],
    },
  },
  {
    name: "crypto_stream_multi_encrypt",
    description:
      "Encrypt plaintext for multiple recipients using post-quantum hybrid STREAM AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305) with anti-truncation framing. Returns base64 ciphertext.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        plaintext: text("Plaintext string to encrypt."),
        recipients: text(
          "JSON-serialized array of recipient public key descriptors: [{ recipientId, recipientX25519Public, recipientMlKemPublic }].",
        ),
        chunkSize: {
          type: "integer",
          description:
            "Chunk size in bytes (minimum 1024, maximum 16777216, default 65536).",
          minimum: 1024,
          maximum: 16777216,
        },
      },
      required: ["plaintext", "recipients"],
    },
  },
  {
    name: "crypto_stream_multi_decrypt",
    description:
      "Decrypt a multi-recipient post-quantum hybrid STREAM AEAD ciphertext using server-held x25519 and ml-kem-768 key handles. Plaintext memory is wiped after decoding.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ciphertext: text("Base64-encoded multi-recipient STREAM ciphertext."),
        x25519KeyHandle: keyHandle(
          "Handle of the recipient X25519 key (or 32-byte symmetric-256 key).",
        ),
        mlKemKeyHandle: keyHandle("Handle of the recipient ML-KEM-768 key."),
        recipientId: text(
          "Optional recipient identifier for direct slot lookup.",
        ),
        chunkSize: {
          type: "integer",
          description:
            "Chunk size in bytes (minimum 1024, maximum 16777216, default 65536).",
          minimum: 1024,
          maximum: 16777216,
        },
      },
      required: ["ciphertext", "x25519KeyHandle", "mlKemKeyHandle"],
    },
  },
  {
    name: "crypto_hybrid_kem_multi_encapsulate",
    description:
      "Encapsulate a symmetric key for multiple recipients using post-quantum hybrid KEM (X25519 + ML-KEM-768 + AES-256-GCM key wrapping). Returns recipient ciphertexts and a symmetric-256 keyHandle.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        recipients: text(
          "JSON-serialized array of recipient public key objects: [{ id?, x25519PublicKey, mlKemPublicKey }].",
        ),
        keyHandle: keyHandle(
          "Optional handle of an existing symmetric-256 key to encapsulate. If omitted, a fresh 256-bit DEK is generated.",
        ),
      },
      required: ["recipients"],
    },
  },
  {
    name: "crypto_hybrid_kem_multi_decapsulate",
    description:
      "Decapsulate a multi-recipient post-quantum hybrid KEM key using server-held x25519 and ml-kem-768 key handles. Returns a symmetric-256 keyHandle for the recovered DEK.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        x25519KeyHandle: keyHandle("Handle of recipient X25519 key."),
        mlKemKeyHandle: keyHandle("Handle of recipient ML-KEM-768 key."),
        ephemeralPublicKey: hex(
          "Hex-encoded sender ephemeral X25519 public key (64 hex characters).",
          X25519_PUBLIC_KEY_HEX,
        ),
        mlKemCiphertext: hex(
          "Hex-encoded ML-KEM-768 ciphertext (2176 hex characters).",
          2176,
          true,
        ),
        wrappedKey: text("Base64-encoded wrapped DEK (RFC 3394 AES Key Wrap)."),
        encryptedKey: text("Alias for wrappedKey."),
        recipients: text(
          "Optional JSON-serialized array of encrypted recipient objects: [{ id?, ephemeralPublicKey, mlKemCiphertext, encryptedKey }].",
        ),
        recipientId: text(
          "Optional recipient ID to select from recipients array.",
        ),
        recipientIndex: {
          type: "integer",
          description:
            "Optional index to select from recipients array (default 0).",
          minimum: 0,
        },
      },
      required: ["x25519KeyHandle", "mlKemKeyHandle"],
    },
  },
];
