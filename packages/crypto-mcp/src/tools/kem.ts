// SPDX-License-Identifier: Apache-2.0 OR MIT

import { mlKemDecap, mlKemEncap } from "@sebastienrousseau/crypto-lib";
import { keyStore, symmetricKey } from "./keystore";
import { ToolHandler, jsonResult } from "./result";

/*
 * ML-KEM-768 (FIPS 203). The shared secret is a 256-bit key: it goes
 * into the key store as a `symmetric-256` key, usable with
 * crypto_encrypt, and only its handle is returned.
 */

/** `crypto_kem_encapsulate`: encapsulate to an ML-KEM-768 public key. */
export const kemEncapsulate: ToolHandler = async (args) => {
  const { ciphertext, sharedSecret, algorithm } = mlKemEncap(
    768,
    String(args.publicKey),
  );
  const keyHandle = keyStore.add(
    symmetricKey(Buffer.from(sharedSecret, "hex"), "ml-kem-768 encapsulation"),
  );
  return jsonResult({ algorithm, ciphertext, keyHandle });
};

/** `crypto_kem_decapsulate`: decapsulate with an ML-KEM-768 key handle. */
export const kemDecapsulate: ToolHandler = async (args) => {
  const key = keyStore.use(String(args.keyHandle), ["ml-kem-768"]);
  const { sharedSecret, algorithm } = mlKemDecap(
    768,
    (key.secret as Buffer).toString("hex"),
    String(args.ciphertext),
  );
  const keyHandle = keyStore.add(
    symmetricKey(Buffer.from(sharedSecret, "hex"), "ml-kem-768 decapsulation"),
  );
  return jsonResult({ algorithm, keyHandle });
};
