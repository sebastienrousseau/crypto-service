// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { useState, useCallback } from "react";
import {
  hash as computeHash,
  type HashAlgorithm,
} from "@sebastienrousseau/crypto-lib/dist/modern/hash";

/**
 * Return type of the {@link useHash} hook.
 *
 * @example
 * ```tsx
 * const { hash, digest, isHashing }: UseHashResult = useHash();
 * ```
 */
export interface UseHashResult {
  /** Compute a cryptographic hash digest. Returns the hex-encoded digest. */
  hash: (data: string | Uint8Array, algorithm?: HashAlgorithm) => string;
  /** The last computed hex-encoded digest. */
  digest: string | null;
  /** True while a hash is being computed. */
  isHashing: boolean;
}

/**
 * React hook for computing cryptographic hashes.
 *
 * @param defaultAlgorithm - Algorithm to use when none is passed to `hash()`. Defaults to `"sha256"`.
 *
 * @example
 * ```tsx
 * function Hasher() {
 *   const { hash, digest } = useHash("sha512");
 *   return <button onClick={() => hash("hello")}>{digest ?? "Hash it"}</button>;
 * }
 * ```
 */
export function useHash(
  defaultAlgorithm: HashAlgorithm = "sha256",
): UseHashResult {
  const [digest, setDigest] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  const hash = useCallback(
    (data: string | Uint8Array, algorithm?: HashAlgorithm): string => {
      setIsHashing(true);
      try {
        const result = computeHash({
          algorithm: algorithm ?? defaultAlgorithm,
          data,
        });
        setDigest(result.digest);
        return result.digest;
      } finally {
        setIsHashing(false);
      }
    },
    [defaultAlgorithm],
  );

  return { hash, digest, isHashing };
}
