/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import handleModernKeygen from "./keygen.command";
import handleModernHash from "./hash.command";
import handleModernEncrypt from "./encrypt.command";
import handleModernSign from "./sign.command";
import handlePasswordHash from "./password-hash.command";

/** Registry of modern (non-PGP) CLI command handlers. */
export const ModernCommand = {
  /** Generate modern key pairs (Ed25519, ML-KEM, ML-DSA, etc.). */
  handleModernKeygen: handleModernKeygen,
  /** Hash data using modern algorithms (SHA-2, SHA-3, BLAKE). */
  handleModernHash: handleModernHash,
  /** Encrypt data using modern AEAD ciphers (XChaCha20, AES-GCM). */
  handleModernEncrypt: handleModernEncrypt,
  /** Sign or verify messages with modern signature schemes. */
  handleModernSign: handleModernSign,
  /** Hash or verify passwords using Argon2. */
  handlePasswordHash: handlePasswordHash,
};
