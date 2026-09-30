/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { chmod, writeFile } from "fs/promises";
import * as path from "path";

/** One armored key file to persist. */
export interface KeyOutputFile {
  /** File name; any directory part is stripped. */
  name: string;
  /** File contents (armored text). */
  content: string;
  /** Private key material: written owner-only (0600). */
  secret: boolean;
}

/**
 * Persist generated key files to `CRYPTO_KEY_OUT_DIR`, if it is set.
 *
 * Key output never falls back to the keystore directory (`CRYPTO_KEY_DIR`)
 * or the package directory: writing there would let a caller replace the
 * keys the service signs with. When `CRYPTO_KEY_OUT_DIR` is unset, nothing
 * is written and the caller keeps the keys it was returned.
 */
export async function writeKeyOutputs(files: KeyOutputFile[]): Promise<void> {
  const dir = process.env["CRYPTO_KEY_OUT_DIR"];
  if (!dir) return;
  await Promise.all(
    files.map(async (f) => {
      const target = path.join(dir, path.basename(f.name));
      const mode = f.secret ? 0o600 : 0o644;
      await writeFile(target, f.content, { encoding: "utf8", mode });
      // `mode` only applies when the file is created; tighten existing ones.
      await chmod(target, mode);
    }),
  );
}
