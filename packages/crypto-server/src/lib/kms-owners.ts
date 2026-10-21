/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Which principal owns each KMS key created through the API.
 *
 * A key created with `/v2/kms/create-key` belongs to the principal that
 * created it; the other KMS routes act on a key only for its owner. A key
 * the API did not create (one made in the provider's console, say) has no
 * owner and is usable by `crypto:admin` only. With `CRYPTO_KEY_OUT_DIR`
 * set, owners are kept in `kms-owners.json` there (mode 0600), so they
 * survive a restart; otherwise they live in memory.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "fs";
import * as path from "path";

/** File name of the persisted owner table. */
export const KMS_OWNERS_FILE = "kms-owners.json";

/** Owners keyed by `provider:keyId`. */
type OwnerTable = Record<string, string>;

const entry = (provider: string, keyId: string): string =>
  `${provider.toLowerCase()}:${keyId}`;

export class KmsOwners {
  private readonly owners: OwnerTable;
  private readonly file: string | undefined;

  /**
   * Load owners from `dir/kms-owners.json` when `dir` is given. A file
   * that cannot be parsed stops the server rather than silently granting
   * every key to no one (and so to admins).
   */
  constructor(dir: string | undefined) {
    this.file = dir ? path.join(dir, KMS_OWNERS_FILE) : undefined;
    this.owners = this.file && existsSync(this.file) ? load(this.file) : {};
  }

  /** The owner of a key, or undefined when the API did not create it. */
  ownerOf(provider: string, keyId: string): string | undefined {
    const key = entry(provider, keyId);
    return Object.hasOwn(this.owners, key) ? this.owners[key] : undefined;
  }

  /** Record `owner` as the owner of a newly created key. */
  bind(provider: string, keyId: string, owner: string): void {
    const current = this.ownerOf(provider, keyId);
    if (current !== undefined && current !== owner) {
      throw new Error(`KMS key ${keyId} is already owned by another principal`);
    }
    this.owners[entry(provider, keyId)] = owner;
    if (this.file) save(this.file, this.owners);
  }
}

function load(file: string): OwnerTable {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as {
      version?: unknown;
      owners?: unknown;
    };
    if (parsed.version !== 1 || typeof parsed.owners !== "object") {
      throw new Error("unexpected format");
    }
    return { ...(parsed.owners as OwnerTable) };
  } catch (err) {
    throw new Error(
      `Cannot read ${KMS_OWNERS_FILE}: ${(err as Error).message}`,
      { cause: err },
    );
  }
}

/** Write the table to a temporary file, then rename it into place. */
function save(file: string, owners: OwnerTable): void {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ version: 1, owners }), { mode: 0o600 });
  renameSync(tmp, file);
}
