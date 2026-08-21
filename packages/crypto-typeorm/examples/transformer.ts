// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Manual usage of EncryptionTransformer as a standard TypeORM
 * ValueTransformer on a @Column.
 *
 * Demonstrates the low-level approach where you attach the transformer
 * to individual columns instead of using `@EncryptedColumn`.
 *
 * Run: `npx ts-node examples/transformer.ts`
 */

import { header, task, summary } from "./support";
import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { EncryptionTransformer } from "../src";

// ── 1. Create a transformer instance ───────────────────────────────

const ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const transformer = new EncryptionTransformer({ key: ENCRYPTION_KEY });

// ── 2. Apply it to individual columns ──────────────────────────────

@Entity()
class Secret {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", transformer })
  value!: string;

  @Column({ type: "text" })
  label!: string;
}

// ── 3. Use normally ────────────────────────────────────────────────

async function main() {
  header("crypto-typeorm -- transformer");

  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [Secret],
    synchronize: true,
    logging: false,
  });

  await task("Initialise in-memory SQLite data source", async () => {
    await ds.initialize();
  });

  const repo = ds.getRepository(Secret);

  const secret = await task("Insert secret with encrypted value column", async () => {
    const s = repo.create({
      value: "super-secret-token-abc123",
      label: "API key for service X",
    });
    await repo.save(s);
    return s;
  });

  await task("Load secret and verify decrypted value", async () => {
    const loaded = await repo.findOneByOrFail({ id: secret.id });
    if (loaded.value !== "super-secret-token-abc123") {
      throw new Error("Value mismatch");
    }
    if (loaded.label !== "API key for service X") {
      throw new Error("Label mismatch");
    }
  });

  await task("Use transformer directly for encrypt/decrypt round-trip", async () => {
    const encrypted = transformer.to("hello world");
    const decrypted = transformer.from(encrypted);
    if (decrypted !== "hello world") {
      throw new Error(`Expected "hello world", got "${decrypted}"`);
    }
  });

  await task("Destroy data source", async () => {
    await ds.destroy();
  });

  summary(4);
}

main();
