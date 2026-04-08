/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @file Lazy async key accessors. The previous implementation issued three
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

export const getPrivateKey = (): Promise<string> => decode("rsa.key");
export const getPublicKey = (): Promise<string> => decode("rsa.pub");
export const getRevocationCertificate = (): Promise<string> => decode("rsa.cert");

export default {
  getPrivateKey,
  getPublicKey,
  getRevocationCertificate,
};
