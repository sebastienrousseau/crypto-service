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

/** JSON types a tool parameter may declare. */
export type MCPToolParameterType = "string" | "integer" | "number" | "boolean";

/**
 * One tool parameter: the subset of JSON Schema that `validateArguments`
 * enforces before a tool runs.
 */
export interface MCPToolParameterProperty {
  type: MCPToolParameterType;
  description: string;
  enum?: Array<string | number>;
  default?: unknown;
  /** Minimum string length, in UTF-16 code units. */
  minLength?: number;
  /** Maximum string length, in UTF-16 code units. */
  maxLength?: number;
  /** Regular expression (Unicode mode) a string must match. */
  pattern?: string;
  minimum?: number;
  maximum?: number;
}

export interface MCPToolInputSchema {
  type: "object";
  properties: Record<string, MCPToolParameterProperty>;
  required?: string[];
  /** Always `false`: unknown arguments are rejected. */
  additionalProperties: false;
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
