// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using EncryptionSubscriber to auto-encrypt/decrypt fields without
 * modifying entity classes.
 *
 * Run: `npx ts-node examples/subscriber.ts`
 * Requires: a running database (SQLite used here for simplicity)
 */

import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { EncryptionSubscriber } from "../src";

// ── 1. Plain entity — no encryption decorators ─────────────────────

@Entity()
class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  cardNumber!: string;

  @Column({ type: "text" })
  holderName!: string;
}

// ── 2. Configure encryption centrally via the subscriber ───────────

const ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function main() {
  const subscriber = new EncryptionSubscriber({
    key: ENCRYPTION_KEY,
    fields: new Map([["Payment", ["cardNumber"]]]),
  });

  const ds = new DataSource({
    type: "sqlite",
    database: ":memory:",
    entities: [Payment],
    subscribers: [subscriber as never],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(Payment);

  // Insert — cardNumber is encrypted, holderName is left as plaintext
  const payment = repo.create({
    cardNumber: "4111-1111-1111-1111",
    holderName: "Alice Smith",
  });
  await repo.save(payment);

  // Read — cardNumber is decrypted automatically
  const loaded = await repo.findOneByOrFail({ id: payment.id });
  console.log("Card:", loaded.cardNumber); // 4111-1111-1111-1111
  console.log("Holder:", loaded.holderName); // Alice Smith (never encrypted)

  // Verify raw storage
  const raw = await ds.query(
    "SELECT cardNumber, holderName FROM payment WHERE id = ?",
    [payment.id],
  );
  console.log("Raw card (encrypted):", raw[0].cardNumber.slice(0, 40) + "...");
  console.log("Raw holder (plaintext):", raw[0].holderName);

  await ds.destroy();
}

main().catch(console.error);
