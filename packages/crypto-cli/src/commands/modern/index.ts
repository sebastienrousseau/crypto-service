/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import handleModernKeygen from "./keygen.command";
import handleModernHash from "./hash.command";
import handleModernEncrypt from "./encrypt.command";
import handleModernSign from "./sign.command";
import handlePasswordHash from "./password-hash.command";

export const ModernCommand = {
  handleModernKeygen,
  handleModernHash,
  handleModernEncrypt,
  handleModernSign,
  handlePasswordHash,
};
