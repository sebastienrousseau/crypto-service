// SPDX-License-Identifier: Apache-2.0 OR MIT

import readline from "node:readline";
import process from "node:process";
import {
  Diagnostic,
  InitializeResult,
  JSONRPCRequest,
  JSONRPCResponse,
  Position,
  PublishDiagnosticsParams,
  Range,
} from "./types";
import { analyzeDocument } from "./diagnostics";
import { getHover } from "./hover";
import { getCodeActions } from "./code-action";
import { getCompletions } from "./completion";
import { VERSION } from "./version";

type RequestId = number | string | null;
type Params = JSONRPCRequest["params"];
type Handler = (id: RequestId, params: Params) => JSONRPCResponse | null;

const respond = (id: RequestId, result: unknown): JSONRPCResponse => ({
  jsonrpc: "2.0",
  id,
  result,
});

const fail = (
  id: RequestId,
  code: number,
  message: string,
): JSONRPCResponse => ({ jsonrpc: "2.0", id, error: { code, message } });

/**
 * Crypto Language Server Protocol (LSP 3.17) implementation.
 */
export class CryptoLspServer {
  private documents: Map<string, string> = new Map();
  private initialized = false;

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getDocument(uri: string): string | undefined {
    return this.documents.get(uri);
  }

  /**
   * Request handlers by method name. A Map, not an object literal, so a
   * method named after an Object.prototype member ("toString",
   * "__proto__") is not found rather than dispatched.
   */
  private readonly handlers = new Map<string, Handler>([
    ["initialize", (id) => this.initialize(id)],
    ["initialized", () => null],
    ["textDocument/didOpen", (_id, params) => this.didOpen(params)],
    ["textDocument/didChange", (_id, params) => this.didChange(params)],
    ["textDocument/didClose", (_id, params) => this.didClose(params)],
    ["textDocument/hover", (id, params) => this.hover(id, params)],
    ["textDocument/codeAction", (id, params) => this.codeAction(id, params)],
    ["textDocument/completion", (id) => respond(id, getCompletions())],
    ["shutdown", (id) => respond(id, null)],
    ["exit", () => null],
  ]);

  public async handleRequest(
    request: JSONRPCRequest,
  ): Promise<JSONRPCResponse | null> {
    const id = request.id ?? null;
    if (request.jsonrpc !== "2.0") {
      return fail(id, -32600, "Invalid Request: jsonrpc must be '2.0'");
    }
    const handler = this.handlers.get(request.method);
    if (!handler) {
      return fail(id, -32601, `Method not found: ${request.method}`);
    }
    return handler(id, request.params);
  }

  private initialize(id: RequestId): JSONRPCResponse {
    this.initialized = true;
    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: 1, // Full sync
        hoverProvider: true,
        codeActionProvider: true,
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['"', "'", "-"],
        },
      },
      serverInfo: {
        name: "crypto-lsp",
        version: VERSION,
      },
    };
    return respond(id, result);
  }

  /** Store `text` for `uri` and publish its diagnostics. */
  private publish(uri: string, text: string): JSONRPCResponse {
    this.documents.set(uri, text);
    const publishParams: PublishDiagnosticsParams = {
      uri,
      diagnostics: analyzeDocument(uri, text),
    };
    return respond(null, publishParams);
  }

  private didOpen(params: Params): JSONRPCResponse | null {
    const td = params?.textDocument as
      { uri: string; text: string } | undefined;
    return td ? this.publish(td.uri, td.text) : null;
  }

  private didChange(params: Params): JSONRPCResponse | null {
    const td = params?.textDocument as { uri: string } | undefined;
    const changes = params?.contentChanges as
      Array<{ text: string }> | undefined;
    if (!td || !changes || changes.length === 0) return null;
    return this.publish(td.uri, changes[0].text);
  }

  private didClose(params: Params): null {
    const td = params?.textDocument as { uri: string } | undefined;
    if (td) this.documents.delete(td.uri);
    return null;
  }

  private hover(id: RequestId, params: Params): JSONRPCResponse {
    const td = params?.textDocument as { uri: string } | undefined;
    const pos = params?.position as Position | undefined;
    if (!td || !pos) return respond(id, null);
    return respond(id, getHover(this.textOf(td.uri), pos));
  }

  private codeAction(id: RequestId, params: Params): JSONRPCResponse {
    const td = params?.textDocument as { uri: string } | undefined;
    const range = params?.range as Range | undefined;
    if (!td || !range) return respond(id, []);
    const text = this.textOf(td.uri);
    const context = params?.context as
      { diagnostics: Diagnostic[] } | undefined;
    const diags = context ? context.diagnostics : analyzeDocument(td.uri, text);
    return respond(id, getCodeActions(td.uri, text, range, diags));
  }

  private textOf(uri: string): string {
    return this.documents.get(uri) || "";
  }

  /**
   * Listen on stdio stream.
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
      if (trimmed.startsWith("Content-Length:")) return;

      try {
        const req = JSON.parse(trimmed) as JSONRPCRequest;
        const res = await this.handleRequest(req);
        if (res !== null) {
          output.write(JSON.stringify(res) + "\n");
        }
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
