/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OPAQUE-3DH message structures (RFC 9807 § 4.1.1, § 5.1, § 6.1
 * and § 6.3.1) and their wire encodings. Every structure is a fixed-length
 * concatenation of its fields, so serialization is concatenation and
 * deserialization checks the total length and splits.
 */

import { CryptoError } from "../../errors";
import { Nn, OpaqueErrorCode, concat, decodeElement, getSuite } from "./suite";
import type { Suite, SuiteId } from "./suite";

/** RegistrationRequest { blinded_message[Noe] }. */
export interface RegistrationRequest {
  /** Serialized blinded OPRF element. */
  blindedMessage: Uint8Array;
}

/** RegistrationResponse { evaluated_message[Noe], server_public_key[Npk] }. */
export interface RegistrationResponse {
  /** Serialized evaluated OPRF element. */
  evaluatedMessage: Uint8Array;
  /** Server's AKE public key. */
  serverPublicKey: Uint8Array;
}

/** Envelope { envelope_nonce[Nn], auth_tag[Nm] }. */
export interface Envelope {
  /** Random envelope nonce. */
  nonce: Uint8Array;
  /** MAC over the nonce and the cleartext credentials. */
  authTag: Uint8Array;
}

/**
 * RegistrationRecord { client_public_key[Npk], masking_key[Nh], envelope }.
 * The server stores it with the credential identifier. It holds no
 * password-equivalent secret on its own, but the masking key keeps the
 * envelope hidden from other clients, so store it confidentially.
 */
export interface RegistrationRecord {
  /** Client's AKE public key. */
  clientPublicKey: Uint8Array;
  /** Key the server uses to mask the credential response. */
  maskingKey: Uint8Array;
  /** Client's envelope. */
  envelope: Envelope;
}

/** CredentialRequest { blinded_message[Noe] }. */
export interface CredentialRequest {
  /** Serialized blinded OPRF element. */
  blindedMessage: Uint8Array;
}

/** CredentialResponse { evaluated_message[Noe], masking_nonce[Nn], masked_response[Npk + Nn + Nm] }. */
export interface CredentialResponse {
  /** Serialized evaluated OPRF element. */
  evaluatedMessage: Uint8Array;
  /** Nonce for the masking pad. */
  maskingNonce: Uint8Array;
  /** xor(pad, server_public_key || envelope). */
  maskedResponse: Uint8Array;
}

/** AuthRequest { client_nonce[Nn], client_public_keyshare[Npk] }. */
export interface AuthRequest {
  /** Fresh client nonce. */
  clientNonce: Uint8Array;
  /** Client's ephemeral public key. */
  clientPublicKeyshare: Uint8Array;
}

/** KE1 { CredentialRequest, AuthRequest }: client → server. */
export interface KE1 {
  /** OPRF part. */
  credentialRequest: CredentialRequest;
  /** AKE part. */
  authRequest: AuthRequest;
}

/** AuthResponse { server_nonce[Nn], server_public_keyshare[Npk], server_mac[Nm] }. */
export interface AuthResponse {
  /** Fresh server nonce. */
  serverNonce: Uint8Array;
  /** Server's ephemeral public key. */
  serverPublicKeyshare: Uint8Array;
  /** MAC over the transcript under Km2. */
  serverMac: Uint8Array;
}

/** KE2 { CredentialResponse, AuthResponse }: server → client. */
export interface KE2 {
  /** OPRF and masked-envelope part. */
  credentialResponse: CredentialResponse;
  /** AKE part. */
  authResponse: AuthResponse;
}

/** KE3 { client_mac[Nm] }: client → server. */
export interface KE3 {
  /** MAC over the transcript under Km3. */
  clientMac: Uint8Array;
}

/** Split `bytes` into fields of the given lengths, rejecting any other total length. */
function split(bytes: Uint8Array, lengths: number[], label: string) {
  const total = lengths.reduce((a, b) => a + b, 0);
  if (!(bytes instanceof Uint8Array) || bytes.length !== total) {
    throw new CryptoError(
      `Invalid ${label}: expected ${total} bytes`,
      OpaqueErrorCode.DESERIALIZE,
    );
  }
  let offset = 0;
  return lengths.map((len) => bytes.slice(offset, (offset += len)));
}

/** Masked response length Npk + Nn + Nm. @internal */
export function maskedResponseLength(s: Suite): number {
  return s.Npk + Nn + s.Nh;
}

/** Serialize an Envelope. @internal */
export function serializeEnvelope(e: Envelope): Uint8Array {
  return concat(e.nonce, e.authTag);
}

/** Serialize a CredentialResponse (it is hashed into the preamble). @internal */
export function serializeCredentialResponse(r: CredentialResponse) {
  return concat(r.evaluatedMessage, r.maskingNonce, r.maskedResponse);
}

/** Serialize a RegistrationRequest. */
export function serializeRegistrationRequest(m: RegistrationRequest) {
  return m.blindedMessage.slice();
}

/** Deserialize a RegistrationRequest, checking its length for `suite`. */
export function deserializeRegistrationRequest(
  bytes: Uint8Array,
  suite: SuiteId = "P256-SHA256",
): RegistrationRequest {
  const [blindedMessage] = split(
    bytes,
    [getSuite(suite).Noe],
    "RegistrationRequest",
  ) as [Uint8Array];
  return { blindedMessage };
}

/** Serialize a RegistrationResponse. */
export function serializeRegistrationResponse(m: RegistrationResponse) {
  return concat(m.evaluatedMessage, m.serverPublicKey);
}

/**
 * Deserialize a RegistrationResponse, checking its length for `suite` and
 * validating the server public key (RFC 9807 § 10.7).
 */
export function deserializeRegistrationResponse(
  bytes: Uint8Array,
  suite: SuiteId = "P256-SHA256",
): RegistrationResponse {
  const s = getSuite(suite);
  const [evaluatedMessage, serverPublicKey] = split(
    bytes,
    [s.Noe, s.Npk],
    "RegistrationResponse",
  ) as [Uint8Array, Uint8Array];
  decodeElement(s, serverPublicKey, "server public key");
  return { evaluatedMessage, serverPublicKey };
}

/** Serialize a RegistrationRecord (the RFC's registration_upload). */
export function serializeRegistrationRecord(m: RegistrationRecord) {
  return concat(m.clientPublicKey, m.maskingKey, serializeEnvelope(m.envelope));
}

/**
 * Deserialize a RegistrationRecord, checking its length for `suite` and
 * validating the client public key (RFC 9807 § 10.7).
 */
export function deserializeRegistrationRecord(
  bytes: Uint8Array,
  suite: SuiteId = "P256-SHA256",
): RegistrationRecord {
  const s = getSuite(suite);
  const [clientPublicKey, maskingKey, nonce, authTag] = split(
    bytes,
    [s.Npk, s.Nh, Nn, s.Nh],
    "RegistrationRecord",
  ) as [Uint8Array, Uint8Array, Uint8Array, Uint8Array];
  decodeElement(s, clientPublicKey, "client public key");
  return { clientPublicKey, maskingKey, envelope: { nonce, authTag } };
}

/** Serialize a KE1. */
export function serializeKE1(m: KE1): Uint8Array {
  return concat(
    m.credentialRequest.blindedMessage,
    m.authRequest.clientNonce,
    m.authRequest.clientPublicKeyshare,
  );
}

/** Deserialize a KE1, checking its length for `suite`. */
export function deserializeKE1(
  bytes: Uint8Array,
  suite: SuiteId = "P256-SHA256",
): KE1 {
  const s = getSuite(suite);
  const [blindedMessage, clientNonce, clientPublicKeyshare] = split(
    bytes,
    [s.Noe, Nn, s.Npk],
    "KE1",
  ) as [Uint8Array, Uint8Array, Uint8Array];
  return {
    credentialRequest: { blindedMessage },
    authRequest: { clientNonce, clientPublicKeyshare },
  };
}

/** Serialize a KE2. */
export function serializeKE2(m: KE2): Uint8Array {
  const a = m.authResponse;
  return concat(
    serializeCredentialResponse(m.credentialResponse),
    a.serverNonce,
    a.serverPublicKeyshare,
    a.serverMac,
  );
}

/** Deserialize a KE2, checking its length for `suite`. */
export function deserializeKE2(
  bytes: Uint8Array,
  suite: SuiteId = "P256-SHA256",
): KE2 {
  const s = getSuite(suite);
  const lengths = [s.Noe, Nn, maskedResponseLength(s), Nn, s.Npk, s.Nh];
  const [evaluatedMessage, maskingNonce, maskedResponse, ...auth] = split(
    bytes,
    lengths,
    "KE2",
  ) as [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array];
  const [serverNonce, serverPublicKeyshare, serverMac] = auth as [
    Uint8Array,
    Uint8Array,
    Uint8Array,
  ];
  return {
    credentialResponse: { evaluatedMessage, maskingNonce, maskedResponse },
    authResponse: { serverNonce, serverPublicKeyshare, serverMac },
  };
}

/** Serialize a KE3. */
export function serializeKE3(m: KE3): Uint8Array {
  return m.clientMac.slice();
}

/** Deserialize a KE3, checking its length for `suite`. */
export function deserializeKE3(
  bytes: Uint8Array,
  suite: SuiteId = "P256-SHA256",
): KE3 {
  const [clientMac] = split(bytes, [getSuite(suite).Nh], "KE3") as [Uint8Array];
  return { clientMac };
}
