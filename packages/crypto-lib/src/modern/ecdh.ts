/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks X25519 Elliptic-Curve Diffie-Hellman key exchange via @noble/curves.
 *
 * X25519 provides a 128-bit security level shared secret from two parties'
 * ephemeral or static key pairs. The shared secret should be fed into a KDF
 * (HKDF-SHA256) before use as an encryption key.
 */

import { x25519 } from "@noble/curves/ed25519";
import { randomBytes } from "@noble/ciphers/webcrypto";

/** X25519 Diffie-Hellman key pair (128-bit security). */
export interface X25519KeyPair {
  /** Hex-encoded 32-byte private key. */
  privateKey: string;
  /** Hex-encoded 32-byte public key. */
  publicKey: string;
}

/** Result of an X25519 Diffie-Hellman key exchange. */
export interface KeyExchangeResult {
  /** Hex-encoded 32-byte shared secret. */
  sharedSecret: string;
  /** Algorithm used. */
  algorithm: "x25519";
}

/**
 * Generate a new X25519 key pair for Diffie-Hellman.
 */
export function generateX25519KeyPair(): X25519KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString("hex"),
    publicKey: Buffer.from(publicKey).toString("hex"),
  };
}

/**
 * Perform X25519 Diffie-Hellman key exchange.
 *
 * @param privateKey - Our private key (hex or bytes).
 * @param theirPublicKey - The other party's public key (hex or bytes).
 * @returns Shared secret (should be passed through HKDF before use).
 */
export function x25519Exchange(
  privateKey: string | Uint8Array,
  theirPublicKey: string | Uint8Array,
): KeyExchangeResult {
  const priv =
    typeof privateKey === "string"
      ? Buffer.from(privateKey, "hex")
      : privateKey;
  const pub =
    typeof theirPublicKey === "string"
      ? Buffer.from(theirPublicKey, "hex")
      : theirPublicKey;

  const shared = x25519.getSharedSecret(priv, pub);

  return {
    sharedSecret: Buffer.from(shared).toString("hex"),
    algorithm: "x25519",
  };
}
