// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import { CryptoLspServer } from "../src";

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as { version: string };

describe("Crypto LSP version reporting", () => {
  it("reports the package.json version in serverInfo", async () => {
    const server = new CryptoLspServer();
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });
    const result = res?.result as { serverInfo: { version: string } };
    expect(result.serverInfo.version).to.equal(pkg.version);
  });
});
