/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Post-quantum hybrid streaming adapters for Edge runtimes.
 *
 * Provides WHATWG stream and Request/Response helpers for Cloudflare Workers,
 * Vercel Edge, Deno, Bun, and browser service workers using post-quantum
 * hybrid STREAM AEAD (X25519 + ML-KEM-768 + XChaCha20-Poly1305).
 */

import {
  createPqEncryptStream,
  createPqDecryptStream,
  streamPqDecrypt,
  streamPqEncrypt,
  type CryptoTransformStream,
} from "@sebastienrousseau/crypto-lib/streaming";
import { wipeMemory } from "@sebastienrousseau/crypto-lib";

/** Recipient public keys for post-quantum hybrid streaming encryption. */
export interface EdgePqRecipientPublicKeys {
  /** Recipient X25519 public key (32 bytes; hex string or Uint8Array). */
  recipientX25519Public: string | Uint8Array;
  /** Recipient ML-KEM-768 public key (1184 bytes; hex string or Uint8Array). */
  recipientMlKemPublic: string | Uint8Array;
  /** Chunk size in bytes (default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
}

/** Recipient secret keys for post-quantum hybrid streaming decryption. */
export interface EdgePqRecipientSecretKeys {
  /** Recipient X25519 secret key (32 bytes; hex string or Uint8Array). */
  recipientX25519Secret: string | Uint8Array;
  /** Recipient ML-KEM-768 secret key (2400 bytes; hex string or Uint8Array). */
  recipientMlKemSecret: string | Uint8Array;
  /** Chunk size used during encryption (default: 65536 = 64 KiB). */
  chunkSize?: number | undefined;
}

/**
 * Create a WHATWG TransformStream that encrypts data using post-quantum hybrid STREAM AEAD.
 *
 * @param recipient - Recipient public keys and optional chunk size.
 * @returns A TransformStream accepting plaintext chunks and emitting ciphertext chunks.
 */
export function createEdgePqEncryptStream(
  recipient: EdgePqRecipientPublicKeys,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  return createPqEncryptStream({
    recipientX25519Public: recipient.recipientX25519Public,
    recipientMlKemPublic: recipient.recipientMlKemPublic,
    chunkSize: recipient.chunkSize,
  });
}

/**
 * Create a WHATWG TransformStream that decrypts post-quantum hybrid STREAM AEAD ciphertext.
 *
 * @param recipient - Recipient secret keys and optional chunk size.
 * @returns A TransformStream accepting ciphertext chunks and emitting plaintext chunks.
 */
export function createEdgePqDecryptStream(
  recipient: EdgePqRecipientSecretKeys,
): CryptoTransformStream<Uint8Array, Uint8Array> {
  return createPqDecryptStream({
    recipientX25519Secret: recipient.recipientX25519Secret,
    recipientMlKemSecret: recipient.recipientMlKemSecret,
    chunkSize: recipient.chunkSize,
  });
}

function buildEncryptedHeaders(baseHeaders?: HeadersInit | undefined): Headers {
  const headers = new Headers(baseHeaders);
  headers.set("content-type", "application/octet-stream");
  return headers;
}

/**
 * Wrap a WHATWG Response with post-quantum hybrid streaming AEAD encryption.
 *
 * Pipes the original response body through a post-quantum encryption transform stream,
 * updating the Content-Type header to application/octet-stream.
 *
 * @param response - The outgoing Edge Response to encrypt.
 * @param recipient - Recipient public keys and optional chunk size.
 * @param init - Optional ResponseInit overrides.
 * @returns A new encrypted Response.
 */
export function encryptEdgeResponse(
  response: Response,
  recipient: EdgePqRecipientPublicKeys,
  init?: ResponseInit | undefined,
): Response {
  const headers = buildEncryptedHeaders(init?.headers ?? response.headers);
  const status = init?.status ?? response.status;
  const statusText = init?.statusText ?? response.statusText;

  if (!response.body) {
    const emptyResult = streamPqEncrypt({
      recipientX25519Public: recipient.recipientX25519Public,
      recipientMlKemPublic: recipient.recipientMlKemPublic,
      plaintext: new Uint8Array(0),
      chunkSize: recipient.chunkSize,
    });
    return new Response(emptyResult.ciphertext as unknown as BodyInit, {
      status,
      statusText,
      headers,
    });
  }

  const encryptStream = createEdgePqEncryptStream(recipient);
  const encryptedBody = (
    response.body as unknown as {
      pipeThrough: (pair: unknown) => ReadableStream<Uint8Array>;
    }
  ).pipeThrough(encryptStream);

  return new Response(encryptedBody as unknown as BodyInit, {
    status,
    statusText,
    headers,
  });
}

/**
 * Decrypt the full payload of an incoming post-quantum encrypted Edge Request.
 *
 * Reads the request body as an ArrayBuffer, decrypts the post-quantum STREAM AEAD
 * ciphertext, zeroes the intermediate ciphertext buffer in memory, and returns the plaintext.
 *
 * @param request - Incoming Edge Request containing encrypted payload.
 * @param recipient - Recipient secret keys.
 * @returns Decrypted plaintext bytes.
 */
export async function decryptEdgeRequest(
  request: Request,
  recipient: EdgePqRecipientSecretKeys,
): Promise<Uint8Array> {
  const buffer = await request.arrayBuffer();
  const ciphertext = new Uint8Array(buffer);
  try {
    return streamPqDecrypt({
      recipientX25519Secret: recipient.recipientX25519Secret,
      recipientMlKemSecret: recipient.recipientMlKemSecret,
      ciphertext,
      chunkSize: recipient.chunkSize,
    });
  } finally {
    wipeMemory(ciphertext);
  }
}

/**
 * Wrap an incoming Edge Request with a decrypted readable stream body.
 *
 * Pipes the request body through the post-quantum decryption transform stream
 * and returns a new Request with the plaintext body.
 *
 * @param request - Incoming Edge Request with encrypted stream.
 * @param recipient - Recipient secret keys.
 * @returns A cloned Request with a decrypted body stream.
 */
export function createDecryptedEdgeRequest(
  request: Request,
  recipient: EdgePqRecipientSecretKeys,
): Request {
  if (!request.body) {
    return new Request(request);
  }

  const decryptStream = createEdgePqDecryptStream(recipient);
  const decryptedBody = (
    request.body as unknown as {
      pipeThrough: (pair: unknown) => ReadableStream<Uint8Array>;
    }
  ).pipeThrough(decryptStream);

  return new Request(request, {
    body: decryptedBody as unknown as BodyInit,
    duplex: "half",
  } as RequestInit);
}
