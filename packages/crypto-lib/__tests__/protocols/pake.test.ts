/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// Protocol-level tests for src/protocols/pake.ts (RFC 9807 OPAQUE-3DH):
// full registration and login flows over the wire encoding, identities,
// context, configuration and message validation. The RFC 9807 Appendix C
// known-answer tests are in opaque-rfc9807.test.ts; attacks are in
// pake-security.test.ts.

import { expect } from "chai";
import * as pake from "../../src/protocols/pake";
import * as protocols from "../../src/protocols";
import { identityKsf } from "../../src/protocols/opaque/ksf";

/** A fast KSF so that the many flows below stay quick. */
const fastKsf = pake.scryptKsf({ N: 1024 });

interface Flow {
  setup: pake.ServerSetup;
  record: pake.RegistrationRecord;
  exportKey: Uint8Array;
}

/** Register `password` for "alice", passing every message as bytes. */
function register(
  password: string,
  config: pake.OpaqueConfig,
  ids: pake.Identities = {},
): Flow {
  const suite = config.suite ?? "P256-SHA256";
  const setup = pake.createServerSetup(config);
  const { request, blind } = pake.createRegistrationRequest(password, config);
  const response = pake.createRegistrationResponse(
    pake.deserializeRegistrationRequest(
      pake.serializeRegistrationRequest(request),
      suite,
    ),
    setup.serverPublicKey,
    "alice",
    setup.oprfSeed,
    config,
  );
  const fin = pake.finalizeRegistrationRequest(
    password,
    blind,
    pake.deserializeRegistrationResponse(
      pake.serializeRegistrationResponse(response),
      suite,
    ),
    ids,
    config,
  );
  const record = pake.deserializeRegistrationRecord(
    pake.serializeRegistrationRecord(fin.record),
    suite,
  );
  return { setup, record, exportKey: fin.exportKey };
}

/** Log in with `password`, passing every message as bytes. */
function login(
  flow: Flow,
  password: string,
  config: pake.OpaqueConfig,
  ids: pake.Identities = {},
) {
  const suite = config.suite ?? "P256-SHA256";
  const client = pake.generateKE1(password, config);
  const server = pake.generateKE2(
    {
      ...flow.setup,
      record: flow.record,
      credentialIdentifier: "alice",
      ke1: pake.deserializeKE1(pake.serializeKE1(client.ke1), suite),
      ...ids,
    },
    config,
  );
  const fin = pake.generateKE3(
    client.state,
    pake.deserializeKE2(pake.serializeKE2(server.ke2), suite),
    ids,
  );
  const serverKey = pake.serverFinish(
    server.state,
    pake.deserializeKE3(pake.serializeKE3(fin.ke3), suite),
  );
  return { fin, serverKey };
}

describe("PAKE (RFC 9807 OPAQUE-3DH)", () => {
  it("is exported from the protocols barrel", () => {
    expect(protocols.pake.generateKE1).to.equal(pake.generateKE1);
    expect(protocols.pake).to.not.have.property("serverRegister");
    expect(protocols.pake).to.not.have.property("generateKE1With");
    expect(protocols.pake).to.not.have.property("identityKsf");
  });

  it("logs in with the default configuration (P256-SHA256, scrypt KSF)", function () {
    this.timeout(20000);
    const flow = register("correct horse battery staple", {});
    const { fin, serverKey } = login(flow, "correct horse battery staple", {});
    expect(fin.sessionKey).to.have.length(32);
    expect(serverKey).to.deep.equal(fin.sessionKey);
    expect(fin.exportKey).to.deep.equal(flow.exportKey);
    expect(flow.record.clientPublicKey).to.have.length(33);
  });

  it("logs in over ristretto255-SHA512 with identities and context", () => {
    const config: pake.OpaqueConfig = {
      suite: "ristretto255-SHA512",
      ksf: fastKsf,
      context: "crypto-lib test v1",
    };
    const ids = { clientIdentity: "alice", serverIdentity: "example.com" };
    const flow = register("pw", config, ids);
    const { fin, serverKey } = login(flow, "pw", config, ids);
    expect(fin.sessionKey).to.have.length(64);
    expect(serverKey).to.deep.equal(fin.sessionKey);
    expect(fin.exportKey).to.deep.equal(flow.exportKey);
    expect(
      pake.serializeKE2(
        pake.generateKE2(
          {
            ...flow.setup,
            record: flow.record,
            credentialIdentifier: "alice",
            ke1: pake.generateKE1("pw", config).ke1,
            ...ids,
          },
          config,
        ).ke2,
      ),
    ).to.have.length(32 + 32 + (32 + 32 + 64) + 32 + 32 + 64);
  });

  it("accepts byte-string passwords, identities and context", () => {
    const config = { ksf: fastKsf, context: Uint8Array.of(1, 2, 3) };
    const ids = { clientIdentity: Uint8Array.of(0xaa) };
    const flow = register("pässwörd", config, ids);
    const { fin, serverKey } = login(flow, "pässwörd", config, ids);
    expect(serverKey).to.deep.equal(fin.sessionKey);
    const pw = new TextEncoder().encode("pässwörd");
    const client = pake.generateKE1(pw, config);
    const server = pake.generateKE2(
      {
        ...flow.setup,
        record: flow.record,
        credentialIdentifier: "alice",
        ke1: client.ke1,
        ...ids,
      },
      config,
    );
    expect(
      pake.generateKE3(client.state, server.ke2, ids).exportKey,
    ).to.deep.equal(flow.exportKey);
  });

  it("gives fresh session keys and messages on every login", () => {
    const config = { ksf: fastKsf };
    const flow = register("pw", config);
    const a = login(flow, "pw", config);
    const b = login(flow, "pw", config);
    expect(a.fin.sessionKey).to.not.deep.equal(b.fin.sessionKey);
    expect(a.fin.exportKey).to.deep.equal(b.fin.exportKey);
  });

  it("derives the same record keys only for the same credential identifier", () => {
    const config = { ksf: fastKsf };
    const setup = pake.createServerSetup(config);
    const { request } = pake.createRegistrationRequest("pw", config);
    const r1 = pake.createRegistrationResponse(
      request,
      setup.serverPublicKey,
      "alice",
      setup.oprfSeed,
      config,
    );
    const r2 = pake.createRegistrationResponse(
      request,
      setup.serverPublicKey,
      "alice",
      setup.oprfSeed,
      config,
    );
    const r3 = pake.createRegistrationResponse(
      request,
      setup.serverPublicKey,
      "bob",
      setup.oprfSeed,
      config,
    );
    expect(r1.evaluatedMessage).to.deep.equal(r2.evaluatedMessage);
    expect(r1.evaluatedMessage).to.not.deep.equal(r3.evaluatedMessage);
  });

  describe("configuration", () => {
    it("exposes the RFC 9807 scrypt parameters", () => {
      expect(pake.RFC9807_SCRYPT_PARAMS).to.deep.equal({
        N: 32768,
        r: 8,
        p: 1,
        dkLen: 32,
      });
      expect(pake.scryptKsf().name).to.equal(
        "scrypt(N=32768,r=8,p=1,dkLen=32)",
      );
    });

    it("rejects scrypt costs above the library caps", () => {
      expect(() => pake.scryptKsf({ N: 1 << 20 })).to.throw(/scrypt N/);
    });

    it("the identity KSF returns a copy of its input", () => {
      const m = Uint8Array.of(1, 2);
      const out = identityKsf.stretch(m);
      expect(out).to.deep.equal(m);
      expect(out).to.not.equal(m);
    });

    it("rejects an unknown suite", () => {
      const bad = { suite: "P384-SHA384" as pake.SuiteId };
      expect(() => pake.createServerSetup(bad)).to.throw(
        /Unsupported OPAQUE suite/,
      );
      expect(() =>
        pake.deserializeKE3(new Uint8Array(48), "P384-SHA384" as pake.SuiteId),
      ).to.throw(/Unsupported OPAQUE suite/);
      expect(() =>
        pake.createServerSetup({ suite: "toString" as pake.SuiteId }),
      ).to.throw(/Unsupported OPAQUE suite/);
    });

    it("rejects a context longer than 65535 bytes", () => {
      expect(() =>
        pake.generateKE1("pw", { context: new Uint8Array(65536) }),
      ).to.throw(/context/);
    });

    it("rejects empty and oversized identities", () => {
      const config = { ksf: fastKsf };
      const flow = register("pw", config);
      for (const clientIdentity of ["", new Uint8Array(65536)]) {
        expect(() => login(flow, "pw", config, { clientIdentity })).to.throw(
          /identities must be 1 to 65535 bytes/,
        );
      }
    });
  });

  describe("wire encoding", () => {
    it("uses P256-SHA256 lengths by default", () => {
      const flow = register("pw", { ksf: fastKsf });
      const bytes = pake.serializeRegistrationRecord(flow.record);
      expect(bytes).to.have.length(33 + 32 + 32 + 32);
      expect(pake.deserializeRegistrationRecord(bytes)).to.deep.equal(
        flow.record,
      );
      const { ke1 } = pake.generateKE1("pw", { ksf: fastKsf });
      expect(pake.serializeKE1(ke1)).to.have.length(33 + 32 + 33);
      expect(pake.deserializeKE1(pake.serializeKE1(ke1))).to.deep.equal(ke1);
      const req = pake.createRegistrationRequest("pw").request;
      expect(
        pake.deserializeRegistrationRequest(
          pake.serializeRegistrationRequest(req),
        ),
      ).to.deep.equal(req);
      const res = {
        evaluatedMessage: new Uint8Array(33),
        serverPublicKey: flow.setup.serverPublicKey,
      };
      expect(
        pake.deserializeRegistrationResponse(
          pake.serializeRegistrationResponse(res),
        ),
      ).to.deep.equal(res);
      expect(
        pake.deserializeKE2(new Uint8Array(259)).authResponse.serverMac,
      ).to.have.length(32);
      expect(pake.deserializeKE3(new Uint8Array(32)).clientMac).to.have.length(
        32,
      );
    });

    it("rejects messages of the wrong length or type", () => {
      const cases: [(b: Uint8Array) => unknown, number][] = [
        [(b) => pake.deserializeRegistrationRequest(b), 33],
        [(b) => pake.deserializeRegistrationResponse(b), 66],
        [(b) => pake.deserializeRegistrationRecord(b), 129],
        [(b) => pake.deserializeKE1(b), 98],
        [(b) => pake.deserializeKE2(b), 259],
        [(b) => pake.deserializeKE3(b), 32],
      ];
      for (const [parse, len] of cases) {
        expect(() => parse(new Uint8Array(len - 1))).to.throw(
          /expected \d+ bytes/,
        );
        expect(() => parse(new Uint8Array(len + 1))).to.throw(
          /expected \d+ bytes/,
        );
        expect(() => parse("00".repeat(len) as unknown as Uint8Array)).to.throw(
          /expected/,
        );
      }
    });

    it("rejects a message object whose fields do not add up", () => {
      const config = { ksf: fastKsf };
      const flow = register("pw", config);
      const { ke1 } = pake.generateKE1("pw", config);
      const short = {
        ...ke1,
        authRequest: { ...ke1.authRequest, clientNonce: new Uint8Array(31) },
      };
      expect(() =>
        pake.generateKE2(
          {
            ...flow.setup,
            record: flow.record,
            credentialIdentifier: "alice",
            ke1: short,
          },
          config,
        ),
      ).to.throw(/Invalid KE1/);
    });
  });
});
