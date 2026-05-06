// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface CryptoContextValue {
  /** Hex-encoded default encryption key. */
  defaultKey?: string;
  /** Server URL for SDK-backed operations. */
  serverUrl?: string;
  /** API key for server authentication. */
  apiKey?: string;
}

const CryptoContext = createContext<CryptoContextValue>({});

export interface CryptoProviderProps extends CryptoContextValue {
  children: ReactNode;
}

/** Context provider for crypto configuration. */
export function CryptoProvider({ children, ...config }: CryptoProviderProps) {
  const value = useMemo(
    () => config,
    [config.defaultKey, config.serverUrl, config.apiKey],
  );
  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}

/** Access the crypto context. */
export function useCryptoContext(): CryptoContextValue {
  return useContext(CryptoContext);
}
