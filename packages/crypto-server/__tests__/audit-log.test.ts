/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * Audit logging. Key generation, export and deletion, KMS operations and
 * OPAQUE registration left no record of who did what: the request log
 * line has the URL and status but no principal or key. Each now writes
 * one `audit` line with the action, principal, status and the key or
 * provider it touched, whether it succeeded or was refused, and never
 * the key material.
 */
import { expect } from "chai";
import { Writable } from "stream";
import type { FastifyInstance } from "fastify";
import { init } from "../src/server";
import { JWT_ENV, bearer } from "./support/auth";

interface AuditRecord {
  action: string;
  principal: string;
  status: number;
  outcome: string;
  keyId?: string;
  provider?: string;
}

describe("audit log", function () {
  this.timeout(60000);
  const lines: Record<string, unknown>[] = [];
  let app: FastifyInstance;
  let restore: () => void;

  before(async () => {
    const saved = { ...process.env };
    Object.assign(process.env, { ...JWT_ENV, ALLOW_ANONYMOUS: "" });
    delete process.env["CRYPTO_API_KEY"];
    restore = () => {
      process.env = saved;
    };
    const stream = new Writable({
      write(chunk, _enc, done) {
        for (const line of String(chunk).split("\n").filter(Boolean)) {
          lines.push(JSON.parse(line));
        }
        done();
      },
    });
    app = await init({ logger: { level: "info", stream } });
  });
  after(async () => {
    await app.close();
    restore();
  });

  const audits = (): AuditRecord[] =>
    lines.filter((l) => l["audit"]).map((l) => l["audit"] as AuditRecord);
  const post = (url: string, sub: string, payload: object) =>
    app.inject({ method: "POST", url, headers: bearer(sub), payload });

  it("records a key generation with its key ID, not its key", async () => {
    lines.length = 0;
    const res = await post("/v2/keys/generate", "alice", {
      algorithm: "ed25519",
    });
    const keyId = res.json().data.keyId as string;
    expect(audits()).to.deep.equal([
      {
        action: "POST /v2/keys/generate",
        principal: "alice",
        status: 200,
        outcome: "success",
        keyId,
      },
    ]);
    const text = JSON.stringify(lines);
    expect(text).to.not.include(res.json().data.publicKey);
  });

  it("records a refused export of another principal's key", async () => {
    const gen = await post("/v2/keys/generate", "alice", {
      algorithm: "ed25519",
    });
    const keyId = gen.json().data.keyId as string;
    lines.length = 0;
    const res = await app.inject({
      method: "POST",
      url: "/v2/keys/export",
      headers: bearer("mallory", ["crypto:keys:export"]),
      payload: { keyId },
    });
    expect(res.statusCode).to.equal(404);
    expect(audits()).to.deep.equal([
      {
        action: "POST /v2/keys/export",
        principal: "mallory",
        status: res.statusCode,
        outcome: "failure",
        keyId,
      },
    ]);
  });

  it("names the principal of a request refused for its scope", async () => {
    lines.length = 0;
    const res = await post("/v2/keys/export", "alice", { keyId: "k_x" });
    expect(res.statusCode).to.equal(403);
    expect(audits()[0]).to.include({
      action: "POST /v2/keys/export",
      principal: "alice",
      status: 403,
      outcome: "failure",
    });
  });

  it("records KMS operations with their provider", async () => {
    lines.length = 0;
    await post("/v2/kms/create-key", "alice", { provider: "local" });
    expect(audits()[0]).to.include({
      action: "POST /v2/kms/create-key",
      principal: "alice",
      provider: "local",
      outcome: "success",
    });
  });

  it("records an unauthenticated attempt", async () => {
    lines.length = 0;
    await app.inject({
      method: "POST",
      url: "/v2/keys/delete",
      payload: { keyId: "k_x" },
    });
    expect(audits()[0]).to.include({
      action: "POST /v2/keys/delete",
      principal: "unauthenticated",
      status: 401,
      outcome: "failure",
    });
  });

  it("does not record routes that touch no key", async () => {
    lines.length = 0;
    await post("/v2/hash", "alice", { algorithm: "sha256", data: "x" });
    expect(audits()).to.deep.equal([]);
  });

  it("ignores a keyId that is not an identifier", async () => {
    lines.length = 0;
    await post("/v2/keys/delete", "alice", { keyId: "x".repeat(300) });
    expect(audits()[0]).to.not.have.property("keyId");
  });

  it("is written at info, like request logs", async () => {
    lines.length = 0;
    await post("/v2/keys/generate", "alice", { algorithm: "ed25519" });
    const line = lines.find((l) => l["audit"])!;
    expect(line["level"]).to.equal(30);
    expect(line["msg"]).to.equal("audit");
    expect(line["reqId"]).to.be.a("string");
  });
});
