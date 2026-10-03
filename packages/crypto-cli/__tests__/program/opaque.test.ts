/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { protocols } from "@sebastienrousseau/crypto-lib";
import { EXIT } from "../../src/program/index";
import { runCli } from "./helpers";

const { pake } = protocols;

describe("OPAQUE CLI (crypto-cli opaque)", function () {
  this.timeout(60000);

  const tempDir = path.join(os.tmpdir(), `crypto-cli-opaque-${process.pid}`);
  const at = (name: string) => path.join(tempDir, name);
  let pwdFile: string;
  let emptyPwdFile: string;

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    pwdFile = at("password.txt");
    fs.writeFileSync(pwdFile, "correct-password\n", { mode: 0o600 });
    emptyPwdFile = at("empty.txt");
    fs.writeFileSync(emptyPwdFile, "", { mode: 0o600 });
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("opaque setup", () => {
    it("generates P256-SHA256 server setup as formatted text", async () => {
      const res = await runCli(["opaque", "setup"]);
      expect(res.code).to.equal(EXIT.OK);
      expect(res.stdout).to.include("OPAQUE Server Setup (P256-SHA256):");
      expect(res.stdout).to.include("Server Public Key:");
      expect(res.stdout).to.include("Server Private Key:");
      expect(res.stdout).to.include("OPRF Seed:");
      expect(res.stdout).to.include("Fake Record:");
    });

    it("generates ristretto255-SHA512 server setup as JSON", async () => {
      const res = await runCli([
        "opaque",
        "setup",
        "--suite",
        "ristretto255-SHA512",
        "--json",
      ]);
      expect(res.code).to.equal(EXIT.OK);
      const data = JSON.parse(res.stdout);
      expect(data.suite).to.equal("ristretto255-SHA512");
      expect(data).to.have.property("serverPublicKey");
      expect(data).to.have.property("serverPrivateKey");
      expect(data).to.have.property("oprfSeed");
      expect(data).to.have.property("fakeRecord");
    });
  });

  describe("password input modes and validation", () => {
    it("fails with usage error when no password source and no TTY prompt", async () => {
      const res = await runCli(["opaque", "register", "alice@example.com"]);
      expect(res.code).to.equal(EXIT.USAGE);
      expect(res.stderr).to.include("missing password");
    });

    it("fails when password from prompt does not match confirmation", async () => {
      let promptCount = 0;
      const patch = {
        promptSecret: async () => {
          promptCount++;
          return promptCount === 1 ? "pass1" : "pass2";
        },
      };
      const res = await runCli(
        ["opaque", "register", "alice@example.com"],
        [],
        patch,
      );
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include("passwords do not match");
    });

    it("fails when password file is empty", async () => {
      const res = await runCli([
        "opaque",
        "register",
        "alice@example.com",
        "--password-file",
        emptyPwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include("password is empty");
    });

    it("fails when prompt is cancelled", async () => {
      const patch = {
        promptSecret: async () => undefined,
      };
      const res = await runCli(["opaque", "login", "alice"], [], patch);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include("the password is empty");
    });

    it("reads password from stdin", async () => {
      const originalFetch = globalThis.fetch;
      try {
        const setup = pake.createServerSetup();
        globalThis.fetch = async (
          url: string | URL | Request,
          init?: RequestInit,
        ) => {
          const urlStr = url.toString();
          const body = JSON.parse((init?.body as string) ?? "{}");
          if (urlStr.includes("/v2/opaque/register/init")) {
            const reqBytes = new Uint8Array(Buffer.from(body.request, "hex"));
            const regReq = pake.deserializeRegistrationRequest(reqBytes);
            const regRes = pake.createRegistrationResponse(
              regReq,
              setup.serverPublicKey,
              "alice",
              setup.oprfSeed,
            );
            return new Response(
              JSON.stringify({
                data: {
                  response: Buffer.from(
                    pake.serializeRegistrationResponse(regRes),
                  ).toString("hex"),
                },
              }),
              { status: 200 },
            );
          }
          return new Response(
            JSON.stringify({ data: { status: "registered" } }),
            { status: 200 },
          );
        };

        const res = await runCli(
          ["opaque", "register", "alice", "--password-stdin", "--json"],
          ["test-password\n"],
        );
        expect(res.code).to.equal(EXIT.OK);
        const data = JSON.parse(res.stdout);
        expect(data.status).to.equal("registered");
        expect(data.credentialIdentifier).to.equal("alice");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("HTTP error handling and edge cases", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("handles connection error to server", async () => {
      globalThis.fetch = async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:3000");
      };
      const res = await runCli([
        "opaque",
        "register",
        "alice",
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include("failed to connect to server");
    });

    it("handles non-JSON error response from server", async () => {
      globalThis.fetch = async () =>
        new Response("Bad Gateway", { status: 502 });
      const res = await runCli([
        "opaque",
        "register",
        "alice",
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include(
        "server returned non-JSON response (HTTP 502)",
      );
    });

    it("handles RFC 9457 error response from server", async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            type: "urn:crypto-service:problem:invalid-input",
            title: "Invalid input",
            status: 400,
            detail: "Rate limit exceeded",
          }),
          { status: 400 },
        );
      const res = await runCli([
        "opaque",
        "register",
        "alice",
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include(
        "OPAQUE server error (400): Rate limit exceeded",
      );
    });

    it("falls back to title when detail is missing in server error", async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            title: "Bad Request",
            status: 400,
          }),
          { status: 400 },
        );
      const res = await runCli([
        "opaque",
        "register",
        "alice",
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include("OPAQUE server error (400): Bad Request");
    });

    it("handles generic error without detail or title", async () => {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({}), { status: 500 });
      const res = await runCli([
        "opaque",
        "register",
        "alice",
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include("OPAQUE server error (500): HTTP 500");
    });
  });

  describe("end-to-end simulated register and login flows", () => {
    const originalFetch = globalThis.fetch;
    const oldEnv = process.env["CRYPTO_SERVER_URL"];

    afterEach(() => {
      globalThis.fetch = originalFetch;
      if (oldEnv !== undefined) {
        process.env["CRYPTO_SERVER_URL"] = oldEnv;
      } else {
        delete process.env["CRYPTO_SERVER_URL"];
      }
    });

    it("completes registration with formatted text output and CRYPTO_SERVER_URL fallback", async () => {
      process.env["CRYPTO_SERVER_URL"] = "http://custom-host:8080/";
      const setup = pake.createServerSetup();

      let initCalled = false;
      let finishCalled = false;

      globalThis.fetch = async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        const urlStr = url.toString();
        expect(urlStr).to.include("http://custom-host:8080/v2/opaque/");
        const body = JSON.parse((init?.body as string) ?? "{}");

        if (urlStr.endsWith("/register/init")) {
          initCalled = true;
          const reqBytes = new Uint8Array(Buffer.from(body.request, "hex"));
          const regReq = pake.deserializeRegistrationRequest(reqBytes);
          const regRes = pake.createRegistrationResponse(
            regReq,
            setup.serverPublicKey,
            body.credentialIdentifier,
            setup.oprfSeed,
          );
          return new Response(
            JSON.stringify({
              data: {
                response: Buffer.from(
                  pake.serializeRegistrationResponse(regRes),
                ).toString("hex"),
              },
            }),
            { status: 200 },
          );
        }

        if (urlStr.endsWith("/register/finish")) {
          finishCalled = true;
          return new Response(
            JSON.stringify({ data: { status: "registered" } }),
            { status: 200 },
          );
        }

        return new Response("Not Found", { status: 404 });
      };

      const res = await runCli([
        "opaque",
        "register",
        "alice@example.com",
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.OK);
      expect(initCalled).to.equal(true);
      expect(finishCalled).to.equal(true);
      expect(res.stdout).to.include(
        "Registered credential 'alice@example.com' successfully",
      );
    });

    it("completes login handshake with JSON output", async () => {
      const password = "correct-password";
      const id = "alice@example.com";
      const setup = pake.createServerSetup();

      // Register Alice on server
      const { request, blind } = pake.createRegistrationRequest(password);
      const regRes = pake.createRegistrationResponse(
        request,
        setup.serverPublicKey,
        id,
        setup.oprfSeed,
      );
      const { record } = pake.finalizeRegistrationRequest(
        password,
        blind,
        regRes,
      );

      let serverState: import("@sebastienrousseau/crypto-lib/protocols/pake").ServerLoginState;

      globalThis.fetch = async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        const urlStr = url.toString();
        const body = JSON.parse((init?.body as string) ?? "{}");

        if (urlStr.endsWith("/login/init")) {
          const ke1 = pake.deserializeKE1(
            new Uint8Array(Buffer.from(body.ke1, "hex")),
          );
          const s = pake.generateKE2({
            serverPrivateKey: setup.serverPrivateKey,
            serverPublicKey: setup.serverPublicKey,
            oprfSeed: setup.oprfSeed,
            record,
            credentialIdentifier: id,
            ke1,
          });
          serverState = s.state;
          return new Response(
            JSON.stringify({
              data: {
                sessionId: "session-12345",
                ke2: Buffer.from(pake.serializeKE2(s.ke2)).toString("hex"),
              },
            }),
            { status: 200 },
          );
        }

        if (urlStr.endsWith("/login/finish")) {
          const ke3 = pake.deserializeKE3(
            new Uint8Array(Buffer.from(body.ke3, "hex")),
          );
          const sessionKey = pake.serverFinish(serverState, ke3);
          return new Response(
            JSON.stringify({
              data: {
                sessionKey: Buffer.from(sessionKey).toString("hex"),
              },
            }),
            { status: 200 },
          );
        }

        return new Response("Not Found", { status: 404 });
      };

      const res = await runCli([
        "opaque",
        "login",
        id,
        "--password-file",
        pwdFile,
        "--server-url",
        "http://localhost:3000",
        "--json",
      ]);
      expect(res.code).to.equal(EXIT.OK);
      const data = JSON.parse(res.stdout);
      expect(data.status).to.equal("authenticated");
      expect(data.credentialIdentifier).to.equal(id);
      expect(data).to.have.property("sessionKey");
      expect(data).to.have.property("exportKey");
    });

    it("completes login handshake with formatted text output and prompt", async () => {
      const password = "correct-password";
      const id = "alice@example.com";
      const setup = pake.createServerSetup();

      const { request, blind } = pake.createRegistrationRequest(password);
      const regRes = pake.createRegistrationResponse(
        request,
        setup.serverPublicKey,
        id,
        setup.oprfSeed,
      );
      const { record } = pake.finalizeRegistrationRequest(
        password,
        blind,
        regRes,
      );

      let serverState: import("@sebastienrousseau/crypto-lib/protocols/pake").ServerLoginState;

      globalThis.fetch = async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        const urlStr = url.toString();
        const body = JSON.parse((init?.body as string) ?? "{}");

        if (urlStr.endsWith("/login/init")) {
          const ke1 = pake.deserializeKE1(
            new Uint8Array(Buffer.from(body.ke1, "hex")),
          );
          const s = pake.generateKE2({
            serverPrivateKey: setup.serverPrivateKey,
            serverPublicKey: setup.serverPublicKey,
            oprfSeed: setup.oprfSeed,
            record,
            credentialIdentifier: id,
            ke1,
          });
          serverState = s.state;
          return new Response(
            JSON.stringify({
              data: {
                sessionId: "session-abc",
                ke2: Buffer.from(pake.serializeKE2(s.ke2)).toString("hex"),
              },
            }),
            { status: 200 },
          );
        }

        if (urlStr.endsWith("/login/finish")) {
          const ke3 = pake.deserializeKE3(
            new Uint8Array(Buffer.from(body.ke3, "hex")),
          );
          const sessionKey = pake.serverFinish(serverState, ke3);
          return new Response(
            JSON.stringify({
              data: {
                sessionKey: Buffer.from(sessionKey).toString("hex"),
              },
            }),
            { status: 200 },
          );
        }

        return new Response("Not Found", { status: 404 });
      };

      const patch = {
        promptSecret: async () => password,
      };
      const res = await runCli(["opaque", "login", id], [], patch);
      expect(res.code).to.equal(EXIT.OK);
      expect(res.stdout).to.include(`Authenticated as '${id}'. Session key:`);
    });

    it("fails when server returns mismatched session key", async () => {
      const password = "correct-password";
      const id = "alice@example.com";
      const setup = pake.createServerSetup();

      const { request, blind } = pake.createRegistrationRequest(password);
      const regRes = pake.createRegistrationResponse(
        request,
        setup.serverPublicKey,
        id,
        setup.oprfSeed,
      );
      const { record } = pake.finalizeRegistrationRequest(
        password,
        blind,
        regRes,
      );

      globalThis.fetch = async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        const urlStr = url.toString();
        const body = JSON.parse((init?.body as string) ?? "{}");

        if (urlStr.endsWith("/login/init")) {
          const ke1 = pake.deserializeKE1(
            new Uint8Array(Buffer.from(body.ke1, "hex")),
          );
          const s = pake.generateKE2({
            serverPrivateKey: setup.serverPrivateKey,
            serverPublicKey: setup.serverPublicKey,
            oprfSeed: setup.oprfSeed,
            record,
            credentialIdentifier: id,
            ke1,
          });
          return new Response(
            JSON.stringify({
              data: {
                sessionId: "session-mismatch",
                ke2: Buffer.from(pake.serializeKE2(s.ke2)).toString("hex"),
              },
            }),
            { status: 200 },
          );
        }

        if (urlStr.endsWith("/login/finish")) {
          return new Response(
            JSON.stringify({
              data: {
                sessionKey: "00".repeat(32), // Intentionally wrong key
              },
            }),
            { status: 200 },
          );
        }

        return new Response("Not Found", { status: 404 });
      };

      const res = await runCli([
        "opaque",
        "login",
        id,
        "--password-file",
        pwdFile,
      ]);
      expect(res.code).to.equal(EXIT.FAILURE);
      expect(res.stderr).to.include(
        "server session key does not match client session key",
      );
    });
  });
});
