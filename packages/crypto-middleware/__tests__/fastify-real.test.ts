/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The plugin on a real Fastify instance (the other Fastify tests use a
// mock): registration must succeed on the Fastify major the suite ships
// with, and encrypt-response must round-trip through decryptPayload.

import { expect } from "chai";
import Fastify from "fastify";
import { cryptoPlugin } from "../src/fastify";
import { decryptPayload } from "../src/common";

const KEY = "aa".repeat(32);

describe("Fastify plugin on a real Fastify instance", () => {
  it("registers and encrypts responses", async () => {
    const app = Fastify();
    await app.register(cryptoPlugin, {
      key: KEY,
      routes: ["/api/**"],
      operations: ["encrypt-response"],
    });
    app.get("/api/data", async () => ({ hello: "world" }));

    const res = await app.inject({ method: "GET", url: "/api/data" });
    await app.close();

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.not.include("world");
    const { encrypted } = res.json<{ encrypted: string }>();
    const opened = decryptPayload(KEY, encrypted);
    expect(opened).to.deep.equal({ hello: "world" });
  });
});
