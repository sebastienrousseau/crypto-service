// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: useKeypair hook.
 *
 * Demonstrates generating Ed25519 and ML-DSA-65 key pairs from a React
 * component.
 */

import React from "react";
import { useKeypair } from "@sebastienrousseau/crypto-react";

export function KeygenDemo() {
  const { publicKey, privateKey, algorithm, generate, isGenerating } =
    useKeypair("ed25519");

  return (
    <div>
      <h2>Key Pair Generator</h2>

      <button onClick={() => generate()} disabled={isGenerating}>
        Generate Ed25519
      </button>

      <button onClick={() => generate("ml-dsa-65")} disabled={isGenerating}>
        Generate ML-DSA-65
      </button>

      {algorithm && (
        <dl>
          <dt>Algorithm</dt>
          <dd>{algorithm}</dd>
          <dt>Public Key</dt>
          <dd>
            <code>{publicKey?.slice(0, 64)}...</code>
          </dd>
          <dt>Private Key</dt>
          <dd>
            <code>{privateKey?.slice(0, 16)}...</code>
          </dd>
        </dl>
      )}
    </div>
  );
}

export default KeygenDemo;
