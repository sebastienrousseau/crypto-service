// SPDX-License-Identifier: Apache-2.0 OR MIT

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  EC_CURVES,
  KEY_DIR_ENV,
  MAX_KEY_FILE_BYTES,
  RSA_MODULUS_LENGTHS,
} from "./definitions";
import { asymmetric } from "./keys";
import { KeyKind, KeyMaterial, keyStore, symmetricKey } from "./keystore";
import { ToolArgs, ToolHandler, jsonResult } from "./result";

/*
 * `crypto_key_import`: load an existing key from a file into the key
 * store, so data encrypted or signed outside the server can be used with
 * the other tools. The caller names a file; the key bytes go from disk
 * to the store and never through the conversation. Only files inside the
 * directory the operator sets in CRYPTO_MCP_KEY_DIR can be read, and the
 * bytes read are overwritten with zeros once parsed. Results and errors
 * never include file contents.
 */

/** Bytes of a raw symmetric-256 or hmac-sha256 key. */
const RAW_KEY_BYTES = 32;

/** Recorded as the `source` of every imported key. */
const SOURCE = "crypto_key_import";

/** Every file-system failure becomes this message, without the path. */
const UNREADABLE = `Key file not found or not readable in ${KEY_DIR_ENV}`;

/** Refuses to follow a symlink in the last path component (0 on Windows). */
const OPEN_FLAGS = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW | 0);

/** The key directory, resolved, or an error when imports are disabled. */
async function keyDirectory(): Promise<string> {
  const dir = process.env[KEY_DIR_ENV];
  if (!dir) {
    throw new Error(
      `Key import is disabled: set ${KEY_DIR_ENV} to the directory holding the key files`,
    );
  }
  try {
    return await fs.promises.realpath(dir);
  } catch {
    throw new Error(`${KEY_DIR_ENV} does not exist or cannot be read`);
  }
}

/** Refuse paths that do not name something below the key directory. */
function checkRelative(file: string): void {
  if (path.isAbsolute(file)) {
    throw new Error(`path must be relative to ${KEY_DIR_ENV}`);
  }
  if (Array.from(file).some((char) => char < " ")) {
    throw new Error("path must not contain control characters");
  }
  if (file.split(/[\\/]/).includes("..")) {
    throw new Error("path must not contain '..' segments");
  }
}

/**
 * Resolve `file` inside `dir`, following symlinks, and refuse a result
 * outside `dir` (a symlink that points out of it).
 */
async function resolveKeyFile(dir: string, file: string): Promise<string> {
  checkRelative(file);
  const resolved = await fsStep(fs.promises.realpath(path.resolve(dir, file)));
  if (!resolved.startsWith(dir + path.sep)) {
    throw new Error(`path resolves outside ${KEY_DIR_ENV}`);
  }
  return resolved;
}

/**
 * Await a file-system call; its error, which names the absolute path,
 * is replaced by {@link UNREADABLE}.
 */
async function fsStep<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch {
    throw new Error(UNREADABLE);
  }
}

/** Refuse anything but a regular file of at most the size limit. */
function checkFile(stats: fs.Stats): void {
  if (!stats.isFile()) throw new Error("path is not a regular file");
  if (stats.size > MAX_KEY_FILE_BYTES) {
    throw new Error(`Key file is larger than ${MAX_KEY_FILE_BYTES} bytes`);
  }
}

/**
 * Read a resolved key file. It is checked before opening (a directory
 * cannot be opened everywhere) and again through the open descriptor, so
 * a file swapped after the first check is still refused.
 */
async function readKeyFile(file: string): Promise<Buffer> {
  checkFile(await fsStep(fs.promises.stat(file)));
  const handle = await fsStep(fs.promises.open(file, OPEN_FLAGS));
  try {
    checkFile(await fsStep(handle.stat()));
    return await fsStep(handle.readFile());
  } finally {
    await handle.close();
  }
}

/** The value of one hex digit, or -1 if `byte` is not one. */
function hexDigit(byte: number): number {
  if (byte >= 0x30 && byte <= 0x39) return byte - 0x30;
  const lower = byte | 0x20;
  if (lower >= 0x61 && lower <= 0x66) return lower - 0x57;
  return -1;
}

/**
 * Decode hex bytes without making a string of them (a string cannot be
 * wiped). Returns undefined, with nothing left behind, if any byte is
 * not a hex digit.
 */
function decodeHex(text: Buffer): Buffer | undefined {
  const out = Buffer.alloc(text.length / 2);
  for (let i = 0; i < out.length; i++) {
    const high = hexDigit(text[2 * i]);
    const low = hexDigit(text[2 * i + 1]);
    if (high < 0 || low < 0) {
      out.fill(0);
      return undefined;
    }
    out[i] = high * 16 + low;
  }
  return out;
}

/** `bytes` without trailing ASCII whitespace (a final newline). */
function trimEnd(bytes: Buffer): Buffer {
  let end = bytes.length;
  while (end > 0 && " \t\r\n".includes(String.fromCharCode(bytes[end - 1]))) {
    end--;
  }
  return bytes.subarray(0, end);
}

/**
 * A raw 32-byte key: a file of exactly 32 bytes is binary; otherwise the
 * file must be 64 hex digits, optionally followed by whitespace.
 */
function rawSecret(bytes: Buffer): Buffer {
  if (bytes.length === RAW_KEY_BYTES) return Buffer.from(bytes);
  const text = trimEnd(bytes);
  const secret =
    text.length === 2 * RAW_KEY_BYTES ? decodeHex(text) : undefined;
  if (!secret) {
    throw new Error(
      "Unrecognised key file: expected a PKCS#8 PEM private key, 32 raw bytes, or 64 hex digits",
    );
  }
  return secret;
}

function rawKey(bytes: Buffer, kind: unknown): KeyMaterial {
  const secret = rawSecret(bytes);
  if (kind === "hmac-sha256") {
    return {
      kind: "hmac-sha256",
      secret,
      info: { bits: 256, source: SOURCE, usage: "crypto_sign, crypto_verify" },
    };
  }
  return symmetricKey(secret, SOURCE);
}

/** Store kind and public metadata for a parsed private key. */
function privateKeyKind(key: crypto.KeyObject): {
  kind: KeyKind;
  info: Record<string, unknown>;
} {
  const details = key.asymmetricKeyDetails as crypto.AsymmetricKeyDetails;
  switch (key.asymmetricKeyType) {
    case "ed25519":
      return { kind: "ed25519", info: {} };
    case "rsa":
      if (!RSA_MODULUS_LENGTHS.includes(Number(details.modulusLength))) {
        throw new Error(
          `Unsupported RSA modulus length (allowed: ${RSA_MODULUS_LENGTHS.join(", ")})`,
        );
      }
      return { kind: "rsa", info: { bits: details.modulusLength } };
    case "ec":
      if (!EC_CURVES.includes(String(details.namedCurve))) {
        throw new Error(
          `Unsupported EC curve (allowed: ${EC_CURVES.join(", ")})`,
        );
      }
      return { kind: "ecc", info: { curve: details.namedCurve } };
    default:
      throw new Error(
        `Unsupported private key type: ${key.asymmetricKeyType} (allowed: ed25519, rsa, ec)`,
      );
  }
}

function parsePrivateKey(bytes: Buffer): crypto.KeyObject {
  try {
    return crypto.createPrivateKey({ key: bytes, format: "pem" });
  } catch {
    throw new Error("Key file is not a valid PKCS#8 PEM private key");
  }
}

function pkcs8Key(bytes: Buffer): KeyMaterial {
  const privateKey = parsePrivateKey(bytes);
  const { kind, info } = privateKeyKind(privateKey);
  const publicKey = crypto.createPublicKey(privateKey);
  return asymmetric(
    kind,
    { privateKey, publicKey },
    { ...info, source: SOURCE },
  );
}

/** Parse a PEM file: unencrypted PKCS#8 private keys only. */
function pemKey(bytes: Buffer, kind: unknown): KeyMaterial {
  if (kind !== undefined) {
    throw new Error(
      "kind applies only to raw keys; a PEM key's type comes from the key",
    );
  }
  if (bytes.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")) {
    throw new Error(
      "Encrypted PKCS#8 keys are not supported: decrypt the key file first (openssl pkcs8 -nocrypt)",
    );
  }
  if (bytes.includes("-----BEGIN PRIVATE KEY-----")) return pkcs8Key(bytes);
  if (bytes.includes("PUBLIC KEY-----")) {
    throw new Error(
      "Public keys are not imported: pass the PEM to crypto_verify as publicKey instead",
    );
  }
  throw new Error(
    "Unsupported PEM block: only unencrypted PKCS#8 private keys ('BEGIN PRIVATE KEY') are imported",
  );
}

/** Key material from a key file's bytes. */
function parseKey(bytes: Buffer, kind: unknown): KeyMaterial {
  if (bytes.length !== RAW_KEY_BYTES && bytes.includes("-----BEGIN ")) {
    return pemKey(bytes, kind);
  }
  return rawKey(bytes, kind);
}

/**
 * `crypto_key_import`: load a key from a file below CRYPTO_MCP_KEY_DIR
 * into the key store and return its handle with public metadata only.
 */
export const importKey: ToolHandler = async (args: ToolArgs) => {
  const dir = await keyDirectory();
  const file = await resolveKeyFile(dir, String(args.path));
  const bytes = await readKeyFile(file);
  try {
    const material = parseKey(bytes, args.kind);
    return jsonResult(keyStore.describe(keyStore.add(material)));
  } finally {
    bytes.fill(0);
  }
};
