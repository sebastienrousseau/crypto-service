/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Strict parsing of numeric settings from the environment.
 *
 * `parseInt` reads `3000abc` as 3000 and `abc` as NaN; a setting that is
 * set is either a whole number in range or an error, never a guess.
 */

/**
 * A whole-number setting: `fallback` when unset or empty, otherwise
 * digits only, from `min` to `max`.
 *
 * @throws Error naming the setting, its range and the value given.
 */
export function integerSetting(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number = Number.MAX_SAFE_INTEGER,
): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(
      `${name} must be a whole number from ${min} to ${max}, got "${raw}"`,
    );
  }
  return value;
}
