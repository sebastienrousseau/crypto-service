/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PAKE: OPAQUE-3DH as specified in RFC 9807 (July 2025), an
 * asymmetric password-authenticated key exchange. The server never sees
 * the password, not even at registration, and a stolen server record
 * still costs an attacker one OPRF-protected, key-stretched guess per
 * password (and the attacker also needs the server's `oprfSeed`).
 *
 * Function and message names follow the RFC. Every message is a plain
 * object of byte fields with `serialize*` / `deserialize*` functions for
 * the RFC wire encoding; deserializers check lengths for the suite.
 *
 * Configuration ({@link OpaqueConfig}, shared by client and server):
 * - Suite: `"P256-SHA256"` (default: RFC 9497 P256-SHA256 OPRF,
 *   HKDF-SHA256, HMAC-SHA256, SHA-256, P-256 3DH) or
 *   `"ristretto255-SHA512"`. Both reproduce the RFC 9807 Appendix C test
 *   vectors for their group.
 * - KSF: pluggable ({@link Ksf}). The default is scrypt with the RFC 9807
 *   § 7 parameters (N = 32768, r = 8, p = 1, 16-byte zero salt, 32-byte
 *   output; about 32 MiB per login on the client). The RFC's Argon2id
 *   profile needs 2 GiB, above this library's Argon2 memory cap.
 * - Context: optional application string bound into the transcript.
 *
 * Client identity and server identity are optional on every call that
 * takes {@link Identities}; when omitted they default to the public keys.
 * Use the same identities at registration and at every login.
 *
 * Client enumeration: for an unknown credential identifier, answer KE1
 * with {@link generateKE2} over a stored {@link createFakeRecord} record.
 * The KE2 has the same length and distribution; the client fails with
 * `OPAQUE_ENVELOPE_RECOVERY` exactly as for a wrong password.
 *
 * Registration needs a confidential, server-authenticated channel (e.g.
 * TLS), because the record carries the masking key (RFC 9807 § 10.10).
 * Errors are `CryptoError`s with the codes in {@link OpaqueErrorCode}.
 *
 * Not implemented: the curve25519 (X25519) 3DH group, and incorporating
 * identities into the OPRF input (RFC 9807 § 9.1 SHOULD); bind them
 * through the identities instead.
 *
 * This replaces the earlier OPAQUE-style API (`serverRegister`,
 * `clientStartLogin`, `serverRespondLogin`, `clientFinishLogin`,
 * `serverVerifyClient`). Its records cannot be converted; users must
 * register again.
 *
 * @example
 * ```ts
 * import { protocols } from "@sebastienrousseau/crypto-lib";
 * const { pake } = protocols;
 * const config = { context: "myapp-v1" };
 *
 * // Server, once: long-term secrets and a fake record.
 * const setup = pake.createServerSetup(config);
 * const fake = pake.createFakeRecord(config);
 *
 * // Registration (over TLS).
 * const { request, blind } = pake.createRegistrationRequest("hunter2", config);
 * const response = pake.createRegistrationResponse(
 *   request, setup.serverPublicKey, "alice@example.com", setup.oprfSeed, config);
 * const { record } = pake.finalizeRegistrationRequest(
 *   "hunter2", blind, response, {}, config);
 * const records = new Map([["alice@example.com", record]]);
 *
 * // Login. Unknown identifiers get the fake record, not an error.
 * const client = pake.generateKE1("hunter2", config);
 * const id = "alice@example.com";
 * const server = pake.generateKE2(
 *   { ...setup, record: records.get(id) ?? fake, credentialIdentifier: id,
 *     ke1: client.ke1 },
 *   config);
 * const { ke3, sessionKey, exportKey } = pake.generateKE3(client.state, server.ke2);
 * const serverKey = pake.serverFinish(server.state, ke3); // equals sessionKey
 * ```
 */

export { OpaqueErrorCode } from "./opaque/suite";
export type { SuiteId } from "./opaque/suite";
export { RFC9807_SCRYPT_PARAMS, scryptKsf } from "./opaque/ksf";
export type { Ksf, ScryptKsfParams } from "./opaque/ksf";
export type { OpaqueConfig } from "./opaque/config";
export type { Identities } from "./opaque/envelope";
export type { ServerLoginState } from "./opaque/ake";
export {
  deserializeKE1,
  deserializeKE2,
  deserializeKE3,
  deserializeRegistrationRecord,
  deserializeRegistrationRequest,
  deserializeRegistrationResponse,
  serializeKE1,
  serializeKE2,
  serializeKE3,
  serializeRegistrationRecord,
  serializeRegistrationRequest,
  serializeRegistrationResponse,
} from "./opaque/messages";
export type {
  AuthRequest,
  AuthResponse,
  CredentialRequest,
  CredentialResponse,
  Envelope,
  KE1,
  KE2,
  KE3,
  RegistrationRecord,
  RegistrationRequest,
  RegistrationResponse,
} from "./opaque/messages";
export {
  createRegistrationRequest,
  finalizeRegistrationRequest,
  generateKE1,
  generateKE3,
} from "./opaque/client";
export type { ClientLoginState } from "./opaque/client";
export {
  createFakeRecord,
  createRegistrationResponse,
  createServerSetup,
  generateKE2,
  serverFinish,
} from "./opaque/server";
export type { GenerateKE2Input, ServerSetup } from "./opaque/server";
