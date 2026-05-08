/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Lazy async key accessors. The previous implementation issued three
 * `readFileSync` calls at module load, which crashed the CLI whenever the
 * working directory was not the package source root.
 */

import { readFile } from "fs/promises";
import * as path from "path";

const keyPath = (name: string): string =>
  path.resolve(__dirname, "..", "key", name);

const decode = async (file: string): Promise<string> => {
  const raw = await readFile(keyPath(file));
  if (raw.length >= 5 && raw.subarray(0, 5).toString("ascii") === "-----") {
    return raw.toString("latin1");
  }
  return Buffer.from(raw.toString("latin1"), "base64").toString("latin1");
};

/** Lazily read and decode the RSA private key from disk. */
export const getPrivateKey = (): Promise<string> => decode("rsa.key");
/** Lazily read and decode the RSA public key from disk. */
export const getPublicKey = (): Promise<string> => decode("rsa.pub");
/** Lazily read and decode the RSA revocation certificate from disk. */
export const getRevocationCertificate = (): Promise<string> =>
  decode("rsa.cert");

/** Default export bundling all key accessor functions. */
export default {
  /** Lazily read and decode the RSA private key. */
  getPrivateKey: getPrivateKey,
  /** Lazily read and decode the RSA public key. */
  getPublicKey: getPublicKey,
  /** Lazily read and decode the RSA revocation certificate. */
  getRevocationCertificate: getRevocationCertificate,
};
