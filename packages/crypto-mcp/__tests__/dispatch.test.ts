// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CryptoMcpServer } from "../src";
import type { JSONRPCRequest } from "../src/types";

// Characterisation net for CryptoMcpServer.handleRequest and
// readResource: one session through every method, valid and invalid
// params, and method names that collide with Object.prototype. Only
// deterministic tools are called. Each step records the response and the
// initialised flag; the expected values are in
// fixtures/dispatch.golden.json.

const NOT_2_0 = "1.0" as unknown as "2.0";

export const SESSION: JSONRPCRequest[] = [
  { method: "ping" } as unknown as JSONRPCRequest,
  { jsonrpc: NOT_2_0, id: 1, method: "ping" },
  { jsonrpc: "2.0", id: 2, method: "initialize" },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" },
  },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "initialize",
    params: { protocolVersion: "1999-01-01" },
  },
  { jsonrpc: "2.0", id: 5, method: "ping" },
  { jsonrpc: "2.0", id: 6, method: "tools/list" },
  { jsonrpc: "2.0", id: 7, method: "tools/call" },
  {
    jsonrpc: "2.0",
    id: 8,
    method: "tools/call",
    params: { name: "no_such_tool", arguments: {} },
  },
  {
    jsonrpc: "2.0",
    id: 9,
    method: "tools/call",
    params: { name: "crypto_hash" },
  },
  {
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: { name: "crypto_hash", arguments: { data: "abc" } },
  },
  {
    jsonrpc: "2.0",
    id: 11,
    method: "tools/call",
    params: {
      name: "crypto_hash",
      arguments: { data: "abc", algorithm: "SHA3-256" },
    },
  },
  { jsonrpc: "2.0", id: 12, method: "resources/list" },
  { jsonrpc: "2.0", id: 13, method: "resources/read" },
  {
    jsonrpc: "2.0",
    id: 14,
    method: "resources/read",
    params: { uri: "crypto://standards/pqc" },
  },
  {
    jsonrpc: "2.0",
    id: 15,
    method: "resources/read",
    params: { uri: "crypto://algorithms/matrix" },
  },
  {
    jsonrpc: "2.0",
    id: 16,
    method: "resources/read",
    params: { uri: "crypto://nothing" },
  },
  { jsonrpc: "2.0", id: 17, method: "prompts/list" },
  { jsonrpc: "2.0", id: 18, method: "prompts/get" },
  {
    jsonrpc: "2.0",
    id: 19,
    method: "prompts/get",
    params: { name: "no-such-prompt" },
  },
  {
    jsonrpc: "2.0",
    id: 20,
    method: "prompts/get",
    params: { name: "pqc-migration-plan" },
  },
  {
    jsonrpc: "2.0",
    id: 21,
    method: "prompts/get",
    params: {
      name: "pqc-migration-plan",
      arguments: { targetSystem: "payments" },
    },
  },
  { jsonrpc: "2.0", id: 22, method: "toString" },
  { jsonrpc: "2.0", id: 23, method: "constructor" },
  { jsonrpc: "2.0", id: 24, method: "__proto__" },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];

/** The package version, which changes every release. */
const PACKAGE_VERSION = (
  JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as {
    version: string;
  }
).version;

/**
 * The response with `result.serverInfo.version` replaced by a
 * placeholder, after checking it is the package version, so the recording
 * does not change with every release.
 */
function withoutVersion<T>(response: T): T {
  const info = (response as { result?: { serverInfo?: { version?: string } } })
    ?.result?.serverInfo;
  if (info?.version === undefined) return response;
  expect(info.version).to.equal(PACKAGE_VERSION);
  return JSON.parse(
    JSON.stringify(response).replace(
      `"version":"${PACKAGE_VERSION}"`,
      '"version":"<package version>"',
    ),
  ) as T;
}

export async function runSession(): Promise<unknown[]> {
  const server = new CryptoMcpServer();
  const steps: unknown[] = [];
  for (const request of SESSION) {
    const response = await server.handleRequest(request);
    steps.push({
      method: request.method,
      response: withoutVersion(response),
      initialized: server.isInitialized(),
    });
  }
  return steps;
}

describe("CryptoMcpServer.handleRequest dispatch", () => {
  it("answers a full session exactly as recorded", async () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/dispatch.golden.json"), "utf8"),
    );
    const steps = JSON.parse(JSON.stringify(await runSession()));
    expect(steps).to.deep.equal(golden);
  });
});
