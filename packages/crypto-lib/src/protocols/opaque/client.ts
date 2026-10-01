/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OPAQUE client functions (RFC 9807 § 5.2.1, § 5.2.3, § 6.2.1
 * and § 6.2.3). The `...With` variants take the random values the RFC
 * test vectors fix; they are internal and not exported from the package.
 */

import { randomBytes } from "@noble/hashes/utils.js";
import { authClientFinalize, authClientStart } from "./ake";
import { resolveConfig } from "./config";
import type { OpaqueConfig } from "./config";
import { blindPassword, finalizeOprf, recoverCredentials } from "./credentials";
import { store } from "./envelope";
import type { Identities } from "./envelope";
import {
  deserializeKE2,
  deserializeRegistrationResponse,
  serializeKE2,
  serializeRegistrationResponse,
} from "./messages";
import type {
  KE1,
  KE2,
  KE3,
  RegistrationRecord,
  RegistrationRequest,
  RegistrationResponse,
} from "./messages";
import { Nn, Nseed, toBytes } from "./suite";

/** Client state between `generateKE1` and `generateKE3`. Keep it secret and use it once. */
export interface ClientLoginState {
  /** Configuration used for KE1; `generateKE3` uses the same one. */
  config: OpaqueConfig;
  /** The password. */
  password: Uint8Array;
  /** OPRF blind scalar. */
  blind: Uint8Array;
  /** Client ephemeral private key. */
  clientSecret: Uint8Array;
  /** The KE1 sent to the server. */
  ke1: KE1;
}

/** Random values of `generateKE1`, fixed only by test vectors. @internal */
export interface KE1Randomness {
  blind?: Uint8Array;
  clientNonce?: Uint8Array;
  clientKeyshareSeed?: Uint8Array;
}

/** CreateRegistrationRequest with an optional fixed blind. @internal */
export function createRegistrationRequestWith(
  password: Uint8Array | string,
  config: OpaqueConfig,
  blind?: Uint8Array,
): { request: RegistrationRequest; blind: Uint8Array } {
  const { s } = resolveConfig(config);
  const r = blindPassword(s, toBytes(password), blind);
  return { request: { blindedMessage: r.blindedMessage }, blind: r.blind };
}

/**
 * CreateRegistrationRequest (RFC 9807 § 5.2.1): blind the password.
 *
 * @param password - The client's password.
 * @param config - Shared configuration.
 * @returns The request to send, and the blind to keep for
 *   {@link finalizeRegistrationRequest}.
 */
export function createRegistrationRequest(
  password: Uint8Array | string,
  config: OpaqueConfig = {},
): { request: RegistrationRequest; blind: Uint8Array } {
  return createRegistrationRequestWith(password, config);
}

/** FinalizeRegistrationRequest with an optional fixed envelope nonce. @internal */
export function finalizeRegistrationRequestWith(
  password: Uint8Array | string,
  blind: Uint8Array,
  response: RegistrationResponse,
  identities: Identities,
  config: OpaqueConfig,
  envelopeNonce: Uint8Array = randomBytes(Nn),
): { record: RegistrationRecord; exportKey: Uint8Array } {
  const { s, ksf } = resolveConfig(config);
  const res = deserializeRegistrationResponse(
    serializeRegistrationResponse(response),
    s.id,
  );
  const { randomizedPassword } = finalizeOprf(
    s,
    ksf,
    toBytes(password),
    blind,
    res.evaluatedMessage,
  );
  const stored = store(
    s,
    randomizedPassword,
    res.serverPublicKey,
    identities,
    envelopeNonce,
  );
  const { clientPublicKey, maskingKey, envelope } = stored;
  return {
    record: { clientPublicKey, maskingKey, envelope },
    exportKey: stored.exportKey,
  };
}

/**
 * FinalizeRegistrationRequest (RFC 9807 § 5.2.3): finish the OPRF, run
 * the KSF and build the record for the server.
 *
 * @param password - The password given to {@link createRegistrationRequest}.
 * @param blind - The blind it returned.
 * @param response - The server's RegistrationResponse.
 * @param identities - Optional client and server identities; the same
 *   values must be used at every login.
 * @param config - Shared configuration.
 * @returns The record to send to the server, and the client-only export key.
 * @throws CryptoError if the response or server public key is invalid.
 */
export function finalizeRegistrationRequest(
  password: Uint8Array | string,
  blind: Uint8Array,
  response: RegistrationResponse,
  identities: Identities = {},
  config: OpaqueConfig = {},
): { record: RegistrationRecord; exportKey: Uint8Array } {
  return finalizeRegistrationRequestWith(
    password,
    blind,
    response,
    identities,
    config,
  );
}

/** GenerateKE1 with optional fixed random values. @internal */
export function generateKE1With(
  password: Uint8Array | string,
  config: OpaqueConfig,
  r: KE1Randomness,
): { ke1: KE1; state: ClientLoginState } {
  const { s } = resolveConfig(config);
  const pw = toBytes(password);
  const blinded = blindPassword(s, pw, r.blind);
  const ake = authClientStart(
    s,
    { blindedMessage: blinded.blindedMessage },
    r.clientNonce ?? randomBytes(Nn),
    r.clientKeyshareSeed ?? randomBytes(Nseed),
  );
  const state: ClientLoginState = {
    config,
    password: pw,
    blind: blinded.blind,
    clientSecret: ake.clientSecret,
    ke1: ake.ke1,
  };
  return { ke1: ake.ke1, state };
}

/**
 * GenerateKE1 (RFC 9807 § 6.2.1): start a login.
 *
 * @param password - The client's password.
 * @param config - Shared configuration.
 * @returns KE1 to send, and the state to keep for {@link generateKE3}.
 */
export function generateKE1(
  password: Uint8Array | string,
  config: OpaqueConfig = {},
): { ke1: KE1; state: ClientLoginState } {
  return generateKE1With(password, config, {});
}

/**
 * GenerateKE3 (RFC 9807 § 6.2.3): recover the credentials, authenticate
 * the server and produce KE3.
 *
 * Use `exportKey` and `sessionKey` only after this returns; send `ke3` to
 * the server, which accepts the session only if `serverFinish` succeeds.
 *
 * @param state - State from {@link generateKE1}; do not reuse it.
 * @param ke2 - The server's KE2.
 * @param identities - The identities used at registration.
 * @throws CryptoError `OPAQUE_ENVELOPE_RECOVERY` for a wrong password, an
 *   unknown user (fake record) or a tampered credential response;
 *   `OPAQUE_SERVER_AUTHENTICATION` if the server MAC does not verify.
 */
export function generateKE3(
  state: ClientLoginState,
  ke2: KE2,
  identities: Identities = {},
): { ke3: KE3; sessionKey: Uint8Array; exportKey: Uint8Array } {
  const { s, ksf, context } = resolveConfig(state.config);
  const k = deserializeKE2(serializeKE2(ke2), s.id);
  const recovered = recoverCredentials(
    s,
    ksf,
    state.password,
    state.blind,
    k.credentialResponse,
    identities,
  );
  const { ke3, sessionKey } = authClientFinalize(
    s,
    context,
    recovered.cleartextCredentials,
    recovered.clientPrivateKey,
    state,
    k,
  );
  return { ke3, sessionKey, exportKey: recovered.exportKey };
}
