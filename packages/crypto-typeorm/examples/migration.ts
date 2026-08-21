// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Encrypting existing plaintext columns in a migration.
 *
 * Shows how to read existing unencrypted rows, encrypt the target
 * columns with `EncryptionTransformer`, and write them back. Run this
 * as a one-time migration script after adding encryption to your schema.
 *
 * Run: `npx ts-node examples/migration.ts`
 */

import { header, task, summary } from "./support";
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
  header("crypto-typeorm -- migration");

  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [Customer],
    synchronize: true,
    logging: false,
  });

  await task("Initialise in-memory SQLite data source", async () => {
    await ds.initialize();
  });

  const repo = ds.getRepository(Customer);

  await task("Seed plaintext rows (simulating existing data)", async () => {
    await repo.save([
      { name: "Alice", taxId: "111-22-3333" },
      { name: "Bob", taxId: "444-55-6666" },
      { name: "Carol", taxId: "777-88-9999" },
    ]);
  });

  const transformer = new EncryptionTransformer({ key: ENCRYPTION_KEY });

  await task("Encrypt existing taxId columns in-place", async () => {
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
  });

  await task("Verify raw storage is encrypted", async () => {
    const rows = await ds.query("SELECT id, taxId FROM customer");
    for (const row of rows) {
      if (row.taxId === "111-22-3333" || row.taxId === "444-55-6666" || row.taxId === "777-88-9999") {
        throw new Error(`Row id=${row.id} still plaintext`);
      }
    }
  });

  await task("Verify decryption restores original values", async () => {
    const rows = await ds.query("SELECT id, taxId FROM customer ORDER BY id");
    const expected = ["111-22-3333", "444-55-6666", "777-88-9999"];
    for (let i = 0; i < rows.length; i++) {
      const decrypted = transformer.from(rows[i].taxId);
      if (decrypted !== expected[i]) {
        throw new Error(`Row id=${rows[i].id}: expected ${expected[i]}, got ${decrypted}`);
      }
    }
  });

  await task("Destroy data source", async () => {
    await ds.destroy();
  });

  summary(5);
}

main();
