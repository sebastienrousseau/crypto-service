/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OPRF evaluation and credential retrieval (RFC 9807 § 5.2 and
 * § 6.3.2): per-credential OPRF keys from the server's oprf_seed, the
 * client's Blind/Finalize, and the masked credential response.
 * @internal
 */

import type { Ksf } from "./ksf";
import { randomizePassword, recover, maskingKeyFor } from "./envelope";
import type { Identities } from "./envelope";
import { maskedResponseLength, serializeEnvelope } from "./messages";
import type {
  CredentialRequest,
  CredentialResponse,
  RegistrationRecord,
} from "./messages";
import { Nn, blindWith, concat, kdfExpand, toBytes, utf8, xor } from "./suite";
import type { Suite } from "./suite";

/**
 * oprf_key from DeriveKeyPair(Expand(oprf_seed, concat(credential_identifier,
 * "OprfKey"), Nok), "OPAQUE-DeriveKeyPair") (RFC 9807 § 5.2.2).
 * @internal
 */
export function deriveOprfKey(
  s: Suite,
  oprfSeed: Uint8Array,
  credentialIdentifier: Uint8Array | string,
): Uint8Array {
  const info = concat(toBytes(credentialIdentifier), utf8("OprfKey"));
  const seed = kdfExpand(s, oprfSeed, info, s.Nok);
  return s.oprf.deriveKeyPair(seed, utf8("OPAQUE-DeriveKeyPair")).secretKey;
}

/**
 * Blind(password): a fresh random blind, or `blind` when given (test
 * vectors only).
 * @internal
 */
export function blindPassword(
  s: Suite,
  password: Uint8Array,
  blind?: Uint8Array,
): { blind: Uint8Array; blindedMessage: Uint8Array } {
  if (blind !== undefined) {
    return { blind, blindedMessage: blindWith(s, password, blind) };
  }
  const r = s.oprf.blind(password);
  return { blind: r.blind, blindedMessage: r.blinded };
}

/**
 * BlindEvaluate with the credential's OPRF key. Rejects invalid and
 * identity elements.
 * @internal
 */
export function evaluateOprf(
  s: Suite,
  oprfSeed: Uint8Array,
  credentialIdentifier: Uint8Array | string,
  blindedMessage: Uint8Array,
): Uint8Array {
  const key = deriveOprfKey(s, oprfSeed, credentialIdentifier);
  return s.oprf.blindEvaluate(key, blindedMessage);
}

/** Finalize the OPRF and derive the randomized password. @internal */
export function finalizeOprf(
  s: Suite,
  ksf: Ksf,
  password: Uint8Array,
  blind: Uint8Array,
  evaluatedMessage: Uint8Array,
) {
  const oprfOutput = s.oprf.finalize(password, blind, evaluatedMessage);
  return {
    oprfOutput,
    randomizedPassword: randomizePassword(s, ksf, oprfOutput),
  };
}

/** Expand(masking_key, concat(masking_nonce, "CredentialResponsePad"), Npk + Nn + Nm). */
function responsePad(s: Suite, maskingKey: Uint8Array, nonce: Uint8Array) {
  const info = concat(nonce, utf8("CredentialResponsePad"));
  return kdfExpand(s, maskingKey, info, maskedResponseLength(s));
}

/** Inputs to {@link createCredentialResponse}. @internal */
export interface CredentialResponseInput {
  request: CredentialRequest;
  serverPublicKey: Uint8Array;
  record: RegistrationRecord;
  credentialIdentifier: Uint8Array | string;
  oprfSeed: Uint8Array;
  maskingNonce: Uint8Array;
}

/**
 * CreateCredentialResponse (RFC 9807 § 6.3.2.2). A fake record for an
 * unknown client goes through exactly the same steps.
 * @internal
 */
export function createCredentialResponse(
  s: Suite,
  input: CredentialResponseInput,
): CredentialResponse {
  const evaluatedMessage = evaluateOprf(
    s,
    input.oprfSeed,
    input.credentialIdentifier,
    input.request.blindedMessage,
  );
  const pad = responsePad(s, input.record.maskingKey, input.maskingNonce);
  const plain = concat(
    input.serverPublicKey,
    serializeEnvelope(input.record.envelope),
  );
  return {
    evaluatedMessage,
    maskingNonce: input.maskingNonce.slice(),
    maskedResponse: xor(pad, plain),
  };
}

/** RecoverCredentials (RFC 9807 § 6.3.2.3). @internal */
export function recoverCredentials(
  s: Suite,
  ksf: Ksf,
  password: Uint8Array,
  blind: Uint8Array,
  response: CredentialResponse,
  ids: Identities,
) {
  const { randomizedPassword } = finalizeOprf(
    s,
    ksf,
    password,
    blind,
    response.evaluatedMessage,
  );
  const maskingKey = maskingKeyFor(s, randomizedPassword);
  const pad = responsePad(s, maskingKey, response.maskingNonce);
  const plain = xor(pad, response.maskedResponse);
  const serverPublicKey = plain.slice(0, s.Npk);
  const envelope = {
    nonce: plain.slice(s.Npk, s.Npk + Nn),
    authTag: plain.slice(s.Npk + Nn),
  };
  return recover(s, randomizedPassword, serverPublicKey, envelope, ids);
}
