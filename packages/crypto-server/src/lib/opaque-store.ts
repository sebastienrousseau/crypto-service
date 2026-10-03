/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks In-memory state and secret store for OPAQUE (RFC 9807) authentication.
 *
 * Keeps long-term server setups (AKE key pair and OPRF seed) per suite,
 * fake records for unknown-client enumeration resistance, stored user
 * registration records, and short-lived handshake sessions for active logins.
 */

import { randomUUID } from "node:crypto";
import { protocols } from "@sebastienrousseau/crypto-lib";

type SuiteId = protocols.pake.SuiteId;
type ServerSetup = protocols.pake.ServerSetup;
type RegistrationRecord = protocols.pake.RegistrationRecord;
type ServerLoginState = protocols.pake.ServerLoginState;

const { pake } = protocols;

/** Default login session lifetime: 5 minutes. */
export const DEFAULT_OPAQUE_SESSION_TTL_MS = 5 * 60 * 1000;

/** Active handshake session awaiting KE3 finish. */
export interface OpaqueActiveSession {
  readonly serverState: ServerLoginState;
  readonly credentialIdentifier: string;
  readonly suite: SuiteId;
  readonly expiresAt: number;
}

/** Store holding server secrets, client records and login sessions. */
export class OpaqueStore {
  private readonly setups = new Map<SuiteId, ServerSetup>();
  private readonly fakeRecords = new Map<SuiteId, RegistrationRecord>();
  private readonly records = new Map<string, RegistrationRecord>();
  private readonly sessions = new Map<string, OpaqueActiveSession>();

  /**
   * Return the server's long-term setup for the given suite, creating one
   * on first use.
   */
  getSetup(suite: SuiteId = "P256-SHA256"): ServerSetup {
    let setup = this.setups.get(suite);
    if (!setup) {
      setup = pake.createServerSetup({ suite });
      this.setups.set(suite, setup);
    }
    return setup;
  }

  /**
   * Return the fake record for unknown clients for the given suite,
   * creating one on first use.
   */
  getFakeRecord(suite: SuiteId = "P256-SHA256"): RegistrationRecord {
    let fake = this.fakeRecords.get(suite);
    if (!fake) {
      fake = pake.createFakeRecord({ suite });
      this.fakeRecords.set(suite, fake);
    }
    return fake;
  }

  /** Save a client registration record. */
  setRecord(credentialIdentifier: string, record: RegistrationRecord): void {
    this.records.set(credentialIdentifier, record);
  }

  /** Retrieve a client registration record, or undefined if not registered. */
  getRecord(credentialIdentifier: string): RegistrationRecord | undefined {
    return this.records.get(credentialIdentifier);
  }

  /** Check if a credential identifier is registered. */
  hasRecord(credentialIdentifier: string): boolean {
    return this.records.has(credentialIdentifier);
  }

  /** Store a login session and return its unique session ID. */
  createSession(
    credentialIdentifier: string,
    serverState: ServerLoginState,
    suite: SuiteId = "P256-SHA256",
    ttlMs: number = DEFAULT_OPAQUE_SESSION_TTL_MS,
  ): string {
    this.cleanExpiredSessions();
    const sessionId = randomUUID();
    this.sessions.set(sessionId, {
      serverState,
      credentialIdentifier,
      suite,
      expiresAt: Date.now() + ttlMs,
    });
    return sessionId;
  }

  /**
   * Consume and return a login session if valid and unexpired.
   * Single-use: deleted upon retrieval.
   */
  consumeSession(sessionId: string): OpaqueActiveSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    this.sessions.delete(sessionId);
    if (Date.now() > session.expiresAt) return undefined;
    return session;
  }

  /** Remove any expired login sessions. */
  cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }

  /** Reset all stored records and sessions (primarily for tests). */
  clear(): void {
    this.records.clear();
    this.sessions.clear();
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** In-memory store for OPAQUE authentication state and records. */
    opaqueStore: OpaqueStore;
  }
}
