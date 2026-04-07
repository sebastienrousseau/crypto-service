/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import "fastify";

/**
 * Decorator added by `@fastify/jwt` integration in `server.ts`.
 * Plugged into preHandler hooks to gate routes behind a valid JWT.
 */
declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }
}

export type ArmoredPrivateKeyBody = {
  armored: string;
  passphrase?: string;
};

export type EncryptBody = {
  message: string;
  encryptionKey: string;
  signingKey?: ArmoredPrivateKeyBody;
};

export type DecryptBody = {
  encryptedMessage: string;
  decryptionKey: ArmoredPrivateKeyBody;
  verificationKey?: string;
};

export type GenerateBody = {
  name: string;
  email: string;
  passphrase?: string;
  type?: "rsa" | "ecc";
  rsaBits?: number;
  curve?: string;
  keyExpirationTime?: number;
};

export type RevokeBody = {
  privateKey: ArmoredPrivateKeyBody;
  reason?: { flag?: number; string?: string };
};

export type SignBody = {
  message: string;
  signingKey: ArmoredPrivateKeyBody;
  detached?: boolean;
};

export type VerifyBody = {
  message: string;
  verificationKey: string;
  signature?: string;
  date?: string;
};

export type ReformatBody = {
  privateKey: ArmoredPrivateKeyBody;
  name: string;
  email: string;
  keyExpirationTime?: number;
};

export type SessionBody = {
  encryptionKey: string;
  name: string;
  email: string;
};
