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
 * Narrow shapes used by the body/query/method helpers. The upstream payload
 * is a Postman collection export with a loose schema — only the fields we
 * actually render are typed here.
 */
interface UrlWithQuery {
  query?: Array<{ key: string; value: string }>;
}

interface BodyFormField {
  key: string;
  type: string;
  src?: string | undefined;
  value?: string | undefined;
}

interface BodyShape {
  mode?: string;
  raw?: string;
  formdata?: BodyFormField[];
}

interface MethodLike {
  name: string;
  request?: JsonRequest & {
    method?: string;
    description?: string;
    url?: UrlWithQuery | string;
    body?: BodyShape;
    auth?: AuthorizationInfo;
  };
  response?: ResponseType[];
}

interface ItemShape {
  name: string;
  item?: ItemShape[];
  request?: MethodLike["request"];
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
    const item = items[i]!;
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
