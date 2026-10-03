// SPDX-License-Identifier: Apache-2.0 OR MIT
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { KEY_ID_SCHEMA } from "../../utils/keys";

/** Request schema for `POST /v2/stream/sign`. */
export const SIGN_SCHEMA = {
  tags: ["Streaming"],
  summary: "Batch sign messages with sub-millisecond throughput",
  description:
    "Process high-throughput batch digital signing operations over multiple payloads.",
  body: {
    type: "object",
    required: ["items"],
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 1000,
        items: {
          type: "object",
          required: ["id", "message", "keyId"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            message: { type: "string", minLength: 1 },
            keyId: KEY_ID_SCHEMA,
          },
        },
      },
    },
  },
};

/** Request schema for `POST /v2/stream/verify`. */
export const VERIFY_SCHEMA = {
  tags: ["Streaming"],
  summary: "Batch verify digital signatures",
  description:
    "Batch verification pipeline for high-concurrency payment and transaction verification.",
  body: {
    type: "object",
    required: ["items"],
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 1000,
        items: {
          type: "object",
          required: ["id", "message", "signature", "publicKey"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            message: { type: "string", minLength: 1 },
            signature: { type: "string", minLength: 1 },
            publicKey: { type: "string", minLength: 64, maxLength: 64 },
          },
        },
      },
    },
  },
};

/** Request schema for `POST /v2/stream/iso20022`. */
export const ISO20022_SCHEMA = {
  tags: ["Wholesale Payments"],
  summary: "Verify ISO 20022 post-quantum dual-signature envelope",
  description:
    "Validates the payload digest and both the Ed25519 and ML-DSA signatures of a pacs.008, pain.001 or camt.053 envelope. Signatures are checked against trustedKeys, the signer's public keys from the caller's own registry; the public keys inside the envelope are ignored.",
  body: {
    type: "object",
    required: ["envelope", "payload", "trustedKeys"],
    additionalProperties: false,
    properties: {
      trustedKeys: {
        type: "object",
        required: ["classicalPublicKey", "postQuantumPublicKey"],
        additionalProperties: false,
        properties: {
          classicalPublicKey: { type: "string", minLength: 1 },
          postQuantumPublicKey: { type: "string", minLength: 1 },
        },
      },
      envelope: {
        type: "object",
        required: [
          "messageId",
          "messageType",
          "payloadDigest",
          "digestAlgorithm",
          "timestamp",
          "classical",
          "postQuantum",
        ],
        additionalProperties: false,
        properties: {
          messageId: { type: "string" },
          messageType: {
            type: "string",
            enum: ["pacs.008", "pain.001", "camt.053", "generic"],
          },
          payloadDigest: { type: "string" },
          digestAlgorithm: {
            type: "string",
            enum: ["sha256", "sha384", "sha512"],
          },
          timestamp: { type: "string" },
          classical: {
            type: "object",
            required: ["algorithm", "signature", "publicKey"],
            additionalProperties: false,
            properties: {
              algorithm: { type: "string" },
              signature: { type: "string" },
              publicKey: { type: "string" },
            },
          },
          postQuantum: {
            type: "object",
            required: ["algorithm", "signature", "publicKey"],
            additionalProperties: false,
            properties: {
              algorithm: {
                type: "string",
                enum: ["ml-dsa-44", "ml-dsa-65", "ml-dsa-87"],
              },
              signature: { type: "string" },
              publicKey: { type: "string" },
            },
          },
        },
      },
      payload: {},
    },
  },
};

/** Request schema for `POST /v2/stream/pq-encrypt`. */
export const STREAM_PQ_ENCRYPT_SCHEMA = {
  tags: ["Streaming"],
  summary: "Encrypt stream with hybrid post-quantum AEAD",
  description:
    "Encrypts plaintext using chunked hybrid post-quantum STREAM (X25519 + ML-KEM-768 + XChaCha20-Poly1305).",
  body: {
    type: "object",
    required: ["x25519PublicKey", "mlKemPublicKey", "plaintext"],
    additionalProperties: false,
    properties: {
      x25519PublicKey: { type: "string", minLength: 64, maxLength: 64 },
      mlKemPublicKey: { type: "string", minLength: 1 },
      plaintext: { type: "string", minLength: 1 },
      chunkSize: { type: "integer", minimum: 64, maximum: 1048576 },
    },
  },
};

/** Request schema for `POST /v2/stream/pq-decrypt`. */
export const STREAM_PQ_DECRYPT_SCHEMA = {
  tags: ["Streaming"],
  summary: "Decrypt stream with server-held hybrid post-quantum key",
  description:
    "Decrypts hybrid post-quantum STREAM ciphertext using a server-held x25519-ml-kem-768 key.",
  body: {
    type: "object",
    required: ["keyId", "ciphertext"],
    additionalProperties: false,
    properties: {
      keyId: KEY_ID_SCHEMA,
      ciphertext: { type: "string", minLength: 1 },
      chunkSize: { type: "integer", minimum: 64, maximum: 1048576 },
    },
  },
};

/** Request schema for `POST /v2/stream/multi-pq-encrypt`. */
export const STREAM_MULTI_PQ_ENCRYPT_SCHEMA = {
  tags: ["Streaming"],
  summary:
    "Encrypt stream for multiple recipients with hybrid post-quantum AEAD",
  description:
    "Encrypts plaintext for multiple recipients using hybrid post-quantum key encapsulation and chunked AEAD.",
  body: {
    type: "object",
    required: ["recipients", "plaintext"],
    additionalProperties: false,
    properties: {
      recipients: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        items: {
          type: "object",
          required: ["recipientId", "x25519PublicKey", "mlKemPublicKey"],
          additionalProperties: false,
          properties: {
            recipientId: { type: "string", minLength: 1, maxLength: 255 },
            x25519PublicKey: { type: "string", minLength: 64, maxLength: 64 },
            mlKemPublicKey: { type: "string", minLength: 1 },
          },
        },
      },
      plaintext: { type: "string", minLength: 1 },
      chunkSize: { type: "integer", minimum: 1024, maximum: 16777216 },
    },
  },
};

/** Request schema for `POST /v2/stream/multi-pq-decrypt`. */
export const STREAM_MULTI_PQ_DECRYPT_SCHEMA = {
  tags: ["Streaming"],
  summary:
    "Decrypt multi-recipient stream with server-held hybrid post-quantum key",
  description:
    "Decrypts multi-recipient hybrid post-quantum STREAM ciphertext using a server-held x25519-ml-kem-768 key.",
  body: {
    type: "object",
    required: ["keyId", "ciphertext"],
    additionalProperties: false,
    properties: {
      keyId: KEY_ID_SCHEMA,
      recipientId: { type: "string", minLength: 1, maxLength: 255 },
      ciphertext: { type: "string", minLength: 1 },
      chunkSize: { type: "integer", minimum: 1024, maximum: 16777216 },
    },
  },
};
