/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { x25519 } from "@noble/curves/ed25519.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { streamEncrypt, streamDecrypt } from "../../src/streaming/stream-aead";
import {
  streamPqEncrypt,
  streamPqDecrypt,
} from "../../src/streaming/stream-pq-aead";
import {
  streamMultiPqEncrypt,
  streamMultiPqDecrypt,
} from "../../src/streaming/stream-multi-pq-aead";

// Characterisation net for the three STREAM encryptors' wire layout:
// for each plaintext length and chunk size, the ciphertext length and
// the tag byte of every chunk (found by walking the stream as a decryptor
// does), and a round trip. The multi-recipient header length depends on
// its slots, so that stream records its length and round trip; its
// unchanged decryptor checks the layout. Ciphertext bytes are random
// (nonces, keys); the layout is not. Expected values are in fixtures/layout.golden.json.

const LENGTHS = [0, 1, 6, 7, 8, 63, 64, 65, 128, 1023, 1024, 1025, 3000, 4096];
const TAG_LEN = 16;

/** Tag bytes of each chunk, walking from `headerLen`. */
function chunkTags(ct: Uint8Array, headerLen: number, chunkSize: number) {
  const tags: number[] = [];
  let offset = headerLen;
  while (offset < ct.length) {
    const tag = ct[offset]!;
    tags.push(tag);
    offset += 1 + (tag === 1 ? ct.length - offset - 1 : chunkSize + TAG_LEN);
  }
  return tags;
}

const plaintextOf = (n: number) =>
  Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) & 0xff);

export function runLayouts(): unknown {
  const key = new Uint8Array(32).fill(5);
  const xSec = new Uint8Array(32).fill(9);
  const xPub = x25519.getPublicKey(xSec);
  const { publicKey: mlPub, secretKey: mlSec } = ml_kem768.keygen(
    new Uint8Array(64).fill(1),
  );
  const out: Record<string, unknown[]> = { aead: [], pq: [], multi: [] };

  for (const chunkSize of [1, 7, 64, 1024]) {
    for (const n of LENGTHS) {
      const pt = plaintextOf(n);
      const a = streamEncrypt({ key, plaintext: pt, chunkSize }).ciphertext;
      const aBack = streamDecrypt({ key, ciphertext: a, chunkSize });
      out.aead!.push({
        chunkSize,
        n,
        length: a.length,
        tags: chunkTags(a, 24, chunkSize),
        roundTrip: Buffer.from(aBack).equals(Buffer.from(pt)),
      });
      const p = streamPqEncrypt({
        recipientX25519Public: xPub,
        recipientMlKemPublic: mlPub,
        plaintext: pt,
        chunkSize,
      }).ciphertext;
      const pBack = streamPqDecrypt({
        recipientX25519Secret: xSec,
        recipientMlKemSecret: mlSec,
        ciphertext: p,
        chunkSize,
      });
      out.pq!.push({
        chunkSize,
        n,
        length: p.length,
        tags: chunkTags(p, 1144, chunkSize),
        roundTrip: Buffer.from(pBack).equals(Buffer.from(pt)),
      });
    }
  }

  const recipients = ["alice", "bob"].map((recipientId) => ({
    recipientId,
    recipientX25519Public: xPub,
    recipientMlKemPublic: mlPub,
  }));
  for (const chunkSize of [1024, 1500, 4096]) {
    for (const n of LENGTHS) {
      const pt = plaintextOf(n);
      const m = streamMultiPqEncrypt({ recipients, plaintext: pt, chunkSize });
      const back = streamMultiPqDecrypt({
        recipientId: "bob",
        recipientX25519Secret: xSec,
        recipientMlKemSecret: mlSec,
        ciphertext: m.ciphertext,
      });
      out.multi!.push({
        chunkSize,
        n,
        length: m.ciphertext.length,
        recipientCount: m.recipientCount,
        roundTrip: Buffer.from(back.plaintext).equals(Buffer.from(pt)),
      });
    }
  }
  return out;
}

describe("STREAM wire layout", function () {
  this.timeout(60000);
  it("lays out every stream exactly as recorded", () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/layout.golden.json"), "utf8"),
    );
    expect(runLayouts()).to.deep.equal(golden);
  });
});
