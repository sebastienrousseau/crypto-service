// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file Example: CryptoProvider setup.
 *
 * Wrap your application (or a subtree) with CryptoProvider to supply
 * a default encryption key, server URL, or API key to all hooks below.
 */

import React from "react";
import { CryptoProvider } from "@sebastienrousseau/crypto-react";

function App() {
  return (
    <CryptoProvider
      defaultKey="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
      serverUrl="https://crypto.example.com"
      apiKey="my-api-key"
    >
      <h1>My Crypto App</h1>
      {/* child components can now call useCryptoContext() */}
    </CryptoProvider>
  );
}

export default App;
