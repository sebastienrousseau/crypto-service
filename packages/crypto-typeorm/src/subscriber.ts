/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks EntitySubscriber that automatically encrypts fields before insert/update
 * and decrypts them after load, driven by an {@link EncryptionConfig}.
 */

import type {
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  LoadEvent,
} from "typeorm";
import {
  createColumnCodec,
  openColumn,
  sealColumn,
  type ColumnCodec,
} from "./codec";
import type { EncryptionConfig } from "./types";

/**
 * A TypeORM `EntitySubscriber` that hooks into the entity lifecycle to
 * encrypt and decrypt fields automatically. The set of fields to process
 * is defined via `EncryptionConfig.fields` — a `Map` keyed by entity
 * constructor name.
 *
 * This approach is useful when you want to keep your entity classes free
 * from transformer configuration and centralise encryption policy.
 *
 * Each value is bound to `EntityName.field` as associated data, and a
 * stored value that cannot be decrypted makes `afterLoad` throw a
 * `FieldDecryptionError` (unless `allowPlaintextFallback` is set and the
 * value is not a ciphertext at all).
 *
 * @example
 * ```ts
 * import { DataSource } from "typeorm";
 * import { EncryptionSubscriber } from "@sebastienrousseau/crypto-typeorm";
 *
 * const ds = new DataSource({
 *   // ... connection options
 *   subscribers: [
 *     new EncryptionSubscriber({
 *       key: process.env.COLUMN_ENCRYPTION_KEY!,
 *       fields: new Map([
 *         ["User", ["ssn", "email"]],
 *         ["Payment", ["cardNumber"]],
 *       ]),
 *     }),
 *   ],
 * });
 * ```
 */
export class EncryptionSubscriber implements EntitySubscriberInterface {
  /** Derived keys and read options. */
  private readonly codec: ColumnCodec;
  /** Map of entity names to encrypted field names. */
  private readonly fields: Map<string, string[]>;

  /**
   * Create a new subscriber with the given encryption configuration.
   *
   * @throws If the key is missing or not a 64-character hex string.
   */
  constructor(config: EncryptionConfig) {
    if (!config.key) {
      throw new Error("EncryptionSubscriber: key is required");
    }
    this.codec = createColumnCodec(config, "EncryptionSubscriber");
    this.fields = config.fields ?? new Map();
  }

  /**
   * Encrypt configured fields before a new entity is inserted.
   */
  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    this.encryptFields(event.entity);
  }

  /**
   * Encrypt configured fields before an existing entity is updated.
   */
  beforeUpdate(event: UpdateEvent<Record<string, unknown>>): void {
    if (event.entity) {
      this.encryptFields(event.entity as Record<string, unknown>);
    }
  }

  /**
   * Decrypt configured fields after an entity is loaded from the database.
   */
  afterLoad(
    entity: Record<string, unknown>,
    event?: LoadEvent<Record<string, unknown>>,
  ): void {
    void event; // unused but part of the interface
    this.decryptFields(entity);
  }

  // ── helpers ──────────────────────────────────────────────────────

  /** Extract the constructor name from an entity, or `undefined` for plain objects. */
  private getEntityName(entity: Record<string, unknown>): string | undefined {
    const ctor = entity?.constructor;
    return ctor?.name && ctor.name !== "Object" ? ctor.name : undefined;
  }

  /** Return the entity name and its encrypted field names. */
  private getFieldsFor(entity: Record<string, unknown>): {
    name: string;
    fields: string[];
  } {
    const name = this.getEntityName(entity);
    if (!name) return { name: "", fields: [] };
    return { name, fields: this.fields.get(name) ?? [] };
  }

  /** Encrypt all configured fields on the entity in place. */
  private encryptFields(entity: Record<string, unknown>): void {
    const { name, fields } = this.getFieldsFor(entity);
    for (const field of fields) {
      const value = entity[field];
      if (value === null || value === undefined) continue;
      const plaintext =
        typeof value === "string" ? value : JSON.stringify(value);
      entity[field] = sealColumn(this.codec, `${name}.${field}`, plaintext);
    }
  }

  /**
   * Decrypt all configured fields on the entity in place.
   *
   * @throws `FieldDecryptionError` when a stored value is not a
   *   valid ciphertext for `EntityName.field`.
   */
  private decryptFields(entity: Record<string, unknown>): void {
    const { name, fields } = this.getFieldsFor(entity);
    for (const field of fields) {
      const value = entity[field];
      if (typeof value !== "string") continue;
      entity[field] = openColumn(this.codec, `${name}.${field}`, value);
    }
  }
}
