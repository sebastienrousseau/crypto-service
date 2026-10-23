/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The @noble/post-quantum objects the native back end is compared with.
export {
  ml_kem512,
  ml_kem768,
  ml_kem1024,
} from "@noble/post-quantum/ml-kem.js";
export { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
export {
  slh_dsa_sha2_128f,
  slh_dsa_sha2_128s,
  slh_dsa_sha2_192f,
  slh_dsa_sha2_192s,
  slh_dsa_sha2_256f,
  slh_dsa_sha2_256s,
  slh_dsa_shake_128f,
  slh_dsa_shake_128s,
  slh_dsa_shake_192f,
  slh_dsa_shake_192s,
  slh_dsa_shake_256f,
  slh_dsa_shake_256s,
} from "@noble/post-quantum/slh-dsa.js";
