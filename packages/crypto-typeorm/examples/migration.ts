// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypting existing plaintext columns in a migration.
 *
 * This example shows how to read existing unencrypted rows, encrypt the
 * target columns, and write them back. Run this as a one-time migration
 * script after adding encryption to your schema.
 *
 * Run: `npx ts-node examples/migration.ts`
 * Requires: a running database (SQLite used here for simplicity)
 */

import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { EncryptionTransformer } from "../src";

// ── 1. Entity (pre-migration: no encryption) ──────────────────────

@Entity()
class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  taxId!: string;
}

// ── 2. Migration logic ─────────────────────────────────────────────

const ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function main() {
  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [Customer],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(Customer);

  // Seed some plaintext rows (simulates existing data)
  await repo.save([
    { name: "Alice", taxId: "111-22-3333" },
    { name: "Bob", taxId: "444-55-6666" },
    { name: "Carol", taxId: "777-88-9999" },
  ]);

  console.log("Before migration:");
  const before = await ds.query("SELECT id, taxId FROM customer");
  for (const row of before) {
    console.log(`  id=${row.id} taxId=${row.taxId}`);
  }

  // ── Encrypt existing rows ──────────────────────────────────────

  const transformer = new EncryptionTransformer({ key: ENCRYPTION_KEY });

  const rows: { id: number; taxId: string }[] = await ds.query(
    "SELECT id, taxId FROM customer",
  );

  for (const row of rows) {
    const encrypted = transformer.to(row.taxId);
    await ds.query("UPDATE customer SET taxId = ? WHERE id = ?", [
      encrypted,
      row.id,
    ]);
  }

  console.log("\nAfter migration (raw):");
  const after = await ds.query("SELECT id, taxId FROM customer");
  for (const row of after) {
    console.log(`  id=${row.id} taxId=${row.taxId.slice(0, 40)}...`);
  }

  // ── Verify decryption works ────────────────────────────────────

  console.log("\nDecrypted values:");
  for (const row of after) {
    const decrypted = transformer.from(row.taxId);
    console.log(`  id=${row.id} taxId=${decrypted}`);
  }

  await ds.destroy();
}

main().catch(console.error);
