/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The PQXDH module called itself Signal's PQXDH but derived SK with its own
// HKDF (no 0xFF prefix, no zero salt, info "pqxdh-v1"), never verified the
// responder's pre-key signatures (it did not even take them), and gave no
// associated data. It now follows PQXDH revision 3 with curve25519,
// SHA-256 and ML-KEM-768; these tests recompute SK and AD from the spec.
import { expect } from "chai";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import * as pqxdh from "../../src/protocols/pqxdh";

const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, "hex"));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const cat = (...parts: Uint8Array[]) => Uint8Array.from(Buffer.concat(parts));

/** Bob's published bundle and his private parts. */
function bob() {
  const identity = pqxdh.generateIdentityKeyPair();
  return {
    identity,
    spk: pqxdh.generateSignedPreKey(identity),
    opk: pqxdh.generateOneTimePreKey(),
    pqpk: pqxdh.generatePqPreKey(identity),
  };
}

type Bob = ReturnType<typeof bob>;

/** Alice's call to initiateSession against Bob's bundle. */
const initiateParams = (
  alice: pqxdh.IdentityKeyPair,
  b: Bob,
  withOpk = true,
): pqxdh.InitiateSessionParams => ({
  identityKeyPair: alice,
  remoteIdentityPublic: b.identity.publicKey,
  remoteIdentitySigningPublic: b.identity.signingPublicKey,
  remoteSignedPreKeyPublic: b.spk.publicKey,
  remoteSignedPreKeySignature: b.spk.signature,
  remotePqPreKeyPublic: b.pqpk.publicKey,
  remotePqPreKeySignature: b.pqpk.signature,
  ...(withOpk ? { remoteOneTimePreKeyPublic: b.opk.publicKey } : {}),
});

/** Bob's call to respondToSession for Alice's first message. */
const respondParams = (
  alice: pqxdh.IdentityKeyPair,
  b: Bob,
  init: pqxdh.InitiateSessionResult,
  withOpk = true,
): pqxdh.RespondToSessionParams => ({
  identityKeyPair: b.identity,
  signedPreKeyPrivate: b.spk.privateKey,
  pqPreKeySecret: b.pqpk.secretKey,
  remoteIdentityPublic: alice.publicKey,
  remoteEphemeralPublic: init.ephemeralPublicKey,
  pqCiphertext: init.pqCiphertext,
  ...(withOpk ? { oneTimePreKeyPrivate: b.opk.privateKey } : {}),
});

describe("PQXDH (revision 3: curve25519, SHA-256, ML-KEM-768)", function () {
  this.timeout(30000);

  it("generates keys of the right sizes", () => {
    const identity = pqxdh.generateIdentityKeyPair();
    expect(identity.privateKey).to.have.length(64);
    expect(identity.publicKey).to.have.length(64);
    expect(identity.signingPrivateKey).to.have.length(64);
    expect(identity.signingPublicKey).to.have.length(64);
    const spk = pqxdh.generateSignedPreKey(identity);
    expect(spk.signature).to.have.length(128);
    expect(pqxdh.generateOneTimePreKey().publicKey).to.have.length(64);
    const pqpk = pqxdh.generatePqPreKey(identity);
    expect(pqpk.publicKey).to.have.length(2368);
    expect(pqpk.signature).to.have.length(128);
  });

  for (const withOpk of [true, false]) {
    it(`derives SK and AD as the spec defines them (${withOpk ? "with" : "without"} a one-time pre-key)`, () => {
      const b = bob();
      const alice = pqxdh.generateIdentityKeyPair();
      const init = pqxdh.initiateSession(initiateParams(alice, b, withOpk));
      const resp = pqxdh.respondToSession(
        respondParams(alice, b, init, withOpk),
      );

      // SK from Bob's side, computed independently from the spec.
      const eph = bytes(init.ephemeralPublicKey);
      const km = [
        x25519.getSharedSecret(bytes(b.spk.privateKey), bytes(alice.publicKey)),
        x25519.getSharedSecret(bytes(b.identity.privateKey), eph),
        x25519.getSharedSecret(bytes(b.spk.privateKey), eph),
        ...(withOpk
          ? [x25519.getSharedSecret(bytes(b.opk.privateKey), eph)]
          : []),
        ml_kem768.decapsulate(
          bytes(init.pqCiphertext),
          bytes(b.pqpk.secretKey),
        ),
      ];
      const sk = hkdf(
        sha256,
        cat(new Uint8Array(32).fill(0xff), ...km),
        new Uint8Array(32),
        new TextEncoder().encode(
          "crypto-service_CURVE25519_SHA-256_ML-KEM-768",
        ),
        32,
      );
      expect(init.sharedSecret).to.equal(hex(sk));
      expect(resp.sharedSecret).to.equal(hex(sk));

      const ad = cat(
        new Uint8Array([1]),
        bytes(alice.publicKey),
        new Uint8Array([1]),
        bytes(b.identity.publicKey),
      );
      expect(init.associatedData).to.equal(hex(ad));
      expect(resp.associatedData).to.equal(hex(ad));
    });
  }

  it("aborts when the signed pre-key's signature does not verify", () => {
    const b = bob();
    const alice = pqxdh.generateIdentityKeyPair();
    const forged = pqxdh.generateSignedPreKey(pqxdh.generateIdentityKeyPair());
    expect(() =>
      pqxdh.initiateSession({
        ...initiateParams(alice, b),
        remoteSignedPreKeyPublic: forged.publicKey,
        remoteSignedPreKeySignature: forged.signature,
      }),
    ).to.throw("Invalid signed pre-key signature");
  });

  it("aborts when the PQ pre-key's signature does not verify", () => {
    const b = bob();
    const alice = pqxdh.generateIdentityKeyPair();
    const swapped = pqxdh.generatePqPreKey(pqxdh.generateIdentityKeyPair());
    expect(() =>
      pqxdh.initiateSession({
        ...initiateParams(alice, b),
        remotePqPreKeyPublic: swapped.publicKey,
      }),
    ).to.throw("Invalid PQ pre-key signature");
    expect(() =>
      pqxdh.initiateSession({
        ...initiateParams(alice, b),
        remotePqPreKeySignature: "00".repeat(10),
      }),
    ).to.throw("Invalid PQ pre-key signature");
  });

  // Each signature covers the X25519 identity key too, so a bundle that
  // pairs Bob's signing key with another X25519 identity is refused.
  it("aborts when the X25519 identity key was swapped", () => {
    const b = bob();
    const alice = pqxdh.generateIdentityKeyPair();
    expect(() =>
      pqxdh.initiateSession({
        ...initiateParams(alice, b),
        remoteIdentityPublic: pqxdh.generateIdentityKeyPair().publicKey,
      }),
    ).to.throw("Invalid signed pre-key signature");
  });

  it("uses the application name in the KDF and refuses a short one", () => {
    const b = bob();
    const alice = pqxdh.generateIdentityKeyPair();
    const init = pqxdh.initiateSession({
      ...initiateParams(alice, b),
      info: "ExampleApp",
    });
    const same = pqxdh.respondToSession({
      ...respondParams(alice, b, init),
      info: "ExampleApp",
    });
    const other = pqxdh.respondToSession(respondParams(alice, b, init));
    expect(same.sharedSecret).to.equal(init.sharedSecret);
    expect(other.sharedSecret).to.not.equal(init.sharedSecret);
    expect(() =>
      pqxdh.initiateSession({ ...initiateParams(alice, b), info: "short" }),
    ).to.throw(/at least 8/);
  });

  it("refuses malformed hex", () => {
    const b = bob();
    const alice = pqxdh.generateIdentityKeyPair();
    expect(() =>
      pqxdh.initiateSession({
        ...initiateParams(alice, b),
        remoteSignedPreKeySignature: "zz",
      }),
    ).to.throw("Invalid hex string for remoteSignedPreKeySignature");
  });
});
