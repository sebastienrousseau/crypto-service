/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// RFC 9807 Appendix C known-answer tests for src/protocols/pake.ts
// (OPAQUE-3DH). The fixture is copied from the RFC text; see its
// "source" and "source_sha256". Every random value the vectors fix is
// injected through the internal ...With functions, and every intermediate
// and output value the vectors give is checked.

import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import * as pake from "../../src/protocols/pake";
import {
  createRegistrationRequestWith,
  finalizeRegistrationRequestWith,
  generateKE1With,
} from "../../src/protocols/opaque/client";
import { generateKE2With } from "../../src/protocols/opaque/server";
import {
  deriveOprfKey,
  finalizeOprf,
} from "../../src/protocols/opaque/credentials";
import { envelopeKeys } from "../../src/protocols/opaque/envelope";
import { identityKsf } from "../../src/protocols/opaque/ksf";
import { serializeEnvelope } from "../../src/protocols/opaque/messages";
import { getSuite } from "../../src/protocols/opaque/suite";
import type { SuiteId } from "../../src/protocols/opaque/suite";

type Values = Record<string, string>;
interface Vector {
  name: string;
  section: string;
  kind: "real" | "fake";
  config: Values;
  inputs: Values;
  intermediates: Values;
  outputs: Values;
}

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      String(process.env.CRYPTO_KEY_DIR),
      "..",
      "vectors",
      "opaque-rfc9807.json",
    ),
    "utf8",
  ),
) as { vectors: Vector[]; omitted: string[] };

const h = (s: string) => Uint8Array.from(Buffer.from(s, "hex"));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

function configOf(v: Vector): pake.OpaqueConfig {
  expect(v.config.KSF).to.equal("Identity");
  return {
    suite: v.config.OPRF as SuiteId,
    ksf: identityKsf,
    context: h(v.config.Context as string),
  };
}

function identitiesOf(i: Values): pake.Identities {
  const ids: pake.Identities = {};
  if (i.client_identity) ids.clientIdentity = h(i.client_identity);
  if (i.server_identity) ids.serverIdentity = h(i.server_identity);
  return ids;
}

function checkRegistration(v: Vector, config: pake.OpaqueConfig) {
  const i = v.inputs as Required<Values>;
  const s = getSuite(config.suite as SuiteId);
  const reg = createRegistrationRequestWith(
    h(i.password),
    config,
    h(i.blind_registration),
  );
  expect(hex(pake.serializeRegistrationRequest(reg.request))).to.equal(
    v.outputs.registration_request,
  );
  expect(
    hex(deriveOprfKey(s, h(i.oprf_seed), h(i.credential_identifier))),
  ).to.equal(v.intermediates.oprf_key);
  const response = pake.createRegistrationResponse(
    reg.request,
    h(i.server_public_key),
    h(i.credential_identifier),
    h(i.oprf_seed),
    config,
  );
  expect(hex(pake.serializeRegistrationResponse(response))).to.equal(
    v.outputs.registration_response,
  );
  const { randomizedPassword } = finalizeOprf(
    s,
    identityKsf,
    h(i.password),
    reg.blind,
    response.evaluatedMessage,
  );
  expect(hex(randomizedPassword)).to.equal(v.intermediates.randomized_password);
  const keys = envelopeKeys(s, randomizedPassword, h(i.envelope_nonce));
  expect(hex(keys.authKey)).to.equal(v.intermediates.auth_key);
  const fin = finalizeRegistrationRequestWith(
    h(i.password),
    reg.blind,
    response,
    identitiesOf(i),
    config,
    h(i.envelope_nonce),
  );
  expect(hex(fin.record.clientPublicKey)).to.equal(
    v.intermediates.client_public_key,
  );
  expect(hex(serializeEnvelope(fin.record.envelope))).to.equal(
    v.intermediates.envelope,
  );
  expect(hex(pake.serializeRegistrationRecord(fin.record))).to.equal(
    v.outputs.registration_upload,
  );
  expect(hex(fin.exportKey)).to.equal(v.outputs.export_key);
  return fin.record;
}

function checkLogin(
  v: Vector,
  config: pake.OpaqueConfig,
  record: pake.RegistrationRecord,
) {
  const i = v.inputs as Required<Values>;
  const ids = identitiesOf(i);
  const client = generateKE1With(h(i.password), config, {
    blind: h(i.blind_login),
    clientNonce: h(i.client_nonce),
    clientKeyshareSeed: h(i.client_keyshare_seed),
  });
  expect(hex(pake.serializeKE1(client.ke1))).to.equal(v.outputs.KE1);
  const server = generateKE2With(
    {
      serverPrivateKey: h(i.server_private_key),
      serverPublicKey: h(i.server_public_key),
      oprfSeed: h(i.oprf_seed),
      record,
      credentialIdentifier: h(i.credential_identifier),
      ke1: client.ke1,
      ...ids,
    },
    config,
    {
      maskingNonce: h(i.masking_nonce),
      serverNonce: h(i.server_nonce),
      serverKeyshareSeed: h(i.server_keyshare_seed),
    },
  );
  expect(hex(pake.serializeKE2(server.ke2))).to.equal(v.outputs.KE2);
  expect(hex(server.keys.handshakeSecret)).to.equal(
    v.intermediates.handshake_secret,
  );
  expect(hex(server.keys.km2)).to.equal(v.intermediates.server_mac_key);
  expect(hex(server.keys.km3)).to.equal(v.intermediates.client_mac_key);

  const fin = pake.generateKE3(client.state, server.ke2, ids);
  expect(hex(pake.serializeKE3(fin.ke3))).to.equal(v.outputs.KE3);
  expect(hex(fin.sessionKey)).to.equal(v.outputs.session_key);
  expect(hex(fin.exportKey)).to.equal(v.outputs.export_key);
  const serverKey = pake.serverFinish(server.state, fin.ke3);
  expect(hex(serverKey)).to.equal(v.outputs.session_key);
}

function checkFake(v: Vector, config: pake.OpaqueConfig) {
  const i = v.inputs as Required<Values>;
  const s = getSuite(config.suite as SuiteId);
  const record: pake.RegistrationRecord = {
    clientPublicKey: h(i.client_public_key),
    maskingKey: h(i.masking_key),
    envelope: { nonce: new Uint8Array(32), authTag: new Uint8Array(s.Nh) },
  };
  const ke1 = pake.deserializeKE1(h(i.KE1), s.id);
  const server = generateKE2With(
    {
      serverPrivateKey: h(i.server_private_key),
      serverPublicKey: h(i.server_public_key),
      oprfSeed: h(i.oprf_seed),
      record,
      credentialIdentifier: h(i.credential_identifier),
      ke1,
      ...identitiesOf(i),
    },
    config,
    {
      maskingNonce: h(i.masking_nonce),
      serverNonce: h(i.server_nonce),
      serverKeyshareSeed: h(i.server_keyshare_seed),
    },
  );
  expect(hex(pake.serializeKE2(server.ke2))).to.equal(v.outputs.KE2);
}

describe("OPAQUE-3DH RFC 9807 Appendix C test vectors", () => {
  it("covers both supported suites, real and fake", () => {
    const sections = fixture.vectors.map((v) => v.section);
    expect(sections).to.deep.equal([
      "C.1.1",
      "C.1.2",
      "C.1.5",
      "C.1.6",
      "C.2.1",
      "C.2.3",
    ]);
    expect(fixture.omitted).to.deep.equal(["C.1.3", "C.1.4", "C.2.2"]);
  });

  for (const v of fixture.vectors) {
    const label = `${v.section} ${v.name} (${v.config.OPRF})`;
    if (v.kind === "real") {
      it(`${label}: registration and login`, () => {
        const config = configOf(v);
        checkLogin(v, config, checkRegistration(v, config));
      });
      it(`${label}: messages round-trip through the wire encoding`, () => {
        const suite = v.config.OPRF as SuiteId;
        const o = v.outputs as Required<Values>;
        const pairs: [string, (b: Uint8Array) => Uint8Array][] = [
          [
            o.registration_request,
            (b) =>
              pake.serializeRegistrationRequest(
                pake.deserializeRegistrationRequest(b, suite),
              ),
          ],
          [
            o.registration_response,
            (b) =>
              pake.serializeRegistrationResponse(
                pake.deserializeRegistrationResponse(b, suite),
              ),
          ],
          [
            o.registration_upload,
            (b) =>
              pake.serializeRegistrationRecord(
                pake.deserializeRegistrationRecord(b, suite),
              ),
          ],
          [o.KE1, (b) => pake.serializeKE1(pake.deserializeKE1(b, suite))],
          [o.KE2, (b) => pake.serializeKE2(pake.deserializeKE2(b, suite))],
          [o.KE3, (b) => pake.serializeKE3(pake.deserializeKE3(b, suite))],
        ];
        for (const [value, roundTrip] of pairs) {
          expect(hex(roundTrip(h(value)))).to.equal(value);
        }
      });
    } else {
      it(`${label}: KE2 for an unknown client`, () => {
        checkFake(v, configOf(v));
      });
    }
  }
});
