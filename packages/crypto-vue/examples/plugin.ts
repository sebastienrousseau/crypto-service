// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

/**
 * @file CryptoPlugin installation demo.
 *
 * Demonstrates installing the Vue plugin with global options.
 *
 * ```ts
 * // main.ts
 * import { createApp } from "vue";
 * import { CryptoPlugin } from "@sebastienrousseau/crypto-vue";
 * import App from "./App.vue";
 *
 * const app = createApp(App);
 *
 * app.use(CryptoPlugin, {
 *   serverUrl: "https://api.example.com",
 *   apiKey: "your-api-key",
 *   defaultKey: "your-256-bit-hex-key",
 * });
 *
 * app.mount("#app");
 * ```
 *
 * Composables automatically pick up the injected options:
 *
 * ```ts
 * // MyComponent.vue
 * import { useEncrypt } from "@sebastienrousseau/crypto-vue";
 *
 * // The defaultKey from CryptoPlugin is used if no key is passed
 * const { encrypt, decrypt, ciphertext, plaintext } = useEncrypt();
 * ```
 */

import { CryptoPlugin } from "../src";

console.log("CryptoPlugin:", CryptoPlugin);
console.log(
  "Install the plugin with: app.use(CryptoPlugin, { serverUrl, apiKey, defaultKey })",
);
