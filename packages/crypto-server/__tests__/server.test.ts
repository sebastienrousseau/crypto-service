/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { init } from "../src/server";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("server bootstrap", function () {
  this.timeout(15_000);

  beforeEach(function () {
    delete process.env.JWT_SECRET;
  });

  it("rejects start without JWT_SECRET", async function () {
    await expect(init()).to.eventually.be.rejectedWith(/JWT_SECRET/);
  });

  it("rejects start with a too-short JWT_SECRET", async function () {
    process.env.JWT_SECRET = "too-short";
    await expect(init()).to.eventually.be.rejectedWith(/at least 32/);
  });

  it("boots and serves a plain semver version on /", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const res = await app.inject({ method: "GET", url: "/" });
      expect(res.statusCode).to.equal(200);
      const body = res.json();
      expect(body).to.have.property("version");
      // Regression guard for the LIB_VERSION double-stringify bug:
      // version must be a plain semver string, not a JSON-quoted string.
      expect(body.version).to.be.a("string");
      expect(body.version).to.match(/^\d+\.\d+\.\d+/);
      expect(body.version.startsWith('"')).to.equal(false);
    } finally {
      await app.close();
    }
  });

  it("rejects POST /v1/encrypt without a JWT", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/encrypt",
        payload: { message: "hi", encryptionKey: "fake" },
      });
      expect(res.statusCode).to.equal(401);
      expect(res.json()).to.deep.equal({ error: "unauthorized" });
    } finally {
      await app.close();
    }
  });

  it("rejects POST /v1/decrypt without a JWT", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/decrypt",
        payload: { encryptedMessage: "x", decryptionKey: { armored: "y" } },
      });
      expect(res.statusCode).to.equal(401);
    } finally {
      await app.close();
    }
  });

  it("validates body shape on /v1/generate (with a valid JWT)", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const token = app.jwt.sign({ sub: "tester" });
      // Empty body — should 400 from the JSON schema, not 500.
      const res = await app.inject({
        method: "POST",
        url: "/v1/generate",
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });
      expect(res.statusCode).to.equal(400);
    } finally {
      await app.close();
    }
  });

  it("exposes /health", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).to.equal(200);
    } finally {
      await app.close();
    }
  });

  it("rejects POST /v1/reformat without a JWT", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/reformat",
        payload: {
          privateKey: { armored: "x" },
          name: "n",
          email: "n@example.com",
        },
      });
      expect(res.statusCode).to.equal(401);
    } finally {
      await app.close();
    }
  });

  it("rejects POST /v1/session without a JWT", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/session",
        payload: { encryptionKey: "x", name: "n", email: "n@example.com" },
      });
      expect(res.statusCode).to.equal(401);
    } finally {
      await app.close();
    }
  });

  it("validates POST /v1/reformat body shape", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const token = app.jwt.sign({ sub: "tester" });
      const res = await app.inject({
        method: "POST",
        url: "/v1/reformat",
        headers: { authorization: `Bearer ${token}` },
        payload: {}, // missing privateKey/name/email
      });
      expect(res.statusCode).to.equal(400);
    } finally {
      await app.close();
    }
  });

  it("validates POST /v1/session body shape", async function () {
    process.env.JWT_SECRET = "x".repeat(32);
    const app = await init();
    try {
      const token = app.jwt.sign({ sub: "tester" });
      const res = await app.inject({
        method: "POST",
        url: "/v1/session",
        headers: { authorization: `Bearer ${token}` },
        payload: { encryptionKey: "x" }, // missing name/email
      });
      expect(res.statusCode).to.equal(400);
    } finally {
      await app.close();
    }
  });
});
