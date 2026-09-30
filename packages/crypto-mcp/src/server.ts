// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { JSONRPCRequest, JSONRPCResponse, MCPInitializeResult } from "./types";
import { TOOLS, executeTool } from "./tools";
import { RESOURCES, readResource } from "./resources";
import { PROMPTS, getPrompt } from "./prompts";

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
   * Process a single JSON-RPC 2.0 request and return the appropriate response.
   */
  public async handleRequest(
    request: JSONRPCRequest,
  ): Promise<JSONRPCResponse> {
    const id = request.id ?? null;

    if (!request.jsonrpc || request.jsonrpc !== "2.0") {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be '2.0'",
        },
      };
    }

    try {
      switch (request.method) {
        case "initialize": {
          this.initialized = true;
          const result: MCPInitializeResult = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: this.name,
              version: this.version,
            },
          };
          return { jsonrpc: "2.0", id, result };
        }

        case "ping": {
          return { jsonrpc: "2.0", id, result: {} };
        }

        case "tools/list": {
          return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
        }

        case "tools/call": {
          const params = request.params;
          const toolName = params ? String(params.name) : "";
          const toolArgs =
            params && params.arguments
              ? (params.arguments as Record<string, unknown>)
              : {};
          const result = await executeTool(toolName, toolArgs);
          return { jsonrpc: "2.0", id, result };
        }

        case "resources/list": {
          return { jsonrpc: "2.0", id, result: { resources: RESOURCES } };
        }

        case "resources/read": {
          const params = request.params;
          const uri = params ? String(params.uri) : "";
          const result = await readResource(uri);
          return { jsonrpc: "2.0", id, result };
        }

        case "prompts/list": {
          return { jsonrpc: "2.0", id, result: { prompts: PROMPTS } };
        }

        case "prompts/get": {
          const params = request.params;
          const promptName = params ? String(params.name) : "";
          const promptArgs =
            params && params.arguments
              ? (params.arguments as Record<string, string>)
              : {};
          const result = await getPrompt(promptName, promptArgs);
          return { jsonrpc: "2.0", id, result };
        }

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (err: unknown) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: (err as Error).message,
        },
      };
    }
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
        output.write(JSON.stringify(res) + "\n");
      } catch (e) {
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
