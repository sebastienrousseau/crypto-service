/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import {
  AuthorizationInfo,
  JsonDocument,
  JsonRequest,
  ResponseType,
} from "../@types/types";
import { mkdir, writeFile } from "fs/promises";
import * as path from "path";

/**
 * URL object with an optional array of query parameters.
 *
 * @example
 * ```ts
 * const url: UrlWithQuery = { query: [{ key: "page", value: "1" }] };
 * ```
 */
export interface UrlWithQuery {
  /** Optional list of query-string key/value pairs. */
  query?: Array<{
    /** Parameter name. */
    key: string;
    /** Parameter value. */
    value: string;
  }>;
}

/**
 * A single form-data field entry in a request body.
 *
 * @example
 * ```ts
 * const field: BodyFormField = { key: "file", type: "file", src: "./data.csv" };
 * ```
 */
export interface BodyFormField {
  /** Field name. */
  key: string;
  /** Field type, e.g. `"text"` or `"file"`. */
  type: string;
  /** File source path when `type` is `"file"`. */
  src?: string | undefined;
  /** Field value when `type` is `"text"`. */
  value?: string | undefined;
}

/**
 * Shape of a request body — either raw JSON or form-data.
 *
 * @example
 * ```ts
 * const body: BodyShape = { mode: "raw", raw: '{"key":"value"}' };
 * ```
 */
export interface BodyShape {
  /** Body mode — `"raw"` for JSON, `"formdata"` for multipart. */
  mode?: string;
  /** Raw body content (used when mode is `"raw"`). */
  raw?: string;
  /** Form-data fields (used when mode is `"formdata"`). */
  formdata?: BodyFormField[];
}

/**
 * A Postman-style method entry with request/response metadata.
 *
 * @example
 * ```ts
 * const method: MethodLike = { name: "Get Users", request: { method: "GET" } };
 * ```
 */
export interface MethodLike {
  /** Display name of the API method. */
  name: string;
  /** Request details including HTTP method, URL, body, and auth. */
  request?: JsonRequest & {
    /** HTTP verb (GET, POST, etc.). */
    method?: string;
    /** Human-readable description of the endpoint. */
    description?: string;
    /** Request URL, either a string or an object with query params. */
    url?: UrlWithQuery | string;
    /** Request body definition. */
    body?: BodyShape;
    /** Authorization configuration. */
    auth?: AuthorizationInfo;
  };
  /** Array of example responses. */
  response?: ResponseType[];
}

/**
 * Recursive folder/item shape for Postman-style collections.
 *
 * @example
 * ```ts
 * const item: ItemShape = { name: "Auth", item: [{ name: "Login" }] };
 * ```
 */
export interface ItemShape {
  /** Display name of the folder or endpoint. */
  name: string;
  /** Nested child items (sub-folders or endpoints). */
  item?: ItemShape[];
  /** Request details (present when this is an endpoint, not a folder). */
  request?: MethodLike["request"];
  /** Example responses (present when this is an endpoint, not a folder). */
  response?: MethodLike["response"];
}

/**
 * Creates a markdown structure from a JSON document type definition.
 */
export const createMarkdown = (data: JsonDocument): string => {
  if (!data || !data.info) return "";
  const parts: string[] = [];
  parts.push(`# ${data.info.name || ""}\n\n`);
  if (data.info.description !== undefined) {
    parts.push(`${data.info.description || ""}\n`);
  }
  parts.push(readItems((data.item || []) as unknown as ItemShape[]));
  parts.push("\n\n");
  return parts.join("");
};

/**
 * Generates markdown for displaying authorization information.
 */
export const readAuthorization = (
  data: AuthorizationInfo | undefined,
): string => {
  if (!data || !data.bearer) return "";
  const parts: string[] = [];
  parts.push(`## 🔑 Authentication ${data.type}\n\n`);
  parts.push("|Param|value|Type|\n");
  parts.push("|---|---|---|\n");
  for (let i = 0, len = data.bearer.length; i < len; i++) {
    const auth = data.bearer[i];
    parts.push(`|${auth.key}|${auth.value}|${auth.type}|\n`);
  }
  parts.push("\n\n");
  return parts.join("");
};

/**
 * Generates markdown for displaying request headers.
 */
export function readRequest(data: JsonRequest | undefined): string {
  if (!data || !data.header) return "";
  const parts: string[] = [];
  parts.push("\n### Request Headers\n\n");
  parts.push("|Parameter|Value|Description|\n");
  parts.push("|---|---|---|\n");
  for (let i = 0, len = data.header.length; i < len; i++) {
    const header = data.header[i];
    parts.push(`|${header.key}|${header.value}|${header.description}|\n`);
  }
  return parts.join("");
}

/**
 * Generates markdown for displaying query parameters.
 */
export function readQueryParams(
  url: UrlWithQuery | string | null | undefined,
): string {
  if (!url || typeof url === "string" || !url.query) return "";
  const parts: string[] = [];
  parts.push("### Query Params\n\n");
  parts.push("|Param|value|\n");
  parts.push("|---|---|\n");
  for (let i = 0, len = url.query.length; i < len; i++) {
    const param = url.query[i];
    if (param) parts.push(`|${param.key}|${param.value}|\n`);
  }
  parts.push("\n\n");
  return parts.join("");
}

/**
 * Read body section of a method definition.
 */
export function readFormDataBody(body: BodyShape | null | undefined): string {
  if (!body) return "";
  const parts: string[] = [];
  if (body.mode === "raw") {
    parts.push(`### Body (**${body.mode}**)\n\n`);
    parts.push("```json\n");
    parts.push(`${body.raw ?? ""}\n`);
    parts.push("```\n\n");
  }
  if (body.mode === "formdata" && body.formdata) {
    parts.push(`### Body ${body.mode}\n\n`);
    parts.push("|Param|value|Type|\n");
    parts.push("|---|---|---|\n");
    for (let i = 0, len = body.formdata.length; i < len; i++) {
      const form = body.formdata[i];
      const value =
        form.type === "file"
          ? (form.src ?? "")
          : form.value !== undefined
            ? form.value.replace(/\\n/g, "")
            : "";
      parts.push(`|${form.key}|${value}|${form.type}|\n`);
    }
    parts.push("\n\n");
  }
  return parts.join("");
}

/**
 * Read responses for a method.
 */
export function readResponse(responses: ResponseType[] | undefined): string {
  if (!responses || responses.length === 0) return "";
  const parts: string[] = [];
  const first = responses[0];
  parts.push("### Response\n\n");
  parts.push("|Code|Status|\n");
  parts.push("|---|---|\n");
  for (let i = 0, len = responses.length; i < len; i++) {
    const resp = responses[i];
    if (resp) parts.push(`|${resp.code}|${resp.status}|\n`);
  }
  parts.push("\n#### Example response\n\n");
  parts.push("```json\n");
  parts.push(`${first.body}\n`);
  parts.push("```\n\n");
  return parts.join("");
}

/**
 * Read methods of each item.
 */
export function readMethods(method: MethodLike): string {
  const parts: string[] = ["\n"];
  if (method.request?.description !== undefined) {
    parts.push(`#${method.request.description || ""}\n\n`);
  }
  parts.push(`### ${method.request?.method ?? ""} ${method.name}\n\n`);
  parts.push(">```\n");
  const urlString =
    typeof method.request?.url === "string" ? method.request.url : "";
  parts.push(`>${urlString}\n`);
  parts.push(">```\n");
  parts.push(readRequest(method.request));
  parts.push(readFormDataBody(method.request?.body));
  parts.push(readQueryParams(method.request?.url));
  parts.push(readAuthorization(method.request?.auth));
  parts.push(readResponse(method.response));
  parts.push("\n![divider][divider]\n");
  return parts.join("");
}

/**
 * Read items of a Postman-shaped collection.
 */
export function readItems(items: ItemShape[], folderDeep = 1): string {
  const parts: string[] = [];
  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i] as ItemShape;
    if (item.item) {
      parts.push(`${"#".repeat(folderDeep)} 📁 Collection: ${item.name} \n`);
      parts.push(readItems(item.item, folderDeep + 1));
    } else {
      parts.push(readMethods(item as unknown as MethodLike));
    }
  }
  return parts.join("");
}

/**
 * Creates a markdown file with specified content.
 */
export const response = async (
  content: string,
  fileName: string,
): Promise<void> => {
  const dir = path.resolve(__dirname, "../../src/docs");
  await mkdir(dir, { recursive: true });
  // Sanitize fileName to prevent path traversal
  const safeName = path.basename(fileName);
  await writeFile(path.join(dir, safeName + ".md"), content, "utf8");
};

/**
 * Default utility namespace exposing the primary markdown helpers.
 *
 * @example
 * ```ts
 * import utils from "./utils";
 *
 * const md = utils.createMarkdown(collection);
 * await utils.response(md, "api-docs");
 * ```
 */
const utils: {
  /** Converts a Postman-shaped JSON document into a markdown string. */
  createMarkdown: typeof createMarkdown;
  /** Writes a markdown string to a file in the docs directory. */
  response: typeof response;
} = { createMarkdown, response };

export default utils;
