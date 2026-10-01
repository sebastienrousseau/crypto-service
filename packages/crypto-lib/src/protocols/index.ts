/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks Protocol building blocks barrel export.
 *
 * Phase 6 — composable cryptographic protocol primitives:
 * - PQXDH: Post-Quantum Extended Triple Diffie-Hellman (Signal-style)
 * - Double Ratchet: Forward-secret messaging with PQ upgrades
 * - PAKE: OPAQUE-3DH password-authenticated key exchange (RFC 9807)
 * - Threshold: Shamir Secret Sharing + Feldman VSS
 */

export * as pqxdh from "./pqxdh";
export * as ratchet from "./ratchet";
export * as pake from "./pake";
export * as threshold from "./threshold";
export * as iso20022 from "./iso20022";
export * from "./iso20022";
