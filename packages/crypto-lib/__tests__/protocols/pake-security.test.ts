/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Security tests for src/protocols/pake.ts (RFC 9807 OPAQUE-3DH): wrong
// passwords, unknown users (fake records), tampered and malformed
// messages, mismatched configuration, and constant-time MAC comparison.

import { expect } from "chai";
import * as pake from "../../src/protocols/pake";
import * as utils from "../../src/utils";
import { CryptoError } from "../../src/errors";

const config: pake.OpaqueConfig = { ksf: pake.scryptKsf({ N: 1024 }) };
const C = pake.OpaqueErrorCode;

function expectCode(fn: () => unknown, code: string) {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught, `expected ${code}`).to.be.instanceOf(CryptoError);
  expect((caught as CryptoError).code).to.equal(code);
}

function registerAlice(
  password: string,
  cfg = config,
  ids: pake.Identities = {},
) {
  const setup = pake.createServerSetup(cfg);
  const { request, blind } = pake.createRegistrationRequest(password, cfg);
  const response = pake.createRegistrationResponse(
    request,
    setup.serverPublicKey,
    "alice",
    setup.oprfSeed,
    cfg,
  );
  const { record } = pake.finalizeRegistrationRequest(
    password,
    blind,
    response,
    ids,
    cfg,
  );
  return { setup, record };
}

const alice = registerAlice("right password");

function startLogin(
  password: string,
  record = alice.record,
  cfg = config,
  setup = alice.setup,
  ids: pake.Identities = {},
) {
  const client = pake.generateKE1(password, cfg);
  const server = pake.generateKE2(
    {
      ...setup,
      record,
      credentialIdentifier: "alice",
      ke1: client.ke1,
      ...ids,
    },
    cfg,
  );
  return { client, server };
}

/** Flip one bit of `ke2`'s wire encoding at byte `offset`. */
function tamperKE2(ke2: pake.KE2, offset: number): pake.KE2 {
  const bytes = pake.serializeKE2(ke2);
  bytes[offset] = (bytes[offset] as number) ^ 0x01;
  return pake.deserializeKE2(bytes);
}

describe("PAKE security (RFC 9807 OPAQUE-3DH)", () => {
  describe("registration", () => {
    it("never sends the password or the OPRF output to the server", () => {
      const { request } = pake.createRegistrationRequest(
        "right password",
        config,
      );
      const again = pake.createRegistrationRequest("right password", config);
      expect(request.blindedMessage).to.not.deep.equal(
        again.request.blindedMessage,
      );
      expect(
        Buffer.from(request.blindedMessage).includes(
          Buffer.from("right password"),
        ),
      ).to.equal(false);
    });

    it("stores no OPRF key or server secret in the record", () => {
      const bytes = Buffer.from(pake.serializeRegistrationRecord(alice.record));
      expect(bytes.includes(Buffer.from(alice.setup.oprfSeed))).to.equal(false);
      expect(
        bytes.includes(Buffer.from(alice.setup.serverPrivateKey)),
      ).to.equal(false);
      expect(Object.keys(alice.record).sort()).to.deep.equal([
        "clientPublicKey",
        "envelope",
        "maskingKey",
      ]);
    });

    it("gives different records for the same password", () => {
      const other = registerAlice("right password");
      expect(other.record.envelope.nonce).to.not.deep.equal(
        alice.record.envelope.nonce,
      );
      expect(other.record.clientPublicKey).to.not.deep.equal(
        alice.record.clientPublicKey,
      );
    });

    it("rejects an invalid server public key in the registration response", () => {
      const { request, blind } = pake.createRegistrationRequest("pw", config);
      const response = pake.createRegistrationResponse(
        request,
        alice.setup.serverPublicKey,
        "alice",
        alice.setup.oprfSeed,
        config,
      );
      const bad = {
        ...response,
        serverPublicKey: new Uint8Array(33).fill(0xff),
      };
      bad.serverPublicKey[0] = 0x02;
      expectCode(
        () => pake.finalizeRegistrationRequest("pw", blind, bad, {}, config),
        C.DESERIALIZE,
      );
    });

    it("rejects the identity element as server public key (ristretto255)", () => {
      const cfg = { ...config, suite: "ristretto255-SHA512" as const };
      const setup = pake.createServerSetup(cfg);
      const { request, blind } = pake.createRegistrationRequest("pw", cfg);
      const response = pake.createRegistrationResponse(
        request,
        setup.serverPublicKey,
        "alice",
        setup.oprfSeed,
        cfg,
      );
      const bad = { ...response, serverPublicKey: new Uint8Array(32) };
      expectCode(
        () => pake.finalizeRegistrationRequest("pw", blind, bad, {}, cfg),
        C.DESERIALIZE,
      );
    });

    it("the server rejects a record with an invalid client public key", () => {
      const bytes = pake.serializeRegistrationRecord(alice.record);
      bytes.fill(0xff, 1, 33);
      expectCode(
        () => pake.deserializeRegistrationRecord(bytes),
        C.DESERIALIZE,
      );
      const record = { ...alice.record, clientPublicKey: bytes.slice(0, 33) };
      const { ke1 } = pake.generateKE1("right password", config);
      expectCode(
        () =>
          pake.generateKE2(
            { ...alice.setup, record, credentialIdentifier: "alice", ke1 },
            config,
          ),
        C.DESERIALIZE,
      );
    });

    it("rejects an invalid blinded element", () => {
      const request = { blindedMessage: new Uint8Array(33).fill(0xff) };
      request.blindedMessage[0] = 0x02;
      expect(() =>
        pake.createRegistrationResponse(
          request,
          alice.setup.serverPublicKey,
          "alice",
          alice.setup.oprfSeed,
          config,
        ),
      ).to.throw();
    });
  });

  describe("wrong password", () => {
    it("the client cannot recover the envelope", () => {
      const { client, server } = startLogin("wrong password");
      expectCode(
        () => pake.generateKE3(client.state, server.ke2),
        C.ENVELOPE_RECOVERY,
      );
    });

    it("the server rejects any KE3 it did not get from the right client", () => {
      const { server } = startLogin("wrong password");
      expectCode(
        () =>
          pake.serverFinish(server.state, { clientMac: new Uint8Array(32) }),
        C.CLIENT_AUTHENTICATION,
      );
      expectCode(
        () =>
          pake.serverFinish(server.state, { clientMac: new Uint8Array(31) }),
        C.CLIENT_AUTHENTICATION,
      );
      const honest = startLogin("right password");
      const { ke3 } = pake.generateKE3(honest.client.state, honest.server.ke2);
      expectCode(
        () => pake.serverFinish(server.state, ke3),
        C.CLIENT_AUTHENTICATION,
      );
    });
  });

  describe("unknown user", () => {
    const fake = pake.createFakeRecord(config);

    it("a fake record has the shape of a real one", () => {
      expect(pake.serializeRegistrationRecord(fake)).to.have.length(
        pake.serializeRegistrationRecord(alice.record).length,
      );
      expect(fake.envelope.nonce.every((b) => b === 0)).to.equal(true);
      expect(fake.envelope.authTag.every((b) => b === 0)).to.equal(true);
      expect(fake.maskingKey).to.not.deep.equal(
        pake.createFakeRecord(config).maskingKey,
      );
    });

    it("gets a KE2 indistinguishable in length and structure, and fails like a wrong password", () => {
      const real = startLogin("right password");
      const unknown = startLogin("right password", fake);
      const realBytes = pake.serializeKE2(real.server.ke2);
      const fakeBytes = pake.serializeKE2(unknown.server.ke2);
      expect(fakeBytes).to.have.length(realBytes.length);
      expect(pake.serializeKE2(pake.deserializeKE2(fakeBytes))).to.deep.equal(
        fakeBytes,
      );
      expectCode(
        () => pake.generateKE3(unknown.client.state, unknown.server.ke2),
        C.ENVELOPE_RECOVERY,
      );
      expectCode(
        () =>
          pake.serverFinish(unknown.server.state, {
            clientMac: new Uint8Array(32),
          }),
        C.CLIENT_AUTHENTICATION,
      );
    });

    it("works for the ristretto255 suite too", () => {
      const cfg = { ...config, suite: "ristretto255-SHA512" as const };
      const setup = pake.createServerSetup(cfg);
      const fakeR = pake.createFakeRecord(cfg);
      const { client, server } = startLogin("pw", fakeR, cfg, setup);
      expect(pake.serializeKE2(server.ke2)).to.have.length(320);
      expectCode(
        () => pake.generateKE3(client.state, server.ke2),
        C.ENVELOPE_RECOVERY,
      );
    });
  });

  describe("tampered KE2", () => {
    // P256-SHA256 KE2 layout: evaluated_message 0..32, masking_nonce 33..64,
    // masked_response 65..161, server_nonce 162..193,
    // server_public_keyshare 194..226, server_mac 227..258.
    const cases: [string, number, string[]][] = [
      ["evaluated message (negated point)", 0, [C.ENVELOPE_RECOVERY]],
      ["masking nonce", 40, [C.ENVELOPE_RECOVERY]],
      ["masked server public key", 70, [C.ENVELOPE_RECOVERY]],
      ["masked envelope nonce", 110, [C.ENVELOPE_RECOVERY]],
      ["masked auth tag", 150, [C.ENVELOPE_RECOVERY]],
      ["server nonce", 170, [C.SERVER_AUTHENTICATION]],
      ["server keyshare (negated point)", 194, [C.SERVER_AUTHENTICATION]],
      [
        "server keyshare x-coordinate",
        210,
        [C.DESERIALIZE, C.SERVER_AUTHENTICATION],
      ],
      ["server MAC", 240, [C.SERVER_AUTHENTICATION]],
    ];
    for (const [name, offset, codes] of cases) {
      it(`fails when the ${name} is modified`, () => {
        const { client, server } = startLogin("right password");
        let caught: unknown;
        try {
          pake.generateKE3(client.state, tamperKE2(server.ke2, offset));
        } catch (e) {
          caught = e;
        }
        expect(caught).to.be.instanceOf(CryptoError);
        expect(codes).to.include((caught as CryptoError).code);
      });
    }

    it("fails when the evaluated element is not a valid point", () => {
      const { client, server } = startLogin("right password");
      const bytes = pake.serializeKE2(server.ke2);
      bytes.fill(0xff, 1, 33);
      expect(() =>
        pake.generateKE3(client.state, pake.deserializeKE2(bytes)),
      ).to.throw();
    });

    it("rejects the identity element as server keyshare (ristretto255)", () => {
      const cfg = { ...config, suite: "ristretto255-SHA512" as const };
      const reg = registerAlice("pw", cfg);
      const { client, server } = startLogin("pw", reg.record, cfg, reg.setup);
      const ke2 = {
        ...server.ke2,
        authResponse: {
          ...server.ke2.authResponse,
          serverPublicKeyshare: new Uint8Array(32),
        },
      };
      expectCode(() => pake.generateKE3(client.state, ke2), C.DESERIALIZE);
    });
  });

  describe("tampered KE1 and KE3", () => {
    it("the server rejects an invalid client keyshare", () => {
      const client = pake.generateKE1("right password", config);
      const ke1 = {
        ...client.ke1,
        authRequest: {
          ...client.ke1.authRequest,
          clientPublicKeyshare: Uint8Array.of(
            0x03,
            ...new Uint8Array(32).fill(0xff),
          ),
        },
      };
      expectCode(
        () =>
          pake.generateKE2(
            {
              ...alice.setup,
              record: alice.record,
              credentialIdentifier: "alice",
              ke1,
            },
            config,
          ),
        C.DESERIALIZE,
      );
    });

    it("the server rejects a modified KE3", () => {
      const { client, server } = startLogin("right password");
      const { ke3 } = pake.generateKE3(client.state, server.ke2);
      const bad = ke3.clientMac.slice();
      bad[0] = (bad[0] as number) ^ 0x80;
      expectCode(
        () => pake.serverFinish(server.state, { clientMac: bad }),
        C.CLIENT_AUTHENTICATION,
      );
      expect(pake.serverFinish(server.state, ke3)).to.have.length(32);
    });

    it("the server rejects a KE1 that the client changed after the fact", () => {
      const { client, server } = startLogin("right password");
      const otherKe1 = pake.generateKE1("right password", config).ke1;
      const state = { ...client.state, ke1: otherKe1 };
      expectCode(
        () => pake.generateKE3(state, server.ke2),
        C.SERVER_AUTHENTICATION,
      );
    });
  });

  describe("mismatched parameters", () => {
    it("a different context fails server authentication", () => {
      const client = pake.generateKE1("right password", {
        ...config,
        context: "client-ctx",
      });
      const server = pake.generateKE2(
        {
          ...alice.setup,
          record: alice.record,
          credentialIdentifier: "alice",
          ke1: client.ke1,
        },
        { ...config, context: "server-ctx" },
      );
      expectCode(
        () => pake.generateKE3(client.state, server.ke2),
        C.SERVER_AUTHENTICATION,
      );
    });

    it("a different server identity fails envelope recovery", () => {
      const reg = registerAlice("pw", config, { serverIdentity: "a.example" });
      const { client, server } = startLogin(
        "pw",
        reg.record,
        config,
        reg.setup,
        { serverIdentity: "a.example" },
      );
      expectCode(
        () =>
          pake.generateKE3(client.state, server.ke2, {
            serverIdentity: "b.example",
          }),
        C.ENVELOPE_RECOVERY,
      );
    });

    it("a client identity the server does not share fails server authentication", () => {
      const reg = registerAlice("pw", config, { clientIdentity: "alice" });
      const { client, server } = startLogin(
        "pw",
        reg.record,
        config,
        reg.setup,
      );
      expectCode(
        () =>
          pake.generateKE3(client.state, server.ke2, {
            clientIdentity: "alice",
          }),
        C.SERVER_AUTHENTICATION,
      );
    });

    it("another credential identifier gives another OPRF key", () => {
      const client = pake.generateKE1("right password", config);
      const server = pake.generateKE2(
        {
          ...alice.setup,
          record: alice.record,
          credentialIdentifier: "mallory",
          ke1: client.ke1,
        },
        config,
      );
      expectCode(
        () => pake.generateKE3(client.state, server.ke2),
        C.ENVELOPE_RECOVERY,
      );
    });

    it("another server key pair fails envelope recovery (the envelope binds it)", () => {
      const evil = pake.createServerSetup(config);
      const { client, server } = startLogin(
        "right password",
        alice.record,
        config,
        {
          ...evil,
          oprfSeed: alice.setup.oprfSeed,
        },
      );
      expectCode(
        () => pake.generateKE3(client.state, server.ke2),
        C.ENVELOPE_RECOVERY,
      );
    });

    it("a different KSF fails envelope recovery", () => {
      const client = pake.generateKE1("right password", {
        ksf: pake.scryptKsf({ N: 2048 }),
      });
      const server = pake.generateKE2(
        {
          ...alice.setup,
          record: alice.record,
          credentialIdentifier: "alice",
          ke1: client.ke1,
        },
        config,
      );
      expectCode(
        () => pake.generateKE3(client.state, server.ke2),
        C.ENVELOPE_RECOVERY,
      );
    });
  });

  describe("constant-time comparison", () => {
    it("compares the envelope tag and both MACs with timingSafeEqual", () => {
      const calls: [Uint8Array, Uint8Array][] = [];
      const original = utils.timingSafeEqual;
      const mutable = utils as { timingSafeEqual: typeof original };
      mutable.timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
        calls.push([a, b]);
        return original(a, b);
      };
      try {
        const { client, server } = startLogin("right password");
        const { ke3 } = pake.generateKE3(client.state, server.ke2);
        pake.serverFinish(server.state, ke3);
        expect(calls).to.have.length(3);
        expect(calls[1]?.[0]).to.deep.equal(server.ke2.authResponse.serverMac);
        expect(calls[2]?.[0]).to.deep.equal(ke3.clientMac);
        expect(calls[2]?.[1]).to.deep.equal(server.state.expectedClientMac);
      } finally {
        mutable.timingSafeEqual = original;
      }
    });
  });
});
