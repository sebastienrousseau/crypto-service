// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using @EncryptedColumn to transparently encrypt entity fields.
 *
 * Demonstrates the decorator approach where encryption configuration
 * lives directly on the entity class via `@EncryptedColumn`.
 *
 * Run: `npx ts-node examples/decorator.ts`
 */

import { header, task, summary } from "./support";
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
  header("crypto-typeorm -- decorator");

  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [User],
    synchronize: true,
    logging: false,
  });

  await task("Initialise in-memory SQLite data source", async () => {
    await ds.initialize();
  });

  const repo = ds.getRepository(User);

  const user = await task("Insert user with encrypted SSN and email", async () => {
    const u = repo.create({ ssn: "123-45-6789", email: "alice@example.com" });
    await repo.save(u);
    return u;
  });

  await task("Load user and verify decrypted values", async () => {
    const loaded = await repo.findOneByOrFail({ id: user.id });
    if (loaded.ssn !== "123-45-6789") throw new Error("SSN mismatch");
    if (loaded.email !== "alice@example.com") throw new Error("Email mismatch");
  });

  await task("Verify raw storage is encrypted (not plaintext)", async () => {
    const raw = await ds.query("SELECT ssn, email FROM user WHERE id = ?", [
      user.id,
    ]);
    if (raw[0].ssn === "123-45-6789") throw new Error("SSN stored as plaintext");
    if (raw[0].email === "alice@example.com") throw new Error("Email stored as plaintext");
  });

  await task("Destroy data source", async () => {
    await ds.destroy();
  });

  summary(4);
}

main();
