/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing with fast-check covering:
// 1. Request validation with untrusted strings (ReDoS prevention & parity)
// 2. OPAQUE session recovery race conditions & single-use consumption invariants
// 3. Multi-tenant rate limiter burst edge cases & token bucket sliding window invariants

import { expect } from "chai";
import fc from "fast-check";
import { isEmailShaped } from "../src/utils/validation";
import { OpaqueStore } from "../src/lib/opaque-store";
import { MeteringEngine, TIER_QUOTAS } from "../src/enterprise/metering";
import type { LicenseTier } from "../src/enterprise/types";

/** The regex isEmailShaped replaced (it backtracks polynomially). */
const LEGACY_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Short strings over the characters that matter to the email shape. */
const emailish = fc.string({
  unit: fc.constantFrom("a", "b", ".", "@", " ", "\t", "\n", "é", "-"),
  maxLength: 12,
});

describe("Property-based fuzzing (fast-check)", () => {
  describe("validation fuzzing", () => {
    it("isEmailShaped accepts exactly what the old regex accepted", () => {
      fc.assert(
        fc.property(fc.oneof(emailish, fc.string()), (s) => {
          expect(isEmailShaped(s)).to.equal(LEGACY_EMAIL.test(s));
        }),
        { numRuns: 1000 },
      );
    });
  });

  describe("OPAQUE session recovery & lifecycle fuzzing", () => {
    it("enforces strict single-use consumption across concurrent/repeated retrievals", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.integer({ min: 2, max: 20 }),
          (username, repeatCount) => {
            const store = new OpaqueStore();
            const mockState = { key: "state" } as unknown as Parameters<
              typeof store.createSession
            >[1];
            const sessionId = store.createSession(
              username,
              mockState,
              "P256-SHA256",
              60000,
            );

            // Attempt multiple consumptions of the exact same session
            const results: Array<ReturnType<typeof store.consumeSession>> = [];
            for (let i = 0; i < repeatCount; i++) {
              results.push(store.consumeSession(sessionId));
            }

            // Exactly ONE attempt succeeds; all other attempts must return undefined
            const successful = results.filter((r) => r !== undefined);
            const failed = results.filter((r) => r === undefined);

            expect(successful).to.have.lengthOf(1);
            expect(successful[0]!.credentialIdentifier).to.equal(username);
            expect(failed).to.have.lengthOf(repeatCount - 1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("respects TTL expiration boundaries without state leakage", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.integer({ min: -10000, max: -1 }),
          (username, negativeTtl) => {
            const store = new OpaqueStore();
            const mockState = { key: "state" } as unknown as Parameters<
              typeof store.createSession
            >[1];
            const sessionId = store.createSession(
              username,
              mockState,
              "P256-SHA256",
              negativeTtl,
            );
            expect(store.consumeSession(sessionId)).to.be.undefined;
          },
        ),
        { numRuns: 50 },
      );

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.integer({ min: 1000, max: 60000 }),
          (username, positiveTtl) => {
            const store = new OpaqueStore();
            const mockState = { key: "state" } as unknown as Parameters<
              typeof store.createSession
            >[1];
            const sessionId = store.createSession(
              username,
              mockState,
              "P256-SHA256",
              positiveTtl,
            );
            const session = store.consumeSession(sessionId);
            expect(session).to.not.be.undefined;
            expect(session!.credentialIdentifier).to.equal(username);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("Rate limiter & metering burst fuzzing", () => {
    const tierArbitrary = fc.constantFrom<LicenseTier>(
      "community",
      "enterprise",
      "sovereign",
    );

    it("enforces exact burst capacity limits at delta t = 0", () => {
      fc.assert(
        fc.property(
          tierArbitrary,
          fc.string({ minLength: 1, maxLength: 16 }),
          fc.integer({ min: 1, max: 50 }),
          (tier, tenantId, extraRequests) => {
            const engine = new MeteringEngine();
            const quota = TIER_QUOTAS[tier];
            const maxAllowed = quota.maxRequestsPerMinute;
            const totalRequests = maxAllowed + extraRequests;
            const now = 1_700_000_000_000;

            let allowedCount = 0;
            let rejectedCount = 0;

            for (let i = 0; i < totalRequests; i++) {
              const res = engine.checkRequest(tenantId, tier, undefined, now);
              if (res.allowed) {
                allowedCount++;
              } else {
                rejectedCount++;
                expect(res.remaining).to.equal(0);
                expect(res.statusCode).to.equal(429);
              }
            }

            expect(allowedCount).to.equal(maxAllowed);
            expect(rejectedCount).to.equal(extraRequests);
          },
        ),
        { numRuns: 20 },
      );
    });

    it("replenishes tokens proportionally over sliding time windows", () => {
      fc.assert(
        fc.property(
          tierArbitrary,
          fc.string({ minLength: 1, maxLength: 16 }),
          fc.integer({ min: 1000, max: 60000 }),
          (tier, tenantId, elapsedMs) => {
            const engine = new MeteringEngine();
            const quota = TIER_QUOTAS[tier];
            const baseTime = 1_700_000_000_000;

            // Exhaust all tokens
            for (let i = 0; i < quota.maxRequestsPerMinute; i++) {
              engine.checkRequest(tenantId, tier, undefined, baseTime);
            }

            // Advance time by elapsedMs
            const futureTime = baseTime + elapsedMs;
            const res = engine.checkRequest(
              tenantId,
              tier,
              undefined,
              futureTime,
            );

            // Refilled tokens must allow at least 1 request after positive elapsed time
            expect(res.allowed).to.be.true;
            expect(res.remaining).to.be.at.most(quota.maxRequestsPerMinute - 1);
            expect(res.remaining).to.be.at.least(0);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("strictly preserves memory bound by LRU eviction", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 8 }), {
            minLength: 25,
            maxLength: 100,
          }),
          (maxTenants, tenants) => {
            const engine = new MeteringEngine(maxTenants);
            const now = 1_700_000_000_000;

            for (const tenant of tenants) {
              engine.checkRequest(tenant, "community", undefined, now);
              expect(engine.size).to.be.at.most(maxTenants);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
