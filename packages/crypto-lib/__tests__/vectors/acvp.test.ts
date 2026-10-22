/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// NIST ACVP known-answer tests for ML-KEM (FIPS 203), ML-DSA (FIPS 204)
// and SLH-DSA (FIPS 205), through the objects crypto-lib uses. Decapsulation
// and verification run on the native back end where the runtime has it,
// key generation from a seed, encapsulation with fixed randomness and
// deterministic signing on noble. Fixtures: scripts/acvp-vectors.mjs, from
// usnistgov/ACVP-Server at a pinned commit (see each file's `source`).
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import * as pq from "../../src/accel/pq-backend";

interface Fixture {
  testGroups: Array<
    Record<string, unknown> & { tests: Array<Record<string, unknown>> }
  >;
}

function fixture(name: string): Fixture {
  const dir = path.join(
    String(process.env["CRYPTO_KEY_DIR"]),
    "..",
    "vectors",
    "acvp",
  );
  return JSON.parse(
    readFileSync(path.join(dir, `${name}.json`), "utf8"),
  ) as Fixture;
}

const hex = (value: unknown) =>
  Uint8Array.from(Buffer.from(String(value), "hex"));
const toHex = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("hex").toUpperCase();

/** The crypto-lib object for an ACVP parameter set name. */
function scheme(
  parameterSet: unknown,
): typeof pq.ml_dsa44 & typeof pq.ml_kem768 {
  const name = String(parameterSet)
    .toLowerCase()
    .replace(/^ml-kem-/, "ml_kem")
    .replace(/^ml-dsa-/, "ml_dsa")
    .replace(/^slh-dsa-/, "slh_dsa_")
    .replace(/-/g, "_");
  const found = (pq as unknown as Record<string, unknown>)[name];
  if (!found) throw new Error(`no scheme for ${String(parameterSet)}`);
  return found as typeof pq.ml_dsa44 & typeof pq.ml_kem768;
}

describe("NIST ACVP known answers", function () {
  this.timeout(120000);

  describe("ML-KEM (FIPS 203)", () => {
    for (const g of fixture("ML-KEM-keyGen-FIPS203").testGroups) {
      it(`${String(g["parameterSet"])} key generation from d || z`, () => {
        for (const t of g.tests) {
          const kp = scheme(g["parameterSet"]).keygen(
            Buffer.concat([hex(t["d"]), hex(t["z"])]),
          );
          expect(toHex(kp.publicKey), `tc ${String(t["tcId"])}`).to.equal(
            t["ek"],
          );
          expect(toHex(kp.secretKey), `tc ${String(t["tcId"])}`).to.equal(
            t["dk"],
          );
        }
      });
    }

    for (const g of fixture("ML-KEM-encapDecap-FIPS203").testGroups) {
      const kem = scheme(g["parameterSet"]);
      it(`${String(g["parameterSet"])} ${String(g["function"])}`, () => {
        for (const t of g.tests) {
          const tc = `tc ${String(t["tcId"])}`;
          switch (g["function"]) {
            case "encapsulation": {
              const out = kem.encapsulate(hex(t["ek"]), hex(t["m"]));
              expect(toHex(out.cipherText), tc).to.equal(t["c"]);
              expect(toHex(out.sharedSecret), tc).to.equal(t["k"]);
              break;
            }
            case "decapsulation":
              expect(
                toHex(kem.decapsulate(hex(t["c"]), hex(t["dk"]))),
                tc,
              ).to.equal(t["k"]);
              break;
            case "encapsulationKeyCheck":
              expect(() => kem.encapsulate(hex(t["ek"])), tc)[
                t["testPassed"] ? "not" : "to"
              ].throw();
              break;
            default: {
              const ct = new Uint8Array(kem.lengths.cipherText!);
              expect(() => kem.decapsulate(ct, hex(t["dk"])), tc)[
                t["testPassed"] ? "not" : "to"
              ].throw();
            }
          }
        }
      });
    }
  });

  describe("ML-DSA (FIPS 204)", () => {
    for (const g of fixture("ML-DSA-keyGen-FIPS204").testGroups) {
      it(`${String(g["parameterSet"])} key generation from a seed`, () => {
        for (const t of g.tests) {
          const kp = scheme(g["parameterSet"]).keygen(hex(t["seed"]));
          expect(toHex(kp.publicKey), `tc ${String(t["tcId"])}`).to.equal(
            t["pk"],
          );
          expect(toHex(kp.secretKey), `tc ${String(t["tcId"])}`).to.equal(
            t["sk"],
          );
        }
      });
    }

    for (const g of fixture("ML-DSA-sigGen-FIPS204").testGroups) {
      it(`${String(g["parameterSet"])} deterministic signing`, () => {
        for (const t of g.tests) {
          const sig = scheme(g["parameterSet"]).sign(
            hex(t["message"]),
            hex(t["sk"]),
            {
              context: hex(t["context"]),
              extraEntropy: false,
            },
          );
          expect(toHex(sig), `tc ${String(t["tcId"])}`).to.equal(
            t["signature"],
          );
        }
      });
    }

    for (const g of fixture("ML-DSA-sigVer-FIPS204").testGroups) {
      it(`${String(g["parameterSet"])} verification`, () => {
        for (const t of g.tests) {
          const context = hex(t["context"]);
          const valid = scheme(g["parameterSet"]).verify(
            hex(t["signature"]),
            hex(t["message"]),
            hex(t["pk"]),
            ...(context.length > 0 ? [{ context }] : []),
          );
          expect(
            valid,
            `tc ${String(t["tcId"])}: ${String(t["reason"])}`,
          ).to.equal(t["testPassed"]);
        }
      });
    }
  });

  describe("SLH-DSA (FIPS 205)", () => {
    for (const g of fixture("SLH-DSA-keyGen-FIPS205").testGroups) {
      it(`${String(g["parameterSet"])} key generation from seeds`, () => {
        for (const t of g.tests) {
          const kp = scheme(g["parameterSet"]).keygen(
            Buffer.concat([
              hex(t["skSeed"]),
              hex(t["skPrf"]),
              hex(t["pkSeed"]),
            ]),
          );
          expect(toHex(kp.publicKey), `tc ${String(t["tcId"])}`).to.equal(
            t["pk"],
          );
          expect(toHex(kp.secretKey), `tc ${String(t["tcId"])}`).to.equal(
            t["sk"],
          );
        }
      });
    }

    for (const g of fixture("SLH-DSA-sigGen-FIPS205").testGroups) {
      it(`${String(g["parameterSet"])} deterministic signing`, () => {
        for (const t of g.tests) {
          const sig = scheme(g["parameterSet"]).sign(
            hex(t["message"]),
            hex(t["sk"]),
            {
              context: hex(t["context"]),
              extraEntropy: false,
            },
          );
          expect(toHex(sig), `tc ${String(t["tcId"])}`).to.equal(
            t["signature"],
          );
        }
      });
    }

    for (const g of fixture("SLH-DSA-sigVer-FIPS205").testGroups) {
      it(`${String(g["parameterSet"])} verification`, () => {
        for (const t of g.tests) {
          const context = hex(t["context"]);
          const valid = scheme(g["parameterSet"]).verify(
            hex(t["signature"]),
            hex(t["message"]),
            hex(t["pk"]),
            ...(context.length > 0 ? [{ context }] : []),
          );
          expect(
            valid,
            `tc ${String(t["tcId"])}: ${String(t["reason"])}`,
          ).to.equal(t["testPassed"]);
        }
      });
    }
  });
});
