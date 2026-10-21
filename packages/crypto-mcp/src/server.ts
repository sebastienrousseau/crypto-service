// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { JSONRPCRequest, JSONRPCResponse, MCPInitializeResult } from "./types";
import { TOOLS, executeTool } from "./tools";
import { RESOURCES, readResource } from "./resources";
import { PROMPTS, getPrompt } from "./prompts";
import {
  McpError,
  isNotification,
  negotiateProtocolVersion,
  requireArguments,
  requireName,
  requirePromptArguments,
} from "./protocol";

/** Server instructions sent at initialize (MCP 2025-03-26 and later). */
export const SERVER_INSTRUCTIONS =
  "Cryptographic tools that keep key material inside this server: " +
  "generate or import a key to get a handle, then pass the handle to " +
  "encrypt, decrypt, sign, KEM and KMS tools. No tool returns a private " +
  "or secret key.";

/**
 * Version of this package, read from its package.json at runtime so the
 * advertised `serverInfo.version` cannot drift from the release. The file
 * sits one level above both `src/` (ts-node) and `dist/` (compiled).
 */
export const SERVER_VERSION: string = (
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string }
).version;

type Params = JSONRPCRequest["params"];
type Handler = (params: Params) => Promise<unknown>;

const fail = (
  id: string | number | null,
  code: number,
  message: string,
): JSONRPCResponse => ({ jsonrpc: "2.0", id, error: { code, message } });

async function callTool(params: Params): Promise<unknown> {
  const toolName = requireName(params, TOOLS, "tool");
  return executeTool(toolName, requireArguments(params));
}

async function promptFor(params: Params): Promise<unknown> {
  const promptName = requireName(params, PROMPTS, "prompt");
  const promptArgs = requirePromptArguments(
    PROMPTS.find((p) => p.name === promptName)?.arguments,
    requireArguments(params),
  );
  return getPrompt(promptName, promptArgs);
}

export class CryptoMcpServer {
  private initialized = false;
  private readonly name = "crypto-service";
  private readonly version = SERVER_VERSION;

  /**
   * Check if the server has been initialized by an initialize request.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Request handlers by method name. A Map, not an object literal, so a
   * method named after an Object.prototype member ("toString",
   * "__proto__") is not found rather than dispatched.
   */
  private readonly handlers = new Map<string, Handler>([
    ["initialize", (params) => this.initialize(params)],
    ["ping", async () => ({})],
    ["tools/list", async () => ({ tools: TOOLS })],
    ["tools/call", callTool],
    ["resources/list", async () => ({ resources: RESOURCES })],
    [
      "resources/read",
      (params) => readResource(params ? String(params.uri) : ""),
    ],
    ["prompts/list", async () => ({ prompts: PROMPTS })],
    ["prompts/get", promptFor],
  ]);

  /**
   * Process a single JSON-RPC 2.0 request and return the appropriate response.
   */
  public async handleRequest(
    request: JSONRPCRequest,
  ): Promise<JSONRPCResponse> {
    const id = request.id ?? null;
    if (!request.jsonrpc || request.jsonrpc !== "2.0") {
      return fail(id, -32600, "Invalid Request: jsonrpc must be '2.0'");
    }
    const handler = this.handlers.get(request.method);
    if (!handler) {
      return fail(id, -32601, `Method not found: ${request.method}`);
    }
    try {
      return { jsonrpc: "2.0", id, result: await handler(request.params) };
    } catch (err: unknown) {
      const code = err instanceof McpError ? err.code : -32603;
      return fail(id, code, (err as Error).message);
    }
  }

  private async initialize(params: Params): Promise<MCPInitializeResult> {
    this.initialized = true;
    return {
      protocolVersion: negotiateProtocolVersion(params?.protocolVersion),
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: this.name,
        version: this.version,
      },
      instructions: SERVER_INSTRUCTIONS,
    };
  }

  /**
   * Listen for JSON-RPC messages on stdio (line-delimited JSON).
   */
  public listenStdio(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout,
  ): void {
    const rl = readline.createInterface({
      input,
      output: undefined,
      terminal: false,
    });

    rl.on("line", async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const req = JSON.parse(trimmed) as JSONRPCRequest;
        const res = await this.handleRequest(req);
        // A notification (no id) is processed but never answered.
        if (isNotification(req)) return;
        output.write(JSON.stringify(res) + "\n");
      } catch {
        const parseError: JSONRPCResponse = {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: invalid JSON" },
        };
        output.write(JSON.stringify(parseError) + "\n");
      }
    });
  }
}
