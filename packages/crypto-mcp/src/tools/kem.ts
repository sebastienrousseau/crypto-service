// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
  MlKemLevel,
  hybridKemDecapsulate,
  hybridKemEncapsulate,
  mlKemDecap,
  mlKemEncap,
} from "@sebastienrousseau/crypto-lib";
import { keyStore, symmetricKey } from "./keystore";
import { ToolHandler, jsonResult } from "./result";

/*
 * ML-KEM (FIPS 203) and Hybrid KEM (RFC 9180/10024, X25519 + ML-KEM).
 * The shared secret is a 256-bit key: it goes into the key store as a
 * `symmetric-256` key, usable with crypto_encrypt, and only its handle
 * is returned.
 */

function resolveKemLevel(
  levelArg: unknown,
  defaultLevel: MlKemLevel = 768,
): MlKemLevel {
  const num = Number(levelArg);
  if (num === 512 || num === 768 || num === 1024) {
    return num;
  }
  return defaultLevel;
}

function inferLevelFromKey(keyKind: string): MlKemLevel {
  if (keyKind === "ml-kem-512") return 512;
  if (keyKind === "ml-kem-1024") return 1024;
  return 768;
}

/** `crypto_kem_encapsulate`: encapsulate to an ML-KEM public key (512, 768, 1024). */
export const kemEncapsulate: ToolHandler = async (args) => {
  const level = resolveKemLevel(args.level, 768);
  const { ciphertext, sharedSecret, algorithm } = mlKemEncap(
    level,
    String(args.publicKey),
  );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} encapsulation`,
    ),
  );
  return jsonResult({ algorithm, ciphertext, keyHandle });
};

/** `crypto_kem_decapsulate`: decapsulate with an ML-KEM key handle (512, 768, 1024). */
export const kemDecapsulate: ToolHandler = async (args) => {
  const key = keyStore.use(String(args.keyHandle), [
    "ml-kem-512",
    "ml-kem-768",
    "ml-kem-1024",
  ]);
  const defaultLevel = inferLevelFromKey(key.kind);
  const level = resolveKemLevel(args.level, defaultLevel);
  const { sharedSecret, algorithm } = mlKemDecap(
    level,
    (key.secret as Buffer).toString("hex"),
    String(args.ciphertext),
  );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} decapsulation`,
    ),
  );
  return jsonResult({ algorithm, keyHandle });
};

/** `crypto_hybrid_kem_encapsulate`: hybrid post-quantum encapsulation (X25519 + ML-KEM). */
export const hybridKemEncapsulateHandler: ToolHandler = async (args) => {
  const level = resolveKemLevel(args.level, 768);
  const { x25519EphemeralPublic, mlKemCiphertext, sharedSecret, algorithm } =
    hybridKemEncapsulate(
      level,
      String(args.x25519PublicKey),
      String(args.mlKemPublicKey),
    );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} encapsulation`,
    ),
  );
  return jsonResult({
    algorithm,
    x25519EphemeralPublic,
    mlKemCiphertext,
    keyHandle,
  });
};

/** `crypto_hybrid_kem_decapsulate`: hybrid post-quantum decapsulation (X25519 + ML-KEM). */
export const hybridKemDecapsulateHandler: ToolHandler = async (args) => {
  const xKey = keyStore.use(String(args.x25519KeyHandle), ["x25519"]);
  const kemKey = keyStore.use(String(args.mlKemKeyHandle), [
    "ml-kem-512",
    "ml-kem-768",
    "ml-kem-1024",
  ]);
  const defaultLevel = inferLevelFromKey(kemKey.kind);
  const level = resolveKemLevel(args.level, defaultLevel);
  const { sharedSecret, algorithm } = hybridKemDecapsulate(
    level,
    (xKey.secret as Buffer).toString("hex"),
    (kemKey.secret as Buffer).toString("hex"),
    String(args.x25519EphemeralPublic),
    String(args.mlKemCiphertext),
  );
  const keyHandle = keyStore.add(
    symmetricKey(
      Buffer.from(sharedSecret, "hex"),
      `${algorithm} decapsulation`,
    ),
  );
  return jsonResult({ algorithm, keyHandle });
};
