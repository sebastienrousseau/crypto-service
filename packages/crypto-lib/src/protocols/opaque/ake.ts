/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks The OPAQUE-3DH authenticated key exchange (RFC 9807 § 6.4):
 * the preamble, the TLS 1.3-style key schedule, and the client and server
 * Auth* functions. MACs are compared in constant time.
 * @internal
 */

import { CryptoError } from "../../errors";
import { timingSafeEqual } from "../../utils";
import type { CleartextCredentials } from "./envelope";
import { serializeCredentialResponse, serializeKE1 } from "./messages";
import type {
  AuthResponse,
  CredentialRequest,
  CredentialResponse,
  KE1,
  KE2,
  KE3,
} from "./messages";
import {
  OpaqueErrorCode,
  concat,
  deriveDiffieHellmanKeyPair,
  diffieHellman,
  i2osp,
  kdfExpand,
  kdfExtract,
  mac,
  utf8,
} from "./suite";
import type { Suite } from "./suite";

/** Client AKE state between KE1 and KE3. @internal */
export interface ClientAkeState {
  /** Client ephemeral private key. */
  clientSecret: Uint8Array;
  /** The KE1 that was sent. */
  ke1: KE1;
}

/** Server state between KE2 and KE3. */
export interface ServerLoginState {
  /** The client MAC that KE3 must carry. */
  expectedClientMac: Uint8Array;
  /** Session key, released only by `serverFinish` after the MAC verifies. */
  sessionKey: Uint8Array;
}

/** Keys derived by DeriveKeys. @internal */
export interface DerivedKeys {
  handshakeSecret: Uint8Array;
  km2: Uint8Array;
  km3: Uint8Array;
  sessionKey: Uint8Array;
}

/** Expand-Label(Secret, Label, Context, Length) (RFC 9807 § 6.4.2.1). @internal */
export function expandLabel(
  s: Suite,
  secret: Uint8Array,
  label: string,
  context: Uint8Array,
  length: number,
): Uint8Array {
  const fullLabel = utf8("OPAQUE-" + label);
  const customLabel = concat(
    i2osp(length, 2),
    i2osp(fullLabel.length, 1),
    fullLabel,
    i2osp(context.length, 1),
    context,
  );
  return kdfExpand(s, secret, customLabel, length);
}

/** Inputs to the preamble (RFC 9807 § 6.4.2.1). @internal */
export interface PreambleInput {
  context: Uint8Array;
  clientIdentity: Uint8Array;
  ke1: KE1;
  serverIdentity: Uint8Array;
  credentialResponse: CredentialResponse;
  serverNonce: Uint8Array;
  serverPublicKeyshare: Uint8Array;
}

/** Preamble: the transcript with identities and messages. @internal */
export function preamble(p: PreambleInput): Uint8Array {
  return concat(
    utf8("OPAQUEv1-"),
    i2osp(p.context.length, 2),
    p.context,
    i2osp(p.clientIdentity.length, 2),
    p.clientIdentity,
    serializeKE1(p.ke1),
    i2osp(p.serverIdentity.length, 2),
    p.serverIdentity,
    serializeCredentialResponse(p.credentialResponse),
    p.serverNonce,
    p.serverPublicKeyshare,
  );
}

/** DeriveKeys(ikm, preamble) (RFC 9807 § 6.4.2.2). @internal */
export function deriveKeys(
  s: Suite,
  ikm: Uint8Array,
  transcript: Uint8Array,
): DerivedKeys {
  const prk = kdfExtract(s, new Uint8Array(0), ikm);
  const th = s.hash(transcript);
  const handshakeSecret = expandLabel(s, prk, "HandshakeSecret", th, s.Nh);
  const none = new Uint8Array(0);
  return {
    handshakeSecret,
    sessionKey: expandLabel(s, prk, "SessionKey", th, s.Nh),
    km2: expandLabel(s, handshakeSecret, "ServerMAC", none, s.Nh),
    km3: expandLabel(s, handshakeSecret, "ClientMAC", none, s.Nh),
  };
}

/** MAC(Km2, Hash(preamble)) and MAC(Km3, Hash(concat(preamble, server_mac))). */
function transcriptMacs(s: Suite, keys: DerivedKeys, transcript: Uint8Array) {
  const serverMac = mac(s, keys.km2, s.hash(transcript));
  const clientMac = mac(s, keys.km3, s.hash(concat(transcript, serverMac)));
  return { serverMac, clientMac };
}

/** AuthClientStart with caller-supplied nonce and keyshare seed. @internal */
export function authClientStart(
  s: Suite,
  credentialRequest: CredentialRequest,
  clientNonce: Uint8Array,
  clientKeyshareSeed: Uint8Array,
): ClientAkeState {
  const kp = deriveDiffieHellmanKeyPair(s, clientKeyshareSeed);
  const ke1: KE1 = {
    credentialRequest,
    authRequest: {
      clientNonce: clientNonce.slice(),
      clientPublicKeyshare: kp.publicKey,
    },
  };
  return { clientSecret: kp.privateKey, ke1 };
}

/** Inputs to {@link authServerRespond}. @internal */
export interface AuthServerRespondInput {
  context: Uint8Array;
  cleartextCredentials: CleartextCredentials;
  serverPrivateKey: Uint8Array;
  clientPublicKey: Uint8Array;
  ke1: KE1;
  credentialResponse: CredentialResponse;
  serverNonce: Uint8Array;
  serverKeyshareSeed: Uint8Array;
}

/** AuthServerRespond (RFC 9807 § 6.4.4). @internal */
export function authServerRespond(s: Suite, input: AuthServerRespondInput) {
  const kp = deriveDiffieHellmanKeyPair(s, input.serverKeyshareSeed);
  const cc = input.cleartextCredentials;
  const transcript = preamble({
    context: input.context,
    clientIdentity: cc.clientIdentity,
    ke1: input.ke1,
    serverIdentity: cc.serverIdentity,
    credentialResponse: input.credentialResponse,
    serverNonce: input.serverNonce,
    serverPublicKeyshare: kp.publicKey,
  });
  const clientKeyshare = input.ke1.authRequest.clientPublicKeyshare;
  const ikm = concat(
    diffieHellman(s, kp.privateKey, clientKeyshare),
    diffieHellman(s, input.serverPrivateKey, clientKeyshare),
    diffieHellman(s, kp.privateKey, input.clientPublicKey),
  );
  const keys = deriveKeys(s, ikm, transcript);
  const { serverMac, clientMac } = transcriptMacs(s, keys, transcript);
  const authResponse: AuthResponse = {
    serverNonce: input.serverNonce.slice(),
    serverPublicKeyshare: kp.publicKey,
    serverMac,
  };
  const state: ServerLoginState = {
    expectedClientMac: clientMac,
    sessionKey: keys.sessionKey,
  };
  return { authResponse, state, keys };
}

/** AuthClientFinalize (RFC 9807 § 6.4.3). @internal */
export function authClientFinalize(
  s: Suite,
  context: Uint8Array,
  cc: CleartextCredentials,
  clientPrivateKey: Uint8Array,
  state: ClientAkeState,
  ke2: KE2,
): { ke3: KE3; sessionKey: Uint8Array } {
  const serverKeyshare = ke2.authResponse.serverPublicKeyshare;
  const ikm = concat(
    diffieHellman(s, state.clientSecret, serverKeyshare),
    diffieHellman(s, state.clientSecret, cc.serverPublicKey),
    diffieHellman(s, clientPrivateKey, serverKeyshare),
  );
  const transcript = preamble({
    context,
    clientIdentity: cc.clientIdentity,
    ke1: state.ke1,
    serverIdentity: cc.serverIdentity,
    credentialResponse: ke2.credentialResponse,
    serverNonce: ke2.authResponse.serverNonce,
    serverPublicKeyshare: serverKeyshare,
  });
  const keys = deriveKeys(s, ikm, transcript);
  const { serverMac, clientMac } = transcriptMacs(s, keys, transcript);
  if (!timingSafeEqual(ke2.authResponse.serverMac, serverMac)) {
    throw new CryptoError(
      "OPAQUE server authentication failed: invalid server MAC",
      OpaqueErrorCode.SERVER_AUTHENTICATION,
    );
  }
  return { ke3: { clientMac }, sessionKey: keys.sessionKey };
}

/** AuthServerFinalize (RFC 9807 § 6.4.4). @internal */
export function authServerFinalize(
  state: ServerLoginState,
  ke3: KE3,
): Uint8Array {
  if (!timingSafeEqual(ke3.clientMac, state.expectedClientMac)) {
    throw new CryptoError(
      "OPAQUE client authentication failed: invalid client MAC",
      OpaqueErrorCode.CLIENT_AUTHENTICATION,
    );
  }
  return state.sessionKey.slice();
}
