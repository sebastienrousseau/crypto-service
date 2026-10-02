#!/usr/bin/env node
/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { exitOnClosedPipe, main, processIO } from "./program/index";

exitOnClosedPipe(process.stdout, (code) => process.exit(code));

main(process.argv.slice(2), processIO(), () =>
  import("./menu").then((menu) => menu.runMenu()),
).then((code) => {
  process.exitCode = code;
});
