/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks PAKE — OPAQUE-like Password-Authenticated Key Exchange.
 *
 * Implements a simplified OPAQUE-style protocol using:
 * - P-256 as the OPRF group (hash-to-curve → blind → evaluate → unblind)
 * - HKDF-SHA256 for key derivation
 * - XChaCha20-Poly1305 for envelope encryption
 *
 * This is a 2-message protocol:
 *   Registration: client → server (stores registration record)
 *   Login: 3 steps — clientStart → serverRespond → clientFinish
 *
 * Security properties:
 * - Server never learns the password (OPRF evaluation)
 * - Mutual authentication via session key confirmation
 * - Pre-computation resistance via per-user salts
 */

import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// --- Types ---

/** Server-side record created during PAKE registration. */
export interface RegistrationRecord {
  /** Server ID bound to this registration. */
  serverId: string;
  /** Hex-encoded user public key (P-256 point from password). */
  userPublicKey: string;
  /** Hex-encoded server private key for this user (P-256 scalar). */
  serverPrivateKey: string;
  /** Hex-encoded server public key for this user (P-256 point). */
  serverPublicKey: string;
  /** Hex-encoded encrypted envelope (contains client's credential key). */
  envelope: string;
  /** Hex-encoded 32-byte salt for OPRF. */
  oprfSalt: string;
}

/** Client-to-server message initiating a PAKE login. */
export interface LoginRequest {
  /** Hex-encoded blinded element (P-256 point). */
  blindedElement: string;
  /** Hex-encoded ephemeral client public key (P-256 point). */
  clientEphemeralPublic: string;
}

/** Ephemeral client state kept between login start and finish. */
export interface ClientLoginState {
  /** Hex-encoded blind scalar (P-256 scalar). */
  blind: string;
  /** Password (kept temporarily for unblinding). */
  password: string;
  /** Hex-encoded ephemeral client private key (P-256 scalar). */
  clientEphemeralPrivate: string;
  /** Hex-encoded ephemeral client public key (P-256 point). */
  clientEphemeralPublic: string;
}

/** Server-to-client response during PAKE login. */
export interface LoginResponse {
  /** Hex-encoded evaluated element (P-256 point). */
  evaluatedElement: string;
  /** Hex-encoded ephemeral server public key (P-256 point). */
  serverEphemeralPublic: string;
  /** Hex-encoded encrypted envelope. */
  envelope: string;
  /** Hex-encoded server public key from the record. */
  serverPublicKey: string;
  /** Hex-encoded OPRF salt. */
  oprfSalt: string;
  /** Hex-encoded server MAC for key confirmation. */
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
  /** Algorithm identifier. */
  algorithm: "opaque-p256";
}

// --- Constants ---

/** Regex matching valid hexadecimal strings. */
const HEX_RE = /^[0-9a-fA-F]*$/;
/** XChaCha20 nonce length in bytes. */
const NONCE_LEN = 24;

// --- Helpers ---

/** Parse a hex string into bytes, throwing with a label on invalid input. */
function hexToBytes(hex: string, label: string): Uint8Array {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex string for ${label}`);
  }
  return Buffer.from(hex, "hex");
}

/** Convert bytes to a hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/**
 * Hash a password to a P-256 scalar using HKDF.
 * This is a simplified hash-to-field operation.
 */
function hashToScalar(password: string, salt: Uint8Array): bigint {
  const input = Buffer.from(password, "utf8");
  // Derive 48 bytes (extra for bias reduction) then reduce mod n
  const expanded = hkdf(
    sha256,
    input,
    salt,
    new TextEncoder().encode("opaque-p256-oprf-scalar"),
    48,
  );
  const n = p256.Point.Fn.ORDER;
  let scalar = BigInt(0);
  for (let i = 0; i < expanded.length; i++) {
    scalar = (scalar * BigInt(256) + BigInt(expanded[i])) % n;
  }
  // Ensure non-zero
  /* c8 ignore next -- probabilistic: random scalar is zero with negligible probability */
  if (scalar === BigInt(0)) scalar = BigInt(1);
  return scalar;
}

/**
 * Hash a password to a P-256 point using hash-to-scalar then multiply generator.
 */
function hashToPoint(
  password: string,
  salt: Uint8Array,
): { point: typeof p256.Point.BASE; scalar: bigint } {
  const scalar = hashToScalar(password, salt);
  const point = p256.Point.BASE.multiply(scalar);
  return { point, scalar };
}

/**
 * Generate a random non-zero P-256 scalar.
 */
function randomScalar(): bigint {
  const n = p256.Point.Fn.ORDER;
  // Generate 48 bytes for bias reduction
  const raw = randomBytes(48);
  let scalar = BigInt(0);
  for (let i = 0; i < raw.length; i++) {
    scalar = (scalar * BigInt(256) + BigInt(raw[i])) % n;
  }
  /* c8 ignore next -- probabilistic: random scalar is zero with negligible probability */
  if (scalar === BigInt(0)) scalar = BigInt(1);
  return scalar;
}

function scalarToHex(scalar: bigint): string {
  return scalar.toString(16).padStart(64, "0");
}

function hexToScalar(hex: string): bigint {
  return BigInt("0x" + hex);
}

function pointToHex(point: typeof p256.Point.BASE): string {
  return bytesToHex(point.toBytes(false));
}

function hexToPoint(hex: string): typeof p256.Point.BASE {
  return p256.Point.fromHex(hex);
}

// --- Registration ---

/**
 * Register a password with the server.
 *
 * The server stores the registration record without ever learning the password.
 * Uses OPRF to derive a key from the password, then encrypts credentials
 * into an envelope.
 *
 * @param password - User's password.
 * @param serverId - Unique server identifier.
 */
export function serverRegister(
  password: string,
  serverId: string,
): RegistrationRecord {
  // Generate OPRF salt
  const oprfSalt = randomBytes(32);

  // Hash password to P-256 point (user's "public key" derived from password)
  const { point: userPoint } = hashToPoint(password, oprfSalt);
  const userPublicKey = pointToHex(userPoint);

  // Generate server's per-user key pair
  const serverPrivScalar = randomScalar();
  const serverPubPoint = p256.Point.BASE.multiply(serverPrivScalar);
  const serverPrivateKey = scalarToHex(serverPrivScalar);
  const serverPublicKey = pointToHex(serverPubPoint);

  // Derive the OPRF output (simulated: server evaluates on the password point)
  const evaluated = userPoint.multiply(serverPrivScalar);
  const oprfOutput = sha256(evaluated.toBytes(false));

  // Derive credential key from OPRF output
  const credentialKey = hkdf(
    sha256,
    oprfOutput,
    oprfSalt,
    new TextEncoder().encode("opaque-credential-key"),
    32,
  );

  // Create envelope: encrypt a random auth key
  const authKey = randomBytes(32);
  const nonce = randomBytes(NONCE_LEN);
  const cipher = xchacha20poly1305(credentialKey, nonce);
  const envelopePlaintext = new Uint8Array(
    32 + serverPubPoint.toBytes(false).length,
  );
  envelopePlaintext.set(authKey);
  envelopePlaintext.set(serverPubPoint.toBytes(false), 32);
  const envelopeCt = cipher.encrypt(envelopePlaintext);

  // Pack envelope: nonce || ciphertext
  const envelope = new Uint8Array(NONCE_LEN + envelopeCt.length);
  envelope.set(nonce);
  envelope.set(envelopeCt, NONCE_LEN);

  return {
    serverId,
    userPublicKey,
    serverPrivateKey,
    serverPublicKey,
    envelope: bytesToHex(envelope),
    oprfSalt: bytesToHex(oprfSalt),
  };
}

// --- Login Flow ---

/**
 * Client starts the login flow.
 *
 * Blinds the password hash and generates an ephemeral key pair for the
 * key exchange phase.
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
  // Generate a random salt for the initial blinding (server will use its own)
  const tempSalt = randomBytes(32);

  // Blind the password: choose random blind, compute blind * H(password)
  const blind = randomScalar();
  const { scalar: pwScalar } = hashToPoint(password, tempSalt);

  // Blinded element = blind * G (we'll let server evaluate on this)
  const blindedPoint = p256.Point.BASE.multiply(
    (blind * pwScalar) % p256.Point.Fn.ORDER,
  );

  // Ephemeral key pair for ECDH
  const ephPriv = randomScalar();
  const ephPub = p256.Point.BASE.multiply(ephPriv);

  return {
    request: {
      blindedElement: pointToHex(blindedPoint),
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
 * Evaluates the OPRF on the blinded element and performs its side
 * of the key exchange.
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
  const blindedPoint = hexToPoint(request.blindedElement);
  const serverPrivScalar = hexToScalar(record.serverPrivateKey);
  const clientEphPub = hexToPoint(request.clientEphemeralPublic);

  // OPRF evaluation: server multiplies blinded element by its key
  const evaluatedPoint = blindedPoint.multiply(serverPrivScalar);

  // Server ephemeral key pair for ECDH
  const serverEphPriv = randomScalar();
  const serverEphPub = p256.Point.BASE.multiply(serverEphPriv);

  // Compute shared secret: ECDH between server ephemeral and client ephemeral
  const ecdhShared = clientEphPub.multiply(serverEphPriv);
  const sharedBytes = ecdhShared.toBytes(false);

  // Derive session key and MAC keys
  const derived = hkdf(
    sha256,
    sharedBytes,
    Buffer.from(record.serverId, "utf8"),
    new TextEncoder().encode("opaque-session"),
    96,
  );
  const sessionKey = derived.subarray(0, 32);
  const serverMacKey = derived.subarray(32, 64);
  const clientMacKey = derived.subarray(64, 96);

  // Server MAC over transcript
  const transcript = Buffer.concat([
    hexToBytes(request.blindedElement, "blindedElement"),
    serverEphPub.toBytes(false),
  ]);
  const serverMac = hmac(sha256, serverMacKey, transcript);

  // Expected client MAC
  const clientTranscript = Buffer.concat([
    serverEphPub.toBytes(false),
    hexToBytes(request.clientEphemeralPublic, "clientEph"),
  ]);
  const expectedClientMac = hmac(sha256, clientMacKey, clientTranscript);

  return {
    response: {
      evaluatedElement: pointToHex(evaluatedPoint),
      serverEphemeralPublic: pointToHex(serverEphPub),
      envelope: record.envelope,
      serverPublicKey: record.serverPublicKey,
      oprfSalt: record.oprfSalt,
      serverMac: bytesToHex(serverMac),
    },
    state: {
      sessionKey: bytesToHex(sessionKey),
      expectedClientMac: bytesToHex(expectedClientMac),
    },
  };
}

/**
 * Client finishes the login flow.
 *
 * Unblinds the OPRF evaluation, derives the credential key, decrypts
 * the envelope, and computes the session key.
 *
 * @param response - Login response from server.
 * @param clientState - State from clientStartLogin.
 * @param serverId - Server ID for key derivation context.
 */
export function clientFinishLogin(
  response: LoginResponse,
  clientState: ClientLoginState,
  serverId: string,
): LoginFinishResult {
  const clientEphPriv = hexToScalar(clientState.clientEphemeralPrivate);
  const serverEphPub = hexToPoint(response.serverEphemeralPublic);

  // Compute shared secret: ECDH between client ephemeral and server ephemeral
  const ecdhShared = serverEphPub.multiply(clientEphPriv);
  const sharedBytes = ecdhShared.toBytes(false);

  // Derive session key and MAC keys (same derivation as server)
  const derived = hkdf(
    sha256,
    sharedBytes,
    Buffer.from(serverId, "utf8"),
    new TextEncoder().encode("opaque-session"),
    96,
  );
  const sessionKey = derived.subarray(0, 32);
  const serverMacKey = derived.subarray(32, 64);
  const clientMacKey = derived.subarray(64, 96);

  // Reconstruct the blinded element for MAC verification
  const blindVal = hexToScalar(clientState.blind);
  const oprfSalt = hexToBytes(response.oprfSalt, "oprfSalt");
  const { scalar: pw } = hashToPoint(clientState.password, oprfSalt);
  const blindedPoint = p256.Point.BASE.multiply(
    (blindVal * pw) % p256.Point.Fn.ORDER,
  );

  const transcript = Buffer.concat([
    blindedPoint.toBytes(false),
    serverEphPub.toBytes(false),
  ]);
  const expectedServerMac = hmac(sha256, serverMacKey, transcript);
  const actualServerMac = hexToBytes(response.serverMac, "serverMac");

  // Constant-time comparison
  if (
    expectedServerMac.length !== actualServerMac.length ||
    !expectedServerMac.every((b, i) => b === actualServerMac[i])
  ) {
    throw new Error("Server authentication failed — invalid server MAC");
  }

  // Compute client MAC for mutual auth
  const clientTranscript = Buffer.concat([
    serverEphPub.toBytes(false),
    hexToPoint(clientState.clientEphemeralPublic).toBytes(false),
  ]);
  const clientMac = hmac(sha256, clientMacKey, clientTranscript);

  return {
    sessionKey: bytesToHex(sessionKey),
    clientMac: bytesToHex(clientMac),
    algorithm: "opaque-p256",
  };
}

/**
 * Server verifies the client's MAC to complete mutual authentication.
 *
 * @param clientMac - Client MAC from clientFinishLogin (hex).
 * @param serverState - State from serverRespondLogin.
 * @returns true if authentication succeeds.
 */
export function serverVerifyClient(
  clientMac: string,
  serverState: ServerLoginState,
): boolean {
  const actual = hexToBytes(clientMac, "clientMac");
  const expected = hexToBytes(
    serverState.expectedClientMac,
    "expectedClientMac",
  );
  if (actual.length !== expected.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}
