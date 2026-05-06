// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: useHash hook.
 *
 * Demonstrates hashing user input with SHA-256, SHA3-256, and BLAKE3.
 */

import React, { useState } from "react";
import { useHash } from "@sebastienrousseau/crypto-react";

export function HashDemo() {
  const { hash, digest, isHashing } = useHash("sha256");
  const [input, setInput] = useState("Hello, world!");

  return (
    <div>
      <h2>Hash</h2>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button onClick={() => hash(input)} disabled={isHashing}>
        SHA-256
      </button>

      <button onClick={() => hash(input, "sha3-256")} disabled={isHashing}>
        SHA3-256
      </button>

      <button onClick={() => hash(input, "blake3")} disabled={isHashing}>
        BLAKE3
      </button>

      {digest && (
        <p>
          Digest: <code>{digest}</code>
        </p>
      )}
    </div>
  );
}

export default HashDemo;
