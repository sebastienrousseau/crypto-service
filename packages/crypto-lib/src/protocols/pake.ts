/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PAKE — an OPAQUE-style asymmetric password-authenticated key
 * exchange over P-256. **This is not RFC 9807 OPAQUE** and does not
 * interoperate with OPAQUE implementations; it borrows OPAQUE's structure
 * (an OPRF-hardened password, an encrypted envelope and a 3DH key
 * exchange) but not its message formats or key schedule.
 *
 * Building blocks:
 * - OPRF: RFC 9497 P256-SHA256 in base OPRF mode (RFC 9380 hash-to-curve
 *   with the RFC 9497 domain separation tag), checked against the RFC 9497
 *   test vectors. The per-user OPRF key is derived with the RFC 9497
 *   DeriveKeyPair from the record's `serverPrivateKey` and `oprfSalt`.
 * - Envelope: XChaCha20-Poly1305 under a key derived by HKDF-SHA256 from
 *   the OPRF output. It holds the client's static private key and the
 *   server's public key, bound to the server identity.
 * - AKE: 3DH between the client's static and ephemeral keys and the
 *   server's static and ephemeral keys, with HKDF-SHA256 key derivation
 *   and HMAC-SHA256 key confirmation in both directions over a hash of
 *   the whole transcript.
 *
 * Flow: `serverRegister` → record stored by the server; login is
 * `clientStartLogin` → `serverRespondLogin` → `clientFinishLogin` →
 * `serverVerifyClient`.
 *
 * Properties it has: the login messages reveal nothing a passive observer
 * or the server can use to test password guesses offline; a client
 * without the password cannot complete a login, and a server without the
 * record cannot impersonate the server; both sides agree on the session
 * key only when every message is authentic.
 *
 * Properties it lacks compared with RFC 9807 OPAQUE:
 * - Registration is not oblivious: `serverRegister` takes the plaintext
 *   password and runs both roles in one process. Call it on the client or
 *   in a trusted enrolment service, never on the login server.
 * - The record carries its own OPRF seed (`serverPrivateKey`), so a leaked
 *   record allows an offline dictionary attack (at the cost of one OPRF
 *   evaluation and one AEAD decryption per guess, with no memory-hard
 *   stretching). Protect records as you would password hashes.
 * - There is no credential masking or user-enumeration protection, no
 *   key-stretching function, and no client/server identity binding other
 *   than `serverId`.
 *
 * Records created by versions before 0.0.7 cannot log in with this
 * version; their login never completed and their key exchange did not
 * depend on the password.
 */

import { p256, p256_hasher, p256_oprf } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { timingSafeEqual } from "../utils";

// --- Types ---

/** Server-side record created during PAKE registration. */
export interface RegistrationRecord {
  /** Server ID bound to this registration. */
  serverId: string;
  /** Hex-encoded client static public key (uncompressed P-256 point). Its private key is only in the envelope. */
  userPublicKey: string;
  /** Hex-encoded server private key for this user (P-256 scalar). Also seeds the user's OPRF key, so the record is secret. */
  serverPrivateKey: string;
  /** Hex-encoded server public key for this user (P-256 point). */
  serverPublicKey: string;
  /** Hex-encoded envelope: nonce || XChaCha20-Poly1305(client static private key || server public key). */
  envelope: string;
  /** Hex-encoded 32-byte per-user salt (OPRF key info and envelope-key salt). */
  oprfSalt: string;
}

/** Client-to-server message initiating a PAKE login. */
export interface LoginRequest {
  /** Hex-encoded blinded element (compressed P-256 point, RFC 9497). */
  blindedElement: string;
  /** Hex-encoded ephemeral client public key (P-256 point). */
  clientEphemeralPublic: string;
}

/** Ephemeral client state kept between login start and finish. */
export interface ClientLoginState {
  /** Hex-encoded blind scalar (P-256 scalar). */
  blind: string;
  /** Password (kept until login finish for OPRF finalization). */
  password: string;
  /** Hex-encoded ephemeral client private key (P-256 scalar). */
  clientEphemeralPrivate: string;
  /** Hex-encoded ephemeral client public key (P-256 point). */
  clientEphemeralPublic: string;
}

/** Server-to-client response during PAKE login. */
export interface LoginResponse {
  /** Hex-encoded evaluated element (compressed P-256 point, RFC 9497). */
  evaluatedElement: string;
  /** Hex-encoded ephemeral server public key (P-256 point). */
  serverEphemeralPublic: string;
  /** Hex-encoded encrypted envelope. */
  envelope: string;
  /** Hex-encoded server public key from the record. */
  serverPublicKey: string;
  /** Hex-encoded OPRF salt. */
  oprfSalt: string;
  /** Hex-encoded server MAC (HMAC-SHA256 over the transcript hash). */
  serverMac: string;
}

/** Server-side state kept between login respond and client verification. */
export interface ServerLoginState {
  /** Hex-encoded session key (server-side). */
  sessionKey: string;
  /** Expected client MAC for mutual authentication. */
  expectedClientMac: string;
}

/** Result returned by the client after completing login. */
export interface LoginFinishResult {
  /** Hex-encoded 32-byte session key. */
  sessionKey: string;
  /** Hex-encoded client MAC for server verification. */
  clientMac: string;
  /** Algorithm identifier (kept for compatibility; this is not RFC 9807 OPAQUE). */
  algorithm: "opaque-p256";
}

// --- Constants ---

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;
/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;
/** Envelope plaintext: client static private key (32) || server public key (65). */
const ENVELOPE_PT_LEN = 32 + 65;
/** RFC 9497 § 4.3 HashToGroup DST for P256-SHA256 in OPRF mode (0x00). */
const OPRF_DST = new TextEncoder().encode(
  "HashToGroup-OPRFV1-\x00-P256-SHA256",
);
/** Protocol label prefixed to every derivation in this module. */
const LABEL = "crypto-lib-pake-p256-v1";

/** P-256 point type. */
type Point = typeof p256.Point.BASE;

// --- Helpers ---

/** Parse a hex string into bytes, throwing with a label on invalid input. */
function hexToBytes(hex: string, label: string): Uint8Array {
  if (!HEX_RE.test(hex) || hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(hex, "hex");
}

/** Convert bytes to a hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** UTF-8 encode a string. */
function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Generate a random non-zero P-256 scalar. */
function randomScalar(): bigint {
  return p256.Point.Fn.fromBytes(p256.utils.randomSecretKey());
}

function scalarToHex(scalar: bigint): string {
  return bytesToHex(p256.Point.Fn.toBytes(scalar));
}

function hexToScalar(hex: string, label: string): bigint {
  return p256.Point.Fn.fromBytes(hexToBytes(hex, label));
}

function pointToHex(point: Point): string {
  return bytesToHex(point.toBytes(false));
}

function hexToPoint(hex: string, label: string): Point {
  return p256.Point.fromBytes(hexToBytes(hex, label));
}

/** Concatenate byte strings, each prefixed with its 2-byte big-endian length. */
function lengthPrefixed(...parts: Uint8Array[]): Uint8Array {
  return Buffer.concat(
    parts.flatMap((p) => [
      new Uint8Array([(p.length >> 8) & 0xff, p.length & 0xff]),
      p,
    ]),
  );
}

// --- OPRF (RFC 9497, P256-SHA256, mode 0x00) ---

/** Blind(input): blind · HashToGroup(password), RFC 9497 § 3.3.1. */
function oprfBlind(password: string, blind: bigint): Point {
  return p256_hasher
    .hashToCurve(utf8(password), { DST: OPRF_DST })
    .multiply(blind);
}

/** Per-user OPRF key: RFC 9497 DeriveKeyPair(seed, info). */
function oprfKey(serverPrivateKey: string, oprfSalt: string): Uint8Array {
  const seed = hexToBytes(serverPrivateKey, "serverPrivateKey");
  const info = Buffer.concat([
    utf8(LABEL + "-oprf-key"),
    hexToBytes(oprfSalt, "oprfSalt"),
  ]);
  return p256_oprf.oprf.deriveKeyPair(seed, info).secretKey;
}

/** Envelope key from the OPRF output (randomized password). */
function envelopeKey(oprfOutput: Uint8Array, oprfSalt: Uint8Array) {
  return hkdf(sha256, oprfOutput, oprfSalt, utf8(LABEL + "-envelope"), 32);
}

// --- Key exchange (3DH) ---

/** Inputs both sides hash into the transcript. */
interface Transcript {
  serverId: string;
  blindedElement: Uint8Array;
  clientEphemeralPublic: Point;
  evaluatedElement: Uint8Array;
  envelope: Uint8Array;
  serverPublic: Point;
  serverEphemeralPublic: Point;
}

/** Derived session key and confirmation MACs. */
interface SessionKeys {
  sessionKey: Uint8Array;
  serverMac: Uint8Array;
  clientMac: Uint8Array;
}

/** Derive session key and both MACs from the three DH results and transcript. */
function deriveSession(dhs: Point[], t: Transcript): SessionKeys {
  const th = sha256(
    lengthPrefixed(
      utf8(LABEL),
      utf8(t.serverId),
      t.blindedElement,
      t.clientEphemeralPublic.toBytes(false),
      t.evaluatedElement,
      t.envelope,
      t.serverPublic.toBytes(false),
      t.serverEphemeralPublic.toBytes(false),
    ),
  );
  const ikm = Buffer.concat(dhs.map((p) => p.toBytes(true).subarray(1)));
  const okm = hkdf(
    sha256,
    ikm,
    undefined,
    Buffer.concat([utf8(LABEL), th]),
    96,
  );
  const serverMac = hmac(sha256, okm.subarray(32, 64), th);
  const clientMac = hmac(
    sha256,
    okm.subarray(64, 96),
    Buffer.concat([th, serverMac]),
  );
  return { sessionKey: okm.slice(0, 32), serverMac, clientMac };
}

/** Seal the envelope: client static key and server public key, bound to serverId. */
function sealEnvelope(
  key: Uint8Array,
  serverId: string,
  clientStatic: bigint,
  serverPublic: Point,
): Uint8Array {
  const nonce = randomBytes(NONCE_LEN);
  const pt = Buffer.concat([
    p256.Point.Fn.toBytes(clientStatic),
    serverPublic.toBytes(false),
  ]);
  const ct = xchacha20poly1305(key, nonce, utf8(serverId)).encrypt(pt);
  return Buffer.concat([nonce, ct]);
}

/** Open the envelope; any failure means a wrong password or a forged response. */
function openEnvelope(
  key: Uint8Array,
  serverId: string,
  envelope: Uint8Array,
): { clientStatic: bigint; serverPublic: Point } {
  let pt: Uint8Array;
  try {
    pt = xchacha20poly1305(
      key,
      envelope.subarray(0, NONCE_LEN),
      utf8(serverId),
    ).decrypt(envelope.subarray(NONCE_LEN));
  } catch {
    throw new Error(
      "Authentication failed — wrong password or invalid envelope",
    );
  }
  return {
    clientStatic: p256.Point.Fn.fromBytes(pt.subarray(0, 32)),
    serverPublic: p256.Point.fromBytes(pt.subarray(32, ENVELOPE_PT_LEN)),
  };
}

// --- Registration ---

/**
 * Create a registration record for a password.
 *
 * Runs the client and server halves of registration in one call: it
 * evaluates the OPRF on the password, generates the client's static key
 * pair and the server's per-user key pair, and seals the client's static
 * private key into an envelope that only the OPRF output can open.
 *
 * Because it takes the plaintext password, call it on the client or in a
 * trusted enrolment service and send only the returned record to the
 * login server (see the module remarks for what this does not protect).
 *
 * @param password - User's password.
 * @param serverId - Unique server identifier, bound into the envelope and
 *   every login transcript.
 * @returns The record the server stores. Treat it as secret.
 */
export function serverRegister(
  password: string,
  serverId: string,
): RegistrationRecord {
  const oprfSalt = randomBytes(32);
  const serverPriv = randomScalar();
  const serverPub = p256.Point.BASE.multiply(serverPriv);
  const clientStatic = randomScalar();

  const serverPrivateKey = scalarToHex(serverPriv);
  const blind = randomScalar();
  const evaluated = p256_oprf.oprf.blindEvaluate(
    oprfKey(serverPrivateKey, bytesToHex(oprfSalt)),
    oprfBlind(password, blind).toBytes(),
  );
  const output = p256_oprf.oprf.finalize(
    utf8(password),
    p256.Point.Fn.toBytes(blind),
    evaluated,
  );
  const envelope = sealEnvelope(
    envelopeKey(output, oprfSalt),
    serverId,
    clientStatic,
    serverPub,
  );

  return {
    serverId,
    userPublicKey: pointToHex(p256.Point.BASE.multiply(clientStatic)),
    serverPrivateKey,
    serverPublicKey: pointToHex(serverPub),
    envelope: bytesToHex(envelope),
    oprfSalt: bytesToHex(oprfSalt),
  };
}

// --- Login Flow ---

/**
 * Client starts the login flow.
 *
 * Blinds the RFC 9380 hash of the password with a fresh random scalar
 * (RFC 9497 Blind) and generates an ephemeral key pair for the key
 * exchange. The blinded element reveals nothing about the password.
 *
 * @param password - User's password.
 * @returns Login request to send to server, and client state to keep.
 */
export function clientStartLogin(password: string): {
  /** Login request to send to the server. */
  request: LoginRequest;
  /** Ephemeral client state to keep for login finish. */
  state: ClientLoginState;
} {
  const blind = randomScalar();
  const blinded = oprfBlind(password, blind);
  const ephPriv = randomScalar();
  const ephPub = p256.Point.BASE.multiply(ephPriv);

  return {
    request: {
      blindedElement: bytesToHex(blinded.toBytes()),
      clientEphemeralPublic: pointToHex(ephPub),
    },
    state: {
      blind: scalarToHex(blind),
      password,
      clientEphemeralPrivate: scalarToHex(ephPriv),
      clientEphemeralPublic: pointToHex(ephPub),
    },
  };
}

/**
 * Server processes the login request and responds.
 *
 * Evaluates the OPRF on the blinded element with the user's OPRF key,
 * performs its side of the 3DH key exchange and computes its key
 * confirmation MAC over the transcript.
 *
 * @param request - Login request from client.
 * @param record - Registration record for this user.
 * @returns Login response to send to client, and server state.
 */
export function serverRespondLogin(
  request: LoginRequest,
  record: RegistrationRecord,
): {
  /** Login response to send to the client. */
  response: LoginResponse;
  /** Server state to keep for client verification. */
  state: ServerLoginState;
} {
  const blinded = hexToBytes(request.blindedElement, "blindedElement");
  const clientEph = hexToPoint(request.clientEphemeralPublic, "clientEph");
  const clientStaticPub = hexToPoint(record.userPublicKey, "userPublicKey");
  const serverPriv = hexToScalar(record.serverPrivateKey, "serverPrivateKey");
  const envelope = hexToBytes(record.envelope, "envelope");
  const evaluated = p256_oprf.oprf.blindEvaluate(
    oprfKey(record.serverPrivateKey, record.oprfSalt),
    blinded,
  );

  const serverEphPriv = randomScalar();
  const serverEphPub = p256.Point.BASE.multiply(serverEphPriv);
  const keys = deriveSession(
    [
      clientEph.multiply(serverEphPriv),
      clientEph.multiply(serverPriv),
      clientStaticPub.multiply(serverEphPriv),
    ],
    {
      serverId: record.serverId,
      blindedElement: blinded,
      clientEphemeralPublic: clientEph,
      evaluatedElement: evaluated,
      envelope,
      serverPublic: p256.Point.BASE.multiply(serverPriv),
      serverEphemeralPublic: serverEphPub,
    },
  );

  return {
    response: {
      evaluatedElement: bytesToHex(evaluated),
      serverEphemeralPublic: pointToHex(serverEphPub),
      envelope: record.envelope,
      serverPublicKey: record.serverPublicKey,
      oprfSalt: record.oprfSalt,
      serverMac: bytesToHex(keys.serverMac),
    },
    state: {
      sessionKey: bytesToHex(keys.sessionKey),
      expectedClientMac: bytesToHex(keys.clientMac),
    },
  };
}

/**
 * Client finishes the login flow.
 *
 * Unblinds the OPRF evaluation (RFC 9497 Finalize), opens the envelope
 * with the derived key, performs its side of the 3DH key exchange and
 * checks the server's MAC in constant time.
 *
 * @param response - Login response from server.
 * @param clientState - State from clientStartLogin.
 * @param serverId - Server ID the client expects to talk to.
 * @throws If the password is wrong, the envelope or response was tampered
 *   with, or the server MAC does not verify.
 */
export function clientFinishLogin(
  response: LoginResponse,
  clientState: ClientLoginState,
  serverId: string,
): LoginFinishResult {
  const serverEphPub = hexToPoint(response.serverEphemeralPublic, "serverEph");
  const evaluated = hexToBytes(response.evaluatedElement, "evaluatedElement");
  const envelope = hexToBytes(response.envelope, "envelope");
  const oprfSalt = hexToBytes(response.oprfSalt, "oprfSalt");
  const blind = hexToScalar(clientState.blind, "blind");
  const ephPriv = hexToScalar(clientState.clientEphemeralPrivate, "clientEph");

  const output = p256_oprf.oprf.finalize(
    utf8(clientState.password),
    p256.Point.Fn.toBytes(blind),
    evaluated,
  );
  const { clientStatic, serverPublic } = openEnvelope(
    envelopeKey(output, oprfSalt),
    serverId,
    envelope,
  );

  const keys = deriveSession(
    [
      serverEphPub.multiply(ephPriv),
      serverPublic.multiply(ephPriv),
      serverEphPub.multiply(clientStatic),
    ],
    {
      serverId,
      blindedElement: oprfBlind(clientState.password, blind).toBytes(),
      clientEphemeralPublic: p256.Point.BASE.multiply(ephPriv),
      evaluatedElement: evaluated,
      envelope,
      serverPublic,
      serverEphemeralPublic: serverEphPub,
    },
  );

  const actualServerMac = hexToBytes(response.serverMac, "serverMac");
  if (!timingSafeEqual(keys.serverMac, actualServerMac)) {
    throw new Error("Server authentication failed — invalid server MAC");
  }

  return {
    sessionKey: bytesToHex(keys.sessionKey),
    clientMac: bytesToHex(keys.clientMac),
    algorithm: "opaque-p256",
  };
}

/**
 * Server verifies the client's MAC to complete mutual authentication.
 *
 * The comparison runs in constant time. Use `serverState.sessionKey` only
 * after this returns `true`.
 *
 * @param clientMac - Client MAC from clientFinishLogin (hex).
 * @param serverState - State from serverRespondLogin.
 * @returns true if authentication succeeds.
 */
export function serverVerifyClient(
  clientMac: string,
  serverState: ServerLoginState,
): boolean {
  return timingSafeEqual(
    hexToBytes(clientMac, "clientMac"),
    hexToBytes(serverState.expectedClientMac, "expectedClientMac"),
  );
}
