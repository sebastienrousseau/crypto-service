// SPDX-License-Identifier: Apache-2.0 OR MIT

import {
  MCPToolInputSchema,
  MCPToolParameterProperty,
  MCPToolParameterType,
} from "../types";

/*
 * Validation of tool arguments against the `inputSchema` each tool
 * declares. It enforces the JSON Schema subset the definitions use: an
 * object with no unknown properties, required properties, and per
 * property `type`, `enum`, `minLength`, `maxLength`, `pattern`,
 * `minimum` and `maximum`. Messages name the offending property but
 * never echo its value, which may be sensitive.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasType(type: MCPToolParameterType, value: unknown): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "integer":
      return Number.isSafeInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
  }
}

function checkString(
  prop: MCPToolParameterProperty,
  value: string,
): string | undefined {
  if (prop.minLength !== undefined && value.length < prop.minLength) {
    return `must be at least ${prop.minLength} characters`;
  }
  if (prop.maxLength !== undefined && value.length > prop.maxLength) {
    return `must be at most ${prop.maxLength} characters`;
  }
  if (
    prop.pattern !== undefined &&
    !new RegExp(prop.pattern, "u").test(value)
  ) {
    return "has an invalid format";
  }
  return undefined;
}

function checkNumber(
  prop: MCPToolParameterProperty,
  value: number,
): string | undefined {
  if (prop.minimum !== undefined && value < prop.minimum) {
    return `must be at least ${prop.minimum}`;
  }
  if (prop.maximum !== undefined && value > prop.maximum) {
    return `must be at most ${prop.maximum}`;
  }
  return undefined;
}

function checkProperty(
  prop: MCPToolParameterProperty,
  value: unknown,
): string | undefined {
  if (!hasType(prop.type, value)) return `must be of type ${prop.type}`;
  if (prop.enum && !prop.enum.includes(value as string | number)) {
    return `must be one of: ${prop.enum.join(", ")}`;
  }
  if (typeof value === "string") return checkString(prop, value);
  if (typeof value === "number") return checkNumber(prop, value);
  return undefined;
}

/** Quote a caller-supplied property name, truncated, for a message. */
function quoteName(name: string): string {
  return JSON.stringify(name.length > 64 ? `${name.slice(0, 64)}...` : name);
}

/**
 * Check `args` against a tool's input schema.
 *
 * @returns `undefined` when the arguments are valid, otherwise a message
 *   naming the first property that is not.
 */
export function validateArguments(
  schema: MCPToolInputSchema,
  args: unknown,
): string | undefined {
  if (!isPlainObject(args)) return "arguments must be a JSON object";
  for (const name of Object.keys(args)) {
    if (!Object.hasOwn(schema.properties, name)) {
      return `unknown property ${quoteName(name)}`;
    }
  }
  for (const name of schema.required ?? []) {
    if (!Object.hasOwn(args, name)) {
      return `missing required property "${name}"`;
    }
  }
  for (const [name, value] of Object.entries(args)) {
    const problem = checkProperty(schema.properties[name], value);
    if (problem) return `"${name}" ${problem}`;
  }
  return undefined;
}
