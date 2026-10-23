/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Shared helpers for tests that need environment overrides and
 * hand-minted JWTs.
 */

import { createHmac } from "crypto";

/** HS256 secret used by {@link JWT_ENV} and {@link mint}. */
export const SECRET = "k".repeat(32);

/** Environment for a server that accepts JWTs signed with {@link SECRET}. */
export const JWT_ENV: Record<string, string | undefined> = {
  JWT_SECRET: SECRET,
  JWT_ISSUER: "https://issuer.example",
  JWT_AUDIENCE: "crypto-server",
  JWT_MAX_AGE: "600",
  CRYPTO_API_KEY: undefined,
  ALLOW_ANONYMOUS: undefined,
};

const b64url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** Mint an HS256 token with exactly the given claims. */
export function mint(claims: Record<string, unknown>): string {
  const input = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(claims)}`;
  const sig = createHmac("sha256", SECRET).update(input).digest("base64url");
  return `${input}.${sig}`;
}

/** Claims that pass every JWT check under {@link JWT_ENV}. */
export function claims(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: "svc",
    scopes: ["crypto:admin"],
    iss: JWT_ENV["JWT_ISSUER"],
    aud: JWT_ENV["JWT_AUDIENCE"],
    iat: now,
    exp: now + 300,
    ...overrides,
  };
}

/** Authorization header for a token for `sub` with `scopes`. */
export function bearer(
  sub: string,
  scopes: string[] = ["crypto:admin"],
): { authorization: string } {
  return { authorization: `Bearer ${mint(claims({ sub, scopes }))}` };
}

/** Run `fn` with env overrides, restoring the previous values after. */
export async function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const saved = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]]),
  );
  const apply = (v: Record<string, string | undefined>): void => {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  };
  apply(vars);
  try {
    return await fn();
  } finally {
    apply(saved);
  }
}
