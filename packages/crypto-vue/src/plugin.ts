// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import type { App, InjectionKey } from "vue";

export interface CryptoPluginOptions {
  defaultKey?: string;
  serverUrl?: string;
  apiKey?: string;
}

export const CryptoSymbol: InjectionKey<CryptoPluginOptions> = Symbol("crypto");

export const CryptoPlugin = {
  install(app: App, options: CryptoPluginOptions = {}) {
    app.provide(CryptoSymbol, options);
  },
};
