// SPDX-License-Identifier: Apache-2.0 OR MIT

import { MCPTool, MCPToolParameterProperty } from "../types";
import { KEY_HANDLE_PATTERN, MAX_KEYS } from "./keystore";

/** Key types accepted by `crypto_generate_key`. */
export const KEY_TYPES = [
  "rsa",
  "ecc",
  "ed25519",
  "ml-kem-768",
  "symmetric-256",
  "hmac-sha256",
];

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

/** AEAD algorithms accepted by `crypto_encrypt` and `crypto_decrypt`. */
const AEAD_ALGORITHMS = ["aes-256-gcm", "chacha20-poly1305"];

/** KMS providers named by the KMS tools; only "local" is configured. */
const KMS_PROVIDERS = ["aws", "gcp", "azure", "vault", "local"];

/** Largest data, plaintext or algorithm-list string a tool accepts. */
export const MAX_TEXT_LENGTH = 1_048_576;

/** Largest PEM or armored key a tool accepts. */
export const MAX_KEY_LENGTH = 16_384;

/** Whole bytes, hex-encoded. */
const HEX_BYTES = "^(?:[0-9a-fA-F]{2})*$";

/** Hex characters of an ML-KEM-768 public key (1184 bytes). */
const ML_KEM_768_PUBLIC_KEY_HEX = 2368;

/** Hex characters of an ML-KEM-768 ciphertext (1088 bytes). */
const ML_KEM_768_CIPHERTEXT_HEX = 2176;

/** Sentence appended to every tool that issues a key handle. */
const HANDLE_NOTE =
  "Secret key material stays inside the server; only an opaque keyHandle is returned.";

/** A key handle issued by this server. */
function keyHandle(description: string): MCPToolParameterProperty {
  return {
    type: "string",
    description: `${description} Key handles look like 'kh_' followed by 32 hex characters.`,
    maxLength: 35,
    pattern: KEY_HANDLE_PATTERN,
  };
}

/** Free text up to {@link MAX_TEXT_LENGTH}. */
function text(description: string): MCPToolParameterProperty {
  return { type: "string", description, maxLength: MAX_TEXT_LENGTH };
}

/** Hex of exactly `length` characters, or up to `length` when `upTo`. */
function hex(
  description: string,
  length: number,
  upTo = false,
): MCPToolParameterProperty {
  return {
    type: "string",
    description,
    minLength: upTo ? 2 : length,
    maxLength: length,
    pattern: HEX_BYTES,
  };
}

/** A string restricted to `values`. */
function oneOf(
  description: string,
  values: string[],
): MCPToolParameterProperty {
  return { type: "string", description, enum: values };
}

const KMS_PROVIDER = oneOf(
  "KMS provider ('aws', 'gcp', 'azure', 'vault', or 'local'). Only 'local' (random, in-process key material that does not survive a restart) is configured; the others return an error.",
  KMS_PROVIDERS,
);

const KEK_LABEL: MCPToolParameterProperty = {
  type: "string",
  description:
    "Label of the Key Encryption Key (KEK). It names the key; it is never used to derive it.",
  minLength: 1,
  maxLength: 256,
};

const KEY_TOOLS: MCPTool[] = [
  {
    name: "crypto_generate_key",
    description: `Generate a key inside the server: a classical (RSA, ECC, Ed25519) or post-quantum (ML-KEM-768, FIPS 203) keypair, a 256-bit symmetric key, or an HMAC-SHA256 key. Returns a keyHandle and, for keypairs, the public key. ${HANDLE_NOTE}`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: oneOf(
          "Key type: 'rsa', 'ecc', 'ed25519', 'ml-kem-768', 'symmetric-256' (for crypto_encrypt, crypto_decrypt and crypto_kms_wrap), or 'hmac-sha256'.",
          KEY_TYPES,
        ),
        modulusLength: {
          type: "integer",
          description:
            "Modulus length for RSA (2048, 3072, 4096). Default is 2048.",
          enum: RSA_MODULUS_LENGTHS,
        },
        curve: oneOf(
          "Elliptic curve for 'ecc': 'prime256v1' (P-256), 'secp384r1' (P-384), or 'secp256k1'. Default is 'prime256v1'.",
          EC_CURVES,
        ),
      },
      required: ["type"],
    },
  },
  {
    name: "crypto_key_list",
    description: `List the key handles this server holds, with each key's type and public metadata. At most ${MAX_KEYS} keys are held; beyond that the least recently used key is destroyed.`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "crypto_key_destroy",
    description:
      "Destroy a key: overwrite its secret bytes where the runtime allows and invalidate its handle.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { keyHandle: keyHandle("Handle of the key to destroy.") },
      required: ["keyHandle"],
    },
  },
  {
    name: "crypto_inspect_key",
    description:
      "Inspect and parse PEM certificate, public key, or OpenPGP armored block.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        keyData: {
          type: "string",
          description: "PEM or armored key string.",
          maxLength: MAX_KEY_LENGTH,
        },
      },
      required: ["keyData"],
    },
  },
];

const CIPHER_TOOLS: MCPTool[] = [
  {
    name: "crypto_encrypt",
    description: `Encrypt plaintext with authenticated encryption (AES-256-GCM or ChaCha20-Poly1305) under a symmetric-256 key handle. Without keyHandle, a new key is generated and its handle returned. ${HANDLE_NOTE}`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        plaintext: text("Plaintext string to encrypt."),
        algorithm: oneOf(
          "Encryption algorithm ('aes-256-gcm' or 'chacha20-poly1305'). Default is 'aes-256-gcm'.",
          AEAD_ALGORITHMS,
        ),
        keyHandle: keyHandle(
          "Handle of a symmetric-256 key. If omitted, a new key is generated.",
        ),
      },
      required: ["plaintext"],
    },
  },
  {
    name: "crypto_decrypt",
    description:
      "Decrypt and authenticate an AES-256-GCM or ChaCha20-Poly1305 ciphertext with a symmetric-256 key handle.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ciphertext: hex("Hex-encoded ciphertext.", 2 * MAX_TEXT_LENGTH, true),
        algorithm: oneOf(
          "Algorithm used for encryption ('aes-256-gcm' or 'chacha20-poly1305'). Default is 'aes-256-gcm'.",
          AEAD_ALGORITHMS,
        ),
        keyHandle: keyHandle("Handle of the symmetric-256 key."),
        iv: hex("Hex-encoded 96-bit nonce (24 hex characters).", 24),
        authTag: hex("Hex-encoded 128-bit authentication tag.", 32),
      },
      required: ["ciphertext", "keyHandle", "iv", "authTag"],
    },
  },
  {
    name: "crypto_kem_encapsulate",
    description: `Encapsulate a shared secret to an ML-KEM-768 (FIPS 203) public key. Returns the KEM ciphertext for the recipient and a symmetric-256 keyHandle for the shared secret, usable with crypto_encrypt. ${HANDLE_NOTE}`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        publicKey: hex(
          "Hex-encoded ML-KEM-768 public key (2368 hex characters).",
          ML_KEM_768_PUBLIC_KEY_HEX,
        ),
      },
      required: ["publicKey"],
    },
  },
  {
    name: "crypto_kem_decapsulate",
    description: `Recover an ML-KEM-768 shared secret with an ml-kem-768 key handle. Returns a symmetric-256 keyHandle for the shared secret. ${HANDLE_NOTE}`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        keyHandle: keyHandle("Handle of the ml-kem-768 key."),
        ciphertext: hex(
          "Hex-encoded ML-KEM-768 ciphertext (2176 hex characters).",
          ML_KEM_768_CIPHERTEXT_HEX,
        ),
      },
      required: ["keyHandle", "ciphertext"],
    },
  },
];

const SIGNATURE_TOOLS: MCPTool[] = [
  {
    name: "crypto_sign",
    description:
      "Sign data with a key handle. The algorithm follows the key: Ed25519, RSASSA-PSS (SHA-256), ECDSA (SHA-256; SHA-384 on P-384), or HMAC-SHA256.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        data: text("Data string to sign."),
        keyHandle: keyHandle(
          "Handle of an ed25519, rsa, ecc, or hmac-sha256 key.",
        ),
      },
      required: ["data", "keyHandle"],
    },
  },
  {
    name: "crypto_verify",
    description:
      "Verify a signature against a public key PEM (Ed25519, RSA-PSS, ECDSA) or a key handle (also HMAC-SHA256). Pass exactly one of publicKey or keyHandle.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        data: text("Original data string."),
        signature: hex("Hex-encoded signature.", 1024, true),
        publicKey: {
          type: "string",
          description:
            "Public key in SPKI PEM format. Private keys are refused.",
          minLength: 1,
          maxLength: MAX_KEY_LENGTH,
        },
        keyHandle: keyHandle(
          "Handle of an ed25519, rsa, ecc, or hmac-sha256 key.",
        ),
      },
      required: ["data", "signature"],
    },
  },
  {
    name: "crypto_hash",
    description:
      "Compute cryptographic digest (SHA-256, SHA-384, SHA-512, SHA3-256, BLAKE2b512).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        data: text("Data string to hash."),
        algorithm: oneOf("Hash algorithm.", HASH_ALGORITHMS),
      },
      required: ["data"],
    },
  },
];

const KMS_AND_AUDIT_TOOLS: MCPTool[] = [
  {
    name: "crypto_kms_wrap",
    description:
      "Wrap the Data Encryption Key (DEK) a symmetric-256 key handle refers to under a Key Encryption Key held by a KMS provider. Only the 'local' provider is configured.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        provider: KMS_PROVIDER,
        keyId: KEK_LABEL,
        keyHandle: keyHandle("Handle of the symmetric-256 DEK to wrap."),
      },
      required: ["provider", "keyId", "keyHandle"],
    },
  },
  {
    name: "crypto_kms_unwrap",
    description: `Unwrap a DEK previously wrapped by crypto_kms_wrap in this server process into a symmetric-256 key handle. Only the 'local' provider is configured. ${HANDLE_NOTE}`,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        provider: KMS_PROVIDER,
        keyId: KEK_LABEL,
        wrappedKey: hex("Hex-encoded wrapped key payload.", 1024, true),
      },
      required: ["provider", "keyId", "wrappedKey"],
    },
  },
  {
    name: "crypto_audit_cbom",
    description:
      "Generate a Cryptographic Bill of Materials (CBOM) inventory from cryptographic identifiers.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        algorithms: {
          type: "string",
          description:
            "Comma-separated list of algorithm names to evaluate (e.g. 'RSA-2048,AES-256-GCM,ML-KEM-768,SHA-1').",
          maxLength: 4096,
        },
      },
      required: ["algorithms"],
    },
  },
];

/** JSON-schema definitions of every tool exposed by the MCP server. */
export const TOOLS: MCPTool[] = [
  ...KEY_TOOLS,
  ...CIPHER_TOOLS,
  ...SIGNATURE_TOOLS,
  ...KMS_AND_AUDIT_TOOLS,
];
