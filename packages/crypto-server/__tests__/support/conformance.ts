/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks A reference runner for the conformance kit at the repository
 * root (`conformance/`, format in its README): substitution, captures,
 * template matching, and validation against the OpenAPI document.
 */

import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

/** The kit's directory. */
export const KIT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "conformance",
);

/** How a vector authenticates. */
export type Auth = "admin" | "none" | { scopes: string[] };

/** One request/response vector. */
export interface Vector {
  id: string;
  description: string;
  auth?: Auth;
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
    rawBody?: string;
  };
  expect: {
    status: number;
    mediaType: string;
    headers?: Record<string, string>;
    body?: unknown;
    text?: unknown;
  };
  capture?: Record<string, string>;
}

/** One file of the kit. */
export interface VectorFile {
  group: string;
  description: string;
  vectors: Vector[];
}

/** Every vector file, by file name, in name order. */
export function loadKit(): Array<[string, VectorFile]> {
  return readdirSync(KIT)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => [f, JSON.parse(readFileSync(path.join(KIT, f), "utf8"))]);
}

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);

/** Errors of `value` against a JSON Schema, or an empty list. */
export function schemaErrors(schema: object, value: unknown): string[] {
  const validate = ajv.compile(schema);
  if (validate(value)) return [];
  return (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message}`,
  );
}

/** Replace each `${name}` in strings with the captured value. */
export function substitute(
  value: unknown,
  captured: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return value.replace(/\$\{(\w+)\}/g, (whole, name: string) => {
      if (!(name in captured)) throw new Error(`nothing captured as ${name}`);
      return captured[name] as string;
    });
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, captured));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, substitute(v, captured)]),
    );
  }
  return value;
}

/** The value at a JSON pointer (RFC 6901). */
export function pointer(value: unknown, at: string): unknown {
  return at
    .split("/")
    .slice(1)
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>(
      (v, key) => (v as Record<string, unknown> | undefined)?.[key],
      value,
    );
}

const isShape = (t: unknown): t is { $shape: object } =>
  t !== null &&
  typeof t === "object" &&
  !Array.isArray(t) &&
  Object.keys(t).length === 1 &&
  "$shape" in t;

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Where `actual` departs from the template: exact JSON values, strings
 * after substitution, and `{"$shape": schema}` for values only a schema
 * can describe. Objects must have exactly the template's members.
 */
export function mismatches(
  template: unknown,
  actual: unknown,
  captured: Record<string, string>,
  at = "",
): string[] {
  if (isShape(template)) {
    return schemaErrors(template.$shape, actual).map((e) => `${at}${e}`);
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(actual) || actual.length !== template.length) {
      return [`${at || "/"}: expected ${template.length} items`];
    }
    return template.flatMap((t, i) =>
      mismatches(t, actual[i], captured, `${at}/${i}`),
    );
  }
  if (isObject(template)) {
    if (!isObject(actual)) return [`${at || "/"}: expected an object`];
    const keys = new Set([...Object.keys(template), ...Object.keys(actual)]);
    return [...keys].flatMap((k) =>
      k in template && k in actual
        ? mismatches(template[k], actual[k], captured, `${at}/${k}`)
        : [`${at}/${k}: ${k in template ? "missing" : "unexpected"}`],
    );
  }
  const want = substitute(template, captured);
  return want === actual
    ? []
    : [`${at || "/"}: expected ${JSON.stringify(want)}`];
}

/** The OpenAPI response schema for a status and media type. */
export function documentedSchema(
  doc: OpenApi,
  method: string,
  url: string,
  status: number,
  mediaType: string,
): object | undefined {
  const op = doc.paths[url]?.[method.toLowerCase()];
  const schema = op?.responses[String(status)]?.content?.[mediaType]?.schema;
  return schema === undefined ? undefined : inlineRefs(schema, doc);
}

/** The parts of the OpenAPI document the runner reads. */
export interface OpenApi {
  paths: Record<
    string,
    Record<
      string,
      {
        responses: Record<
          string,
          { content?: Record<string, { schema: object }> }
        >;
      }
    >
  >;
  components: { schemas: Record<string, object> };
}

/** A schema with every `#/components/schemas/<name>` reference inlined. */
function inlineRefs(schema: unknown, doc: OpenApi): object {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!isObject(v)) return v;
    const ref = v["$ref"];
    if (typeof ref === "string") {
      return walk(doc.components.schemas[ref.split("/").pop() as string]);
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
  };
  return walk(schema) as object;
}
