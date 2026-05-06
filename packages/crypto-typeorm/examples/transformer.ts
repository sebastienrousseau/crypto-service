// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Manual usage of EncryptionTransformer as a standard TypeORM
 * ValueTransformer on a @Column.
 *
 * Run: `npx ts-node examples/transformer.ts`
 * Requires: a running database (SQLite used here for simplicity)
 */

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
  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [Secret],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(Secret);

  const secret = repo.create({
    value: "super-secret-token-abc123",
    label: "API key for service X",
  });
  await repo.save(secret);

  const loaded = await repo.findOneByOrFail({ id: secret.id });
  console.log("Decrypted value:", loaded.value); // super-secret-token-abc123
  console.log("Label (plain):", loaded.label); // API key for service X

  // You can also use the transformer directly
  const encrypted = transformer.to("hello world");
  console.log("Encrypted:", encrypted);
  const decrypted = transformer.from(encrypted);
  console.log("Decrypted:", decrypted); // hello world

  await ds.destroy();
}

main().catch(console.error);
