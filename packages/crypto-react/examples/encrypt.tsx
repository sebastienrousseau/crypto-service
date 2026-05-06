// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: useEncrypt hook.
 *
 * Demonstrates encrypting and decrypting a message with a symmetric key
 * via the secretbox (XChaCha20-Poly1305) API.
 */

import React, { useState } from "react";
import { CryptoProvider, useEncrypt } from "@sebastienrousseau/crypto-react";

function EncryptPanel() {
  const { encrypt, decrypt, ciphertext, plaintext, isProcessing } =
    useEncrypt();
  const [input, setInput] = useState("Hello, crypto world!");

  return (
    <div>
      <h2>Encrypt / Decrypt</h2>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button onClick={() => encrypt(input)} disabled={isProcessing}>
        Encrypt
      </button>

      {ciphertext && (
        <>
          <p>
            Ciphertext: <code>{ciphertext.slice(0, 40)}...</code>
          </p>
          <button onClick={() => decrypt(ciphertext)} disabled={isProcessing}>
            Decrypt
          </button>
        </>
      )}

      {plaintext && (
        <p>
          Decrypted: <strong>{plaintext}</strong>
        </p>
      )}
    </div>
  );
}

/** Wrap with CryptoProvider to supply a default key. */
export function EncryptDemo() {
  return (
    <CryptoProvider defaultKey="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2">
      <EncryptPanel />
    </CryptoProvider>
  );
}

export default EncryptDemo;
