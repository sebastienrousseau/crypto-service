// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CryptoLspServer } from "../src";
import type { JSONRPCRequest } from "../src/types";

// Characterisation net for CryptoLspServer.handleRequest: one session
// covering every method, with and without params, and method names that
// collide with Object.prototype. Each step records the response, the
// tracked document text and the initialised flag; the expected values
// are in fixtures/dispatch.golden.json.

const uri = "file:///workspace/a.ts";
const insecure = 'const h = crypto.createHash("md5");';
const secure = 'const h = crypto.createHash("sha256");';
const range = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 30 },
};

export const SESSION: JSONRPCRequest[] = [
  { jsonrpc: "1.0" as unknown as "2.0", method: "initialize" },
  { jsonrpc: "1.0" as unknown as "2.0", id: 7, method: "initialize" },
  { jsonrpc: "2.0", id: 1, method: "initialize" },
  { jsonrpc: "2.0", method: "initialized" },
  { jsonrpc: "2.0", method: "textDocument/didOpen" },
  { jsonrpc: "2.0", method: "textDocument/didOpen", params: {} },
  {
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: { uri, languageId: "ts", version: 1, text: insecure },
    },
  },
  { jsonrpc: "2.0", id: 2, method: "textDocument/hover" },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "textDocument/hover",
    params: { textDocument: { uri }, position: { line: 0, character: 30 } },
  },
  {
    jsonrpc: "2.0",
    id: 4,
    method: "textDocument/codeAction",
    params: { textDocument: { uri }, range },
  },
  {
    jsonrpc: "2.0",
    id: 5,
    method: "textDocument/codeAction",
    params: { textDocument: { uri }, range, context: { diagnostics: [] } },
  },
  { jsonrpc: "2.0", id: 6, method: "textDocument/codeAction" },
  { jsonrpc: "2.0", method: "textDocument/didChange" },
  {
    jsonrpc: "2.0",
    method: "textDocument/didChange",
    params: { textDocument: { uri }, contentChanges: [] },
  },
  {
    jsonrpc: "2.0",
    method: "textDocument/didChange",
    params: { textDocument: { uri } },
  },
  {
    jsonrpc: "2.0",
    method: "textDocument/didChange",
    params: { textDocument: { uri }, contentChanges: [{ text: secure }] },
  },
  { jsonrpc: "2.0", id: "c", method: "textDocument/completion" },
  { jsonrpc: "2.0", method: "textDocument/didClose" },
  {
    jsonrpc: "2.0",
    method: "textDocument/didClose",
    params: { textDocument: { uri } },
  },
  {
    jsonrpc: "2.0",
    id: 8,
    method: "textDocument/hover",
    params: { textDocument: { uri }, position: { line: 0, character: 30 } },
  },
  { jsonrpc: "2.0", id: 9, method: "toString" },
  { jsonrpc: "2.0", id: 10, method: "constructor" },
  { jsonrpc: "2.0", id: 11, method: "__proto__" },
  { jsonrpc: "2.0", id: 12, method: "hasOwnProperty" },
  { jsonrpc: "2.0", method: "custom/unknown" },
  { jsonrpc: "2.0", id: 13, method: "shutdown" },
  { jsonrpc: "2.0", method: "exit" },
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
  const server = new CryptoLspServer();
  const steps: unknown[] = [];
  for (const request of SESSION) {
    const response = await server.handleRequest(request);
    steps.push({
      method: request.method,
      response: withoutVersion(response),
      document: server.getDocument(uri) ?? null,
      initialized: server.isInitialized(),
    });
  }
  return steps;
}

describe("CryptoLspServer.handleRequest dispatch", () => {
  it("answers a full session exactly as recorded", async () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/dispatch.golden.json"), "utf8"),
    );
    const steps = JSON.parse(JSON.stringify(await runSession()));
    expect(steps).to.deep.equal(golden);
  });
});
