// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Shared crypto configuration provided via React context.
 *
 * @example
 * ```tsx
 * const config: CryptoContextValue = { defaultKey: "ab01...", serverUrl: "https://api.example.com" };
 * ```
 */
export interface CryptoContextValue {
  /** Hex-encoded default encryption key. */
  defaultKey?: string;
  /**
   * Server URL for SDK-backed operations.
   *
   * @deprecated No hook reads it; it will be removed.
   */
  serverUrl?: string;
  /**
   * API key for server authentication.
   *
   * @deprecated No hook reads it, and an API key in a browser bundle is
   * public: authenticate users to your own backend instead. It will be
   * removed.
   */
  apiKey?: string;
}

const CryptoContext = createContext<CryptoContextValue>({});

/**
 * Props for the {@link CryptoProvider} component.
 *
 * @example
 * ```tsx
 * const props: CryptoProviderProps = { defaultKey: "ab01...", children: <App /> };
 * ```
 */
export interface CryptoProviderProps extends CryptoContextValue {
  /** Child components that can access the crypto context. */
  children: ReactNode;
}

/**
 * Context provider for crypto configuration.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <CryptoProvider defaultKey="ab01..." serverUrl="https://api.example.com">
 *       <MyComponent />
 *     </CryptoProvider>
 *   );
 * }
 * ```
 */
export function CryptoProvider({ children, ...config }: CryptoProviderProps) {
  const value = useMemo(
    () => config,
    [config.defaultKey, config.serverUrl, config.apiKey],
  );
  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}

/**
 * Access the crypto context.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { defaultKey, serverUrl } = useCryptoContext();
 *   return <span>{serverUrl}</span>;
 * }
 * ```
 */
export function useCryptoContext(): CryptoContextValue {
  return useContext(CryptoContext);
}
