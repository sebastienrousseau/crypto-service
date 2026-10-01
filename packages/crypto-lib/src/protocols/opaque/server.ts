/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OPAQUE server functions (RFC 9807 § 3.1, § 5.2.2, § 6.2.2,
 * § 6.2.4 and § 6.3.2.2). The `...With` variant takes the random values
 * the RFC test vectors fix; it is internal and not exported from the
 * package.
 */

import { randomBytes } from "@noble/hashes/utils.js";
import { authServerFinalize, authServerRespond } from "./ake";
import type { DerivedKeys, ServerLoginState } from "./ake";
import { resolveConfig } from "./config";
import type { OpaqueConfig } from "./config";
import { createCredentialResponse, evaluateOprf } from "./credentials";
import { createCleartextCredentials } from "./envelope";
import type { Identities } from "./envelope";
import {
  deserializeKE1,
  deserializeRegistrationRecord,
  deserializeRegistrationRequest,
  serializeKE1,
  serializeRegistrationRecord,
  serializeRegistrationRequest,
} from "./messages";
import type {
  KE1,
  KE2,
  KE3,
  RegistrationRecord,
  RegistrationRequest,
  RegistrationResponse,
} from "./messages";
import { Nn, Nseed, deriveDiffieHellmanKeyPair } from "./suite";

/** The server's long-term secrets (RFC 9807 § 3.1). Persist them; keep them secret. */
export interface ServerSetup {
  /** AKE private key. */
  serverPrivateKey: Uint8Array;
  /** AKE public key (sent to clients at registration). */
  serverPublicKey: Uint8Array;
  /** Nh-byte seed from which every credential's OPRF key is derived. */
  oprfSeed: Uint8Array;
}

/** Inputs to {@link generateKE2}. Spread a {@link ServerSetup} into it. */
export interface GenerateKE2Input extends ServerSetup, Identities {
  /** The client's record, or the fake record for an unknown client. */
  record: RegistrationRecord;
  /** Identifier the record was registered under. */
  credentialIdentifier: Uint8Array | string;
  /** The client's KE1. */
  ke1: KE1;
}

/** Random values of `generateKE2`, fixed only by test vectors. @internal */
export interface KE2Randomness {
  maskingNonce?: Uint8Array;
  serverNonce?: Uint8Array;
  serverKeyshareSeed?: Uint8Array;
}

/**
 * Server setup (RFC 9807 § 3.1): a fresh AKE key pair and oprf_seed.
 * Use one setup for all clients so that fake records for unknown clients
 * cannot be told apart (RFC 9807 § 10.9).
 *
 * @param config - Shared configuration (only the suite is used).
 */
export function createServerSetup(config: OpaqueConfig = {}): ServerSetup {
  const { s } = resolveConfig(config);
  const kp = deriveDiffieHellmanKeyPair(s, randomBytes(Nseed));
  return {
    serverPrivateKey: kp.privateKey,
    serverPublicKey: kp.publicKey,
    oprfSeed: randomBytes(s.Nh),
  };
}

/**
 * A fake record for client-enumeration protection (RFC 9807 § 6.3.2.2):
 * a random client public key, a random masking key and an all-zero
 * envelope. Create it once, store it with the real records, and pass it
 * to {@link generateKE2} whenever the credential identifier is unknown;
 * the resulting KE2 has the same length and distribution as a real one,
 * and the client then fails with `OPAQUE_ENVELOPE_RECOVERY`.
 *
 * @param config - Shared configuration (only the suite is used).
 */
export function createFakeRecord(
  config: OpaqueConfig = {},
): RegistrationRecord {
  const { s } = resolveConfig(config);
  return {
    clientPublicKey: deriveDiffieHellmanKeyPair(s, randomBytes(Nseed))
      .publicKey,
    maskingKey: randomBytes(s.Nh),
    envelope: { nonce: new Uint8Array(Nn), authTag: new Uint8Array(s.Nh) },
  };
}

/**
 * CreateRegistrationResponse (RFC 9807 § 5.2.2): evaluate the OPRF on the
 * blinded password with the credential's OPRF key.
 *
 * @param request - The client's RegistrationRequest.
 * @param serverPublicKey - The server's AKE public key.
 * @param credentialIdentifier - Unique identifier for this credential.
 * @param oprfSeed - The server's oprf_seed.
 * @param config - Shared configuration.
 * @throws CryptoError or Error if the blinded element is invalid.
 */
export function createRegistrationResponse(
  request: RegistrationRequest,
  serverPublicKey: Uint8Array,
  credentialIdentifier: Uint8Array | string,
  oprfSeed: Uint8Array,
  config: OpaqueConfig = {},
): RegistrationResponse {
  const { s } = resolveConfig(config);
  const req = deserializeRegistrationRequest(
    serializeRegistrationRequest(request),
    s.id,
  );
  return {
    evaluatedMessage: evaluateOprf(
      s,
      oprfSeed,
      credentialIdentifier,
      req.blindedMessage,
    ),
    serverPublicKey: serverPublicKey.slice(),
  };
}

/** GenerateKE2 with optional fixed random values; also returns the derived keys. @internal */
export function generateKE2With(
  input: GenerateKE2Input,
  config: OpaqueConfig,
  r: KE2Randomness,
): { ke2: KE2; state: ServerLoginState; keys: DerivedKeys } {
  const { s, context } = resolveConfig(config);
  const ke1 = deserializeKE1(serializeKE1(input.ke1), s.id);
  const record = deserializeRegistrationRecord(
    serializeRegistrationRecord(input.record),
    s.id,
  );
  const credentialResponse = createCredentialResponse(s, {
    request: ke1.credentialRequest,
    serverPublicKey: input.serverPublicKey,
    record,
    credentialIdentifier: input.credentialIdentifier,
    oprfSeed: input.oprfSeed,
    maskingNonce: r.maskingNonce ?? randomBytes(Nn),
  });
  const auth = authServerRespond(s, {
    context,
    cleartextCredentials: createCleartextCredentials(
      input.serverPublicKey,
      record.clientPublicKey,
      input,
    ),
    serverPrivateKey: input.serverPrivateKey,
    clientPublicKey: record.clientPublicKey,
    ke1,
    credentialResponse,
    serverNonce: r.serverNonce ?? randomBytes(Nn),
    serverKeyshareSeed: r.serverKeyshareSeed ?? randomBytes(Nseed),
  });
  const ke2: KE2 = { credentialResponse, authResponse: auth.authResponse };
  return { ke2, state: auth.state, keys: auth.keys };
}

/**
 * GenerateKE2 (RFC 9807 § 6.2.2): answer a login with the client's record
 * (or the fake record for an unknown credential identifier).
 *
 * @param input - Server setup, record, credential identifier, KE1 and
 *   optional identities (the same as at registration).
 * @param config - Shared configuration.
 * @returns KE2 to send, and the state to keep for {@link serverFinish}.
 * @throws CryptoError or Error if KE1 or the record is malformed.
 */
export function generateKE2(
  input: GenerateKE2Input,
  config: OpaqueConfig = {},
): { ke2: KE2; state: ServerLoginState } {
  const { ke2, state } = generateKE2With(input, config, {});
  return { ke2, state };
}

/**
 * ServerFinish (RFC 9807 § 6.2.4): verify KE3 in constant time and release
 * the session key. Treat a client that never sends KE3 as a failed login.
 *
 * @param state - State from {@link generateKE2}.
 * @param ke3 - The client's KE3.
 * @returns The session key, equal to the client's.
 * @throws CryptoError `OPAQUE_CLIENT_AUTHENTICATION` if the client MAC
 *   does not verify or has the wrong length (wrong password, tampering,
 *   or an unknown user).
 */
export function serverFinish(state: ServerLoginState, ke3: KE3): Uint8Array {
  return authServerFinalize(state, ke3);
}
