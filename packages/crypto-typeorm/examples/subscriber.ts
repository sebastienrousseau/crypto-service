// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * Using EncryptionSubscriber to auto-encrypt/decrypt fields without
 * modifying entity classes.
 *
 * The subscriber approach keeps entities clean -- encryption
 * configuration is centralised in the data source setup.
 *
 * Run: `npx ts-node examples/subscriber.ts`
 */

import { header, task, summary } from "./support";
import "reflect-metadata";
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { EncryptionSubscriber } from "../src";

// ── 1. Plain entity -- no encryption decorators ─────────────────────

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
  header("crypto-typeorm -- subscriber");

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

  await task("Initialise data source with EncryptionSubscriber", async () => {
    await ds.initialize();
  });

  const repo = ds.getRepository(Payment);

  const payment = await task("Insert payment (cardNumber encrypted, holderName plain)", async () => {
    const p = repo.create({
      cardNumber: "4111-1111-1111-1111",
      holderName: "Alice Smith",
    });
    await repo.save(p);
    return p;
  });

  await task("Load payment and verify decrypted card number", async () => {
    const loaded = await repo.findOneByOrFail({ id: payment.id });
    if (loaded.cardNumber !== "4111-1111-1111-1111") {
      throw new Error("Card number mismatch");
    }
    if (loaded.holderName !== "Alice Smith") {
      throw new Error("Holder name mismatch");
    }
  });

  await task("Verify raw card is encrypted, holder is plaintext", async () => {
    const raw = await ds.query(
      "SELECT cardNumber, holderName FROM payment WHERE id = ?",
      [payment.id],
    );
    if (raw[0].cardNumber === "4111-1111-1111-1111") {
      throw new Error("Card stored as plaintext");
    }
    if (raw[0].holderName !== "Alice Smith") {
      throw new Error("Holder name should be plaintext");
    }
  });

  await task("Destroy data source", async () => {
    await ds.destroy();
  });

  summary(4);
}

main();
