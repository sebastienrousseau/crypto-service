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

  public async handleRequest(
    request: JSONRPCRequest,
  ): Promise<JSONRPCResponse | null> {
    if (request.jsonrpc !== "2.0") {
      return {
        jsonrpc: "2.0",
        id: request.id ?? null,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be '2.0'",
        },
      };
    }

    const id = request.id ?? null;
    const params = request.params;

    switch (request.method) {
      case "initialize": {
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
            version: "0.0.3",
          },
        };
        return { jsonrpc: "2.0", id, result };
      }

      case "initialized": {
        return null; // Notification, no response
      }

      case "textDocument/didOpen": {
        const td = params
          ? (params.textDocument as { uri: string; text: string })
          : null;
        if (td) {
          this.documents.set(td.uri, td.text);
          const diagnostics = analyzeDocument(td.uri, td.text);
          const publishParams: PublishDiagnosticsParams = {
            uri: td.uri,
            diagnostics,
          };
          return {
            jsonrpc: "2.0",
            id: null,
            result: publishParams,
          };
        }
        return null;
      }

      case "textDocument/didChange": {
        const td = params ? (params.textDocument as { uri: string }) : null;
        const changes = params
          ? (params.contentChanges as Array<{ text: string }>)
          : null;
        if (td && changes && changes.length > 0) {
          const newText = changes[0].text;
          this.documents.set(td.uri, newText);
          const diagnostics = analyzeDocument(td.uri, newText);
          const publishParams: PublishDiagnosticsParams = {
            uri: td.uri,
            diagnostics,
          };
          return {
            jsonrpc: "2.0",
            id: null,
            result: publishParams,
          };
        }
        return null;
      }

      case "textDocument/didClose": {
        const td = params ? (params.textDocument as { uri: string }) : null;
        if (td) {
          this.documents.delete(td.uri);
        }
        return null;
      }

      case "textDocument/hover": {
        const td = params ? (params.textDocument as { uri: string }) : null;
        const pos = params ? (params.position as Position) : null;
        if (td && pos) {
          const text = this.documents.get(td.uri) || "";
          const hover = getHover(text, pos);
          return { jsonrpc: "2.0", id, result: hover };
        }
        return { jsonrpc: "2.0", id, result: null };
      }

      case "textDocument/codeAction": {
        const td = params ? (params.textDocument as { uri: string }) : null;
        const range = params ? (params.range as Range) : null;
        const context = params
          ? (params.context as { diagnostics: Diagnostic[] })
          : null;
        if (td && range) {
          const text = this.documents.get(td.uri) || "";
          const diags = context
            ? context.diagnostics
            : analyzeDocument(td.uri, text);
          const actions = getCodeActions(td.uri, text, range, diags);
          return { jsonrpc: "2.0", id, result: actions };
        }
        return { jsonrpc: "2.0", id, result: [] };
      }

      case "textDocument/completion": {
        const items = getCompletions();
        return { jsonrpc: "2.0", id, result: items };
      }

      case "shutdown": {
        return { jsonrpc: "2.0", id, result: null };
      }

      case "exit": {
        return null;
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
