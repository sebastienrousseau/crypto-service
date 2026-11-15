/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Response schemas of the KMS routes (routes/v2/kms.ts).
 *
 * KMS ciphertexts and wrapped keys are opaque strings whose format
 * belongs to the provider (base64 for local, AWS and GCP; `vault:v<n>:`
 * prefixed for Vault): a client stores them and passes them back as they
 * are. Every KMS route may answer 404 (unknown key, or another
 * principal's), 409 (key disabled), 501 (operation not implemented by
 * the provider) and 503 (provider SDK missing).
 */

import {
  PLAINTEXT,
  dataRoute,
  fields,
  flag,
  hex,
  integer,
} from "../../utils/response-schemas";

const KEY_ID = {
  type: "string",
  description: "The provider's key identifier (local keys: local-<hex>).",
} as const;

const PROVIDER = {
  type: "string",
  description: "The provider that served the request (local, aws, gcp, vault).",
} as const;

const OPAQUE = (description: string) => ({
  type: "string",
  description: `${description} Opaque, provider-specific string; pass it back unchanged.`,
});

/** Errors of a route on an existing KMS key. */
const KEY_ERRORS = [404, 409, 501, 503] as const;

/** `POST /v2/kms/create-key`. */
export const CREATE_KEY_RESPONSE = dataRoute(
  "The new key's metadata.",
  {
    type: "object",
    required: [
      "keyId",
      "algorithm",
      "usage",
      "createdAt",
      "enabled",
      "provider",
    ],
    properties: {
      keyId: KEY_ID,
      algorithm: { type: "string", description: "Key algorithm." },
      usage: { type: "string", enum: ["encrypt", "sign", "wrap"] },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Creation time, ISO 8601.",
      },
      enabled: flag("Whether the key is enabled."),
      provider: PROVIDER,
      currentVersion: integer("Current key version, when versioned."),
    },
  },
  501,
  503,
);

/** `POST /v2/kms/wrap`. */
export const WRAP_RESPONSE = dataRoute(
  "The wrapped key.",
  fields({
    wrappedKey: OPAQUE("The wrapped key."),
    keyId: KEY_ID,
    provider: PROVIDER,
  }),
  ...KEY_ERRORS,
);

/** `POST /v2/kms/unwrap`. */
export const UNWRAP_RESPONSE = dataRoute(
  "The unwrapped key.",
  fields({
    unwrappedKey: hex("The unwrapped key bytes."),
    keyId: KEY_ID,
    provider: PROVIDER,
  }),
  ...KEY_ERRORS,
);

/** `POST /v2/kms/generate-data-key`. */
export const DATA_KEY_RESPONSE = dataRoute(
  "A data key, in the clear and wrapped by the KMS key.",
  fields({
    plaintext: hex("The data key bytes; use, then discard."),
    ciphertext: OPAQUE("The data key, encrypted by the KMS key."),
    keyId: KEY_ID,
    provider: PROVIDER,
  }),
  ...KEY_ERRORS,
);

/** `POST /v2/kms/encrypt`. */
export const ENCRYPT_RESPONSE = dataRoute(
  "The ciphertext.",
  {
    type: "object",
    required: ["ciphertext", "keyId", "provider"],
    properties: {
      ciphertext: OPAQUE("The ciphertext."),
      keyId: KEY_ID,
      keyVersion: integer("Key version used, when versioned."),
      context: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Encryption context, when the provider echoes it.",
      },
      provider: PROVIDER,
    },
  },
  ...KEY_ERRORS,
);

/** `POST /v2/kms/decrypt`. */
export const DECRYPT_RESPONSE = dataRoute(
  "The plaintext, as text and as the raw bytes.",
  fields({
    plaintext: PLAINTEXT,
    hex: hex("The decrypted bytes."),
    keyId: KEY_ID,
    provider: PROVIDER,
  }),
  ...KEY_ERRORS,
);
