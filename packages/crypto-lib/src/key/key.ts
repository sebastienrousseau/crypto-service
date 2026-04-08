/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Backwards-compatible async accessors over the lazy keystore.
 *
 * Previously this file issued three `readFileSync` calls at module load
 * time (see git history). That pattern blocked the event loop on every
 * `import` and crashed the process if the CWD did not match the
 * package source root. All accessors are now thin wrappers around the
 * memoized async keystore — callers must `await` them.
 */

import { loadKeystore } from "./keystore";

/**
 * Returns the shipped armored private key. Async — callers must await.
 */
export const getPrivateKey = async (): Promise<string> => {
  const ks = await loadKeystore();
  return ks.privateKeyArmored;
};

/**
 * Returns the shipped armored public key. Async — callers must await.
 */
export const getPublicKey = async (): Promise<string> => {
  const ks = await loadKeystore();
  return ks.publicKeyArmored;
};

/**
 * Returns the shipped revocation certificate (armored). Async — callers
 * must await.
 */
export const getRevocationCertificate = async (): Promise<string> => {
  const ks = await loadKeystore();
  return ks.revocationArmored;
};

export default {
  getPrivateKey,
  getPublicKey,
  getRevocationCertificate,
};
