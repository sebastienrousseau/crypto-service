/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Client credential storage and key recovery (RFC 9807 § 4):
 * CleartextCredentials, the Envelope Store and Recover functions, and the
 * randomized password derived from the stretched OPRF output.
 * @internal
 */

import { CryptoError } from "../../errors";
import { timingSafeEqual } from "../../utils";
import type { Ksf } from "./ksf";
import type { Envelope } from "./messages";
import {
  Nseed,
  OpaqueErrorCode,
  concat,
  deriveDiffieHellmanKeyPair,
  i2osp,
  kdfExpand,
  kdfExtract,
  mac,
  toBytes,
  utf8,
} from "./suite";
import type { Suite } from "./suite";

/** Optional application identities; each defaults to the party's public key. */
export interface Identities {
  /** Client identity (e.g. an account name). Default: the client's public key. */
  clientIdentity?: Uint8Array | string;
  /** Server identity (e.g. a domain name). Default: the server's public key. */
  serverIdentity?: Uint8Array | string;
}

/** CleartextCredentials (RFC 9807 § 4). @internal */
export interface CleartextCredentials {
  serverPublicKey: Uint8Array;
  serverIdentity: Uint8Array;
  clientIdentity: Uint8Array;
}

/** An identity as bytes, or `fallback` when none is given; must fit <1..2^16-1>. */
function identityOr(
  value: Uint8Array | string | undefined,
  fallback: Uint8Array,
): Uint8Array {
  if (value === undefined) return fallback;
  const bytes = toBytes(value);
  if (bytes.length < 1 || bytes.length > 0xffff) {
    throw new CryptoError(
      "OPAQUE identities must be 1 to 65535 bytes",
      OpaqueErrorCode.INVALID_INPUT,
    );
  }
  return bytes;
}

/** CreateCleartextCredentials (RFC 9807 § 4). @internal */
export function createCleartextCredentials(
  serverPublicKey: Uint8Array,
  clientPublicKey: Uint8Array,
  ids: Identities,
): CleartextCredentials {
  return {
    serverPublicKey,
    serverIdentity: identityOr(ids.serverIdentity, serverPublicKey),
    clientIdentity: identityOr(ids.clientIdentity, clientPublicKey),
  };
}

/** Encode CleartextCredentials with 2-byte length prefixes on the identities. @internal */
export function serializeCleartextCredentials(cc: CleartextCredentials) {
  return concat(
    cc.serverPublicKey,
    i2osp(cc.serverIdentity.length, 2),
    cc.serverIdentity,
    i2osp(cc.clientIdentity.length, 2),
    cc.clientIdentity,
  );
}

/**
 * randomized_password = Extract("", concat(oprf_output,
 * Stretch(oprf_output))) (RFC 9807 § 5.2.3 and § 6.3.2.3).
 * @internal
 */
export function randomizePassword(
  s: Suite,
  ksf: Ksf,
  oprfOutput: Uint8Array,
): Uint8Array {
  const stretched = ksf.stretch(oprfOutput);
  return kdfExtract(s, new Uint8Array(0), concat(oprfOutput, stretched));
}

/** masking_key = Expand(randomized_password, "MaskingKey", Nh). @internal */
export function maskingKeyFor(s: Suite, randomizedPassword: Uint8Array) {
  return kdfExpand(s, randomizedPassword, utf8("MaskingKey"), s.Nh);
}

/** The per-envelope keys of Store and Recover. @internal */
export function envelopeKeys(
  s: Suite,
  randomizedPassword: Uint8Array,
  nonce: Uint8Array,
) {
  const derive = (label: string, length: number) =>
    kdfExpand(s, randomizedPassword, concat(nonce, utf8(label)), length);
  return {
    authKey: derive("AuthKey", s.Nh),
    exportKey: derive("ExportKey", s.Nh),
    keyPair: deriveDiffieHellmanKeyPair(s, derive("PrivateKey", Nseed)),
  };
}

/** auth_tag = MAC(auth_key, concat(envelope_nonce, cleartext_credentials)). */
function authTag(
  s: Suite,
  authKey: Uint8Array,
  nonce: Uint8Array,
  cc: CleartextCredentials,
) {
  return mac(s, authKey, concat(nonce, serializeCleartextCredentials(cc)));
}

/** Store (RFC 9807 § 4.1.2) with a caller-supplied envelope nonce. @internal */
export function store(
  s: Suite,
  randomizedPassword: Uint8Array,
  serverPublicKey: Uint8Array,
  ids: Identities,
  nonce: Uint8Array,
) {
  const { authKey, exportKey, keyPair } = envelopeKeys(
    s,
    randomizedPassword,
    nonce,
  );
  const cc = createCleartextCredentials(
    serverPublicKey,
    keyPair.publicKey,
    ids,
  );
  const envelope: Envelope = {
    nonce: nonce.slice(),
    authTag: authTag(s, authKey, nonce, cc),
  };
  return {
    envelope,
    clientPublicKey: keyPair.publicKey,
    maskingKey: maskingKeyFor(s, randomizedPassword),
    exportKey,
  };
}

/**
 * Recover (RFC 9807 § 4.1.3). The tag is compared in constant time; on
 * failure nothing derived here is returned.
 * @internal
 */
export function recover(
  s: Suite,
  randomizedPassword: Uint8Array,
  serverPublicKey: Uint8Array,
  envelope: Envelope,
  ids: Identities,
) {
  const { authKey, exportKey, keyPair } = envelopeKeys(
    s,
    randomizedPassword,
    envelope.nonce,
  );
  const cc = createCleartextCredentials(
    serverPublicKey,
    keyPair.publicKey,
    ids,
  );
  const expected = authTag(s, authKey, envelope.nonce, cc);
  if (!timingSafeEqual(envelope.authTag, expected)) {
    throw new CryptoError(
      "OPAQUE envelope recovery failed: wrong password or invalid response",
      OpaqueErrorCode.ENVELOPE_RECOVERY,
    );
  }
  return {
    clientPrivateKey: keyPair.privateKey,
    cleartextCredentials: cc,
    exportKey,
  };
}
