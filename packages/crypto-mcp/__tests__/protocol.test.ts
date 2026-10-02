// SPDX-License-Identifier: Apache-2.0 OR MIT

// Protocol conformance found by passmcp: revision negotiation, -32602 for
// invalid tools/call and prompts/get params, no reply to notifications,
// and tool titles and behaviour annotations.

import { expect } from "chai";
import { PassThrough } from "node:stream";
import { CryptoMcpServer, SERVER_INSTRUCTIONS } from "../src/server";
import { TOOLS } from "../src/tools";
import { annotationsFor } from "../src/tools/annotations";
import {
  SUPPORTED_PROTOCOL_VERSIONS,
  negotiateProtocolVersion,
  requirePromptArguments,
} from "../src/protocol";

const server = new CryptoMcpServer();
const call = (method: string, params?: Record<string, unknown>) =>
  server.handleRequest({ jsonrpc: "2.0", id: 1, method, params });

describe("MCP protocol conformance", () => {
  it("answers initialize with the client's revision when supported", async () => {
    for (const version of SUPPORTED_PROTOCOL_VERSIONS) {
      const res = await call("initialize", { protocolVersion: version });
      const result = res.result as {
        protocolVersion: string;
        instructions: string;
      };
      expect(result.protocolVersion).to.equal(version);
      expect(result.instructions).to.equal(SERVER_INSTRUCTIONS);
    }
  });

  it("offers its newest revision for an unknown one", () => {
    expect(negotiateProtocolVersion("1999-01-01")).to.equal("2025-11-25");
    expect(negotiateProtocolVersion(undefined)).to.equal("2025-11-25");
  });

  it("rejects tools/call without a valid tool name with -32602", async () => {
    for (const params of [
      undefined,
      {},
      { name: "" },
      { name: 7 },
      { name: "nope" },
    ]) {
      const res = await call("tools/call", params);
      expect(res.error?.code, JSON.stringify(params)).to.equal(-32602);
    }
  });

  it("rejects non-object tools/call arguments with -32602", async () => {
    for (const args of [[], "x", 3]) {
      const res = await call("tools/call", {
        name: "crypto_hash",
        arguments: args,
      });
      expect(res.error?.code).to.equal(-32602);
    }
  });

  it("rejects prompts/get with a missing required or non-string argument", async () => {
    const missing = await call("prompts/get", { name: "pqc-migration-plan" });
    expect(missing.error?.code).to.equal(-32602);
    expect(missing.error?.message).to.include("targetSystem");
    const nonString = await call("prompts/get", {
      name: "pqc-migration-plan",
      arguments: { targetSystem: 1 },
    });
    expect(nonString.error?.code).to.equal(-32602);
    const unknown = await call("prompts/get", { name: "nope" });
    expect(unknown.error?.code).to.equal(-32602);
    const ok = await call("prompts/get", {
      name: "pqc-migration-plan",
      arguments: { targetSystem: "Gateway" },
    });
    expect(ok.result).to.exist;
  });

  it("accepts any string arguments for a prompt that declares none", () => {
    expect(requirePromptArguments(undefined, { a: "b" })).to.deep.equal({
      a: "b",
    });
  });

  it("does not answer notifications on stdio", (done) => {
    const input = new PassThrough();
    const output = new PassThrough();
    const lines: string[] = [];
    new CryptoMcpServer().listenStdio(input, output);
    output.on("data", (chunk: Buffer) => lines.push(chunk.toString().trim()));
    input.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
        "\n",
    );
    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 5, method: "ping" }) + "\n",
    );
    setTimeout(() => {
      expect(lines).to.have.length(1);
      expect(JSON.parse(lines[0]!).id).to.equal(5);
      done();
    }, 50);
  });

  it("gives every tool a title and behaviour annotations", () => {
    for (const tool of TOOLS) {
      expect(tool.title, tool.name).to.be.a("string");
      expect(tool.annotations?.readOnlyHint, tool.name).to.be.a("boolean");
      expect(tool.annotations?.openWorldHint, tool.name).to.equal(false);
    }
    expect(annotationsFor("not_a_tool")).to.equal(undefined);
  });

  it("marks only key destruction as destructive", () => {
    const destructive = TOOLS.filter((t) => t.annotations?.destructiveHint);
    expect(destructive.map((t) => t.name)).to.deep.equal([
      "crypto_key_destroy",
    ]);
  });
});
