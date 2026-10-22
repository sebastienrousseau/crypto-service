/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Wycheproof vectors (C2SP/wycheproof, pinned in each fixture's `source`;
// scripts/wycheproof-vectors.mjs regenerates them) through crypto-lib's
// public functions: every "valid" case must be accepted with the expected
// output, every "invalid" one refused. "acceptable" cases may go either way.
import { expect } from "chai";
import { readFileSync } from "fs";
import * as path from "path";
import { aeadDecrypt } from "../../src/modern/aead";
import { aesGcmDecrypt, aesGcmSivDecrypt } from "../../src/modern/aes";
import { x25519Exchange } from "../../src/modern/ecdh";
import { crypto } from "../../src/crypto";

type Group = Record<string, unknown> & {
  tests: Array<Record<string, unknown> & { tcId: number; result: string }>;
};

function groups(name: string): Group[] {
  const dir = path.join(
    String(process.env["CRYPTO_KEY_DIR"]),
    "..",
    "vectors",
    "wycheproof",
  );
  const file = path.join(dir, `${name}_test.json`);
  return (JSON.parse(readFileSync(file, "utf8")) as { testGroups: Group[] })
    .testGroups;
}

const b64 = (...parts: unknown[]) =>
  Buffer.concat(parts.map((p) => Buffer.from(String(p), "hex"))).toString(
    "base64",
  );
const bytes = (h: unknown) => Uint8Array.from(Buffer.from(String(h), "hex"));

/** Cases whose outcome differs from Wycheproof's verdict, as `tcId: comment`. */
function mismatches(
  name: string,
  run: (g: Group, t: Group["tests"][number]) => boolean | "skip",
): string[] {
  const out: string[] = [];
  for (const g of groups(name)) {
    for (const t of g.tests) {
      let accepted: boolean | "skip";
      try {
        accepted = run(g, t);
      } catch {
        accepted = false;
      }
      if (accepted === "skip" || t.result === "acceptable") continue;
      if (accepted !== (t.result === "valid")) {
        out.push(`${t.tcId}: ${String(t["comment"])}`);
      }
    }
  }
  return out;
}

/** Whether `decrypt` returns the vector's plaintext. */
const decrypts = (t: Record<string, unknown>, decrypt: () => Uint8Array) =>
  Buffer.from(decrypt()).toString("hex") === t["msg"];

describe("Wycheproof", function () {
  this.timeout(60000);

  it("XChaCha20-Poly1305 (aeadDecrypt)", () => {
    expect(
      mismatches("xchacha20_poly1305", (g, t) =>
        g["ivSize"] !== 192 || g["keySize"] !== 256
          ? "skip"
          : decrypts(t, () =>
              aeadDecrypt({
                key: String(t["key"]),
                ciphertext: b64(t["iv"], t["ct"], t["tag"]),
                aad: bytes(t["aad"]),
              }),
            ),
      ),
    ).to.deep.equal([]);
  });

  for (const [name, decrypt] of [
    ["aes_gcm", aesGcmDecrypt],
    ["aes_gcm_siv", aesGcmSivDecrypt],
  ] as const) {
    it(`${name} with 96-bit nonces`, () => {
      expect(
        mismatches(name, (g, t) =>
          g["ivSize"] !== 96 || ![128, 256].includes(g["keySize"] as number)
            ? "skip"
            : decrypts(t, () =>
                decrypt({
                  key: String(t["key"]),
                  ciphertext: b64(t["iv"], t["ct"], t["tag"]),
                  aad: bytes(t["aad"]),
                }),
              ),
        ),
      ).to.deep.equal([]);
    });
  }

  it("X25519 (x25519Exchange)", () => {
    expect(
      mismatches(
        "x25519",
        (_g, t) =>
          x25519Exchange(String(t["private"]), String(t["public"]))
            .sharedSecret === t["shared"],
      ),
    ).to.deep.equal([]);
  });

  for (const [name, algorithm, key] of [
    ["ed25519", "ed25519", "pk"],
    ["ed448", "ed448", "pk"],
    ["ecdsa_secp256r1_sha256_p1363", "ecdsa-p256", "uncompressed"],
    ["ecdsa_secp384r1_sha384_p1363", "ecdsa-p384", "uncompressed"],
  ] as const) {
    it(`${algorithm} signature verification`, () => {
      expect(
        mismatches(name, (g, t) =>
          crypto.verify(
            algorithm,
            (g["publicKey"] as Record<string, string>)[key]!,
            bytes(t["msg"]),
            String(t["sig"]),
          ),
        ),
      ).to.deep.equal([]);
    });
  }
});
