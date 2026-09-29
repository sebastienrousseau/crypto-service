// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Protocol and data types for @sebastienrousseau/crypto-mcp.
 */

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface MCPToolInputSchema {
  type: "object";
  properties: Record<string, MCPToolParameterProperty>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolInputSchema;
}

export interface MCPTextContent {
  type: "text";
  text: string;
}

export interface MCPCallToolResult {
  content: MCPTextContent[];
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptMessage {
  role: "user" | "assistant";
  content: MCPTextContent;
}

export interface MCPGetPromptResult {
  description?: string;
  messages: MCPPromptMessage[];
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

export interface MCPServerCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: MCPServerInfo;
}
