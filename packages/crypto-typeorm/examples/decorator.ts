// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using @EncryptedColumn to transparently encrypt entity fields.
 *
 * Run: `npx ts-node examples/decorator.ts`
 * Requires: a running database (SQLite used here for simplicity)
 */

import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { EncryptedColumn } from "../src";

// ── 1. Define your entity ──────────────────────────────────────────

const ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @EncryptedColumn({ encrypt: { key: ENCRYPTION_KEY } })
  ssn!: string;

  @EncryptedColumn({ encrypt: { key: ENCRYPTION_KEY } })
  email!: string;
}

// ── 2. Create a data source and use it ─────────────────────────────

async function main() {
  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [User],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(User);

  // Insert — values are encrypted automatically
  const user = repo.create({ ssn: "123-45-6789", email: "alice@example.com" });
  await repo.save(user);

  // Read — values are decrypted automatically
  const loaded = await repo.findOneByOrFail({ id: user.id });
  console.log("Decrypted SSN:", loaded.ssn); // 123-45-6789
  console.log("Decrypted email:", loaded.email); // alice@example.com

  // Verify raw storage is encrypted
  const raw = await ds.query("SELECT ssn, email FROM user WHERE id = ?", [
    user.id,
  ]);
  console.log("Raw SSN (encrypted):", raw[0].ssn.slice(0, 40) + "...");
  console.log("Raw email (encrypted):", raw[0].email.slice(0, 40) + "...");

  await ds.destroy();
}

main().catch(console.error);
