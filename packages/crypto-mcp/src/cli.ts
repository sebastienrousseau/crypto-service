#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { CryptoMcpServer } from "./server";

export function run(): void {
  const server = new CryptoMcpServer();
  server.listenStdio(process.stdin, process.stdout);
}

/* c8 ignore start */
if (require.main === module) {
  run();
}
/* c8 ignore stop */
