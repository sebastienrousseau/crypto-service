/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Property-based fuzzing with fast-check of request validation that
// handles untrusted strings.

import { expect } from "chai";
import fc from "fast-check";
import { isEmailShaped } from "../src/utils/validation";

/** The regex isEmailShaped replaced (it backtracks polynomially). */
const LEGACY_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Short strings over the characters that matter to the email shape. */
const emailish = fc.string({
  unit: fc.constantFrom("a", "b", ".", "@", " ", "\t", "\n", "é", "-"),
  maxLength: 12,
});

describe("validation fuzzing (fast-check)", () => {
  it("isEmailShaped accepts exactly what the old regex accepted", () => {
    fc.assert(
      fc.property(fc.oneof(emailish, fc.string()), (s) => {
        expect(isEmailShaped(s)).to.equal(LEGACY_EMAIL.test(s));
      }),
      { numRuns: 2000 },
    );
  });
});
