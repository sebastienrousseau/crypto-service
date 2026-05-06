// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: useSignature hook.
 *
 * Demonstrates signing a message with Ed25519 and verifying the resulting
 * signature. In a real app the private key would come from a secure store,
 * not be hard-coded.
 */

import React, { useState } from "react";
import { useKeypair, useSignature } from "@sebastienrousseau/crypto-react";

export function SignDemo() {
  const { publicKey, privateKey, generate } = useKeypair("ed25519");
  const { sign, verify, signature, isValid, isProcessing } = useSignature();
  const [message, setMessage] = useState("Sign me!");

  return (
    <div>
      <h2>Sign / Verify</h2>

      {!publicKey && (
        <button onClick={() => generate()}>Generate Ed25519 Key Pair</button>
      )}

      {publicKey && privateKey && (
        <>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            onClick={() => sign(privateKey, message)}
            disabled={isProcessing}
          >
            Sign
          </button>

          {signature && (
            <>
              <p>
                Signature: <code>{signature.slice(0, 40)}...</code>
              </p>
              <button
                onClick={() => verify(publicKey, message, signature)}
                disabled={isProcessing}
              >
                Verify
              </button>
            </>
          )}

          {isValid !== null && (
            <p>Valid: <strong>{isValid ? "Yes" : "No"}</strong></p>
          )}
        </>
      )}
    </div>
  );
}

export default SignDemo;
