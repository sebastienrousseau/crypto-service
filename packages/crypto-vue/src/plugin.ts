// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type { App, InjectionKey } from "vue";

/**
 * Configuration options for the CryptoPlugin.
 *
 * @example
 * ```ts
 * const opts: CryptoPluginOptions = {
 *   defaultKey: "ab".repeat(32),
 *   serverUrl: "https://crypto.example.com",
 * };
 * ```
 */
export interface CryptoPluginOptions {
  /** Default symmetric encryption key (hex-encoded) used when none is passed explicitly. */
  defaultKey?: string;
  /** Base URL of the crypto-server instance for remote operations. */
  serverUrl?: string;
  /** API key for authenticating with the crypto-server. */
  apiKey?: string;
}

/**
 * Vue injection key used to provide/inject {@link CryptoPluginOptions}.
 *
 * @example
 * ```ts
 * const opts = inject(CryptoSymbol, {});
 * ```
 */
export const CryptoSymbol: InjectionKey<CryptoPluginOptions> = Symbol("crypto");

/**
 * Vue plugin that provides crypto configuration to all descendant components.
 *
 * @example
 * ```ts
 * import { createApp } from "vue";
 * const app = createApp(App);
 * app.use(CryptoPlugin, { defaultKey: "ab".repeat(32) });
 * ```
 */
export const CryptoPlugin = {
  /** Install the plugin into the Vue application, providing options via {@link CryptoSymbol}. */
  install(app: App, options: CryptoPluginOptions = {}) {
    app.provide(CryptoSymbol, options);
  },
};
