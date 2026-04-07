/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * NOTE: this package is a Postman→Markdown converter and is mis-named as
 * `crypto-api`. It has no cryptographic code. See package.json for the
 * renaming proposal.
 */

import {
  AuthorizationInfo,
  JsonDocument,
  JsonRequest,
  ResponseType,
} from "../@types/types";
import * as fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/**
 * Creates a markdown structure from a Postman-style JSON document.
 *
 * Defensive against malformed input: a missing `info` block or a missing
 * `item` array no longer throws — both were real crashes that the new
 * test suite caught.
 */
export const createMarkdown = (
  data: JsonDocument | null | undefined,
): string => {
  let markdown = "";
  if (!data) return markdown;
  if (data.info) {
    markdown += `# ${data.info.name ?? ""}\n\n`;
    if (data.info.description !== undefined) {
      markdown += `${data.info.description || ""}\n`;
    }
  }
  if (Array.isArray(data.item)) {
    markdown += readItems(data.item as unknown as Loose[]);
  }
  markdown += "\n";
  markdown += "\n";
  return markdown;
};

/**
 * Generates markdown for displaying authorization information.
 */
export const readAuthorization = (data: AuthorizationInfo): string => {
  let markdown = "";
  if (data) {
    if (data.bearer) {
      markdown += `## 🔑 Authentication ${data.type}\n`;
      markdown += `\n`;
      markdown += `|Param|value|Type|\n`;
      markdown += `|---|---|---|\n`;

      data.bearer.forEach((auth) => {
        markdown += `|${auth.key}|${auth.value}|${auth.type}|\n`;
      });
      markdown += `\n`;
      markdown += `\n`;
    }
  }
  return markdown;
};

/**
 * Generates markdown for displaying request headers.
 */
export function readRequest(data: JsonRequest): string {
  let markdown = "\n";
  markdown += `### Request Headers\n`;
  markdown += `\n`;
  markdown += `|Parameter|Value|Description|\n`;
  markdown += `|---|---|---|\n`;
  data.header.forEach((header) => {
    markdown += `|${header.key}|${header.value}|${header.description}|\n`;
  });
  return markdown;
}

/**
 * Generates markdown for the query-string parameters of a Postman request URL.
 * Returns the empty string when the URL has no `query` array.
 */
export function readQueryParams(url: Loose): string {
  let markdown = "";
  if (url?.query) {
    markdown += `### Query Params\n`;
    markdown += `\n`;
    markdown += `|Param|value|\n`;
    markdown += `|---|---|\n`;
    url.query.forEach((query: Loose) => {
      markdown += `|${query.key}|${query.value}|\n`;
    });
    markdown += `\n`;
    markdown += `\n`;
  }
  return markdown;
}

/**
 * Generates markdown for the request body of a Postman request, supporting
 * both `raw` (JSON) and `formdata` modes. Returns the empty string for
 * unsupported or missing body shapes.
 */
export function readFormDataBody(body: Loose): string {
  let markdown = "";

  if (body) {
    if (body.mode === "raw") {
      markdown += `### Body (**${body.mode}**)\n`;
      markdown += `\n`;
      markdown += `\`\`\`json\n`;
      markdown += `${body.raw}\n`;
      markdown += `\`\`\`\n`;
      markdown += `\n`;
    }

    if (body.mode === "formdata") {
      markdown += `### Body ${body.mode}\n`;
      markdown += `\n`;
      markdown += `|Param|value|Type|\n`;
      markdown += `|---|---|---|\n`;
      body.formdata.forEach((form: Loose) => {
        markdown += `|${form.key}|${
          form.type === "file"
            ? form.src
            : form.value !== undefined
              ? String(form.value).replace(/\\n/g, "")
              : ""
        }|${form.type}|\n`;
      });
      markdown += `\n`;
      markdown += `\n`;
    }
  }

  return markdown;
}

/**
 * Generates markdown for the example responses attached to a Postman request.
 * Returns the empty string when there are no responses.
 */
export function readResponse(responses: ResponseType[]): string {
  let markdown = "";
  if (responses?.length) {
    const example = responses[0];
    markdown += `### Response\n`;
    markdown += `\n`;
    markdown += `|Code|Status|\n`;
    markdown += `|---|---|\n`;
    responses.forEach((r) => {
      markdown += `|${r.code}|${r.status}|\n`;
    });
    markdown += `\n`;
    markdown += `#### Example response\n`;
    markdown += `\n`;
    markdown += `\`\`\`json\n`;
    markdown += `${example.body}\n`;
    markdown += `\`\`\`\n`;
    markdown += `\n`;
  }
  return markdown;
}

/**
 * Generates markdown for a single Postman request, including its method,
 * URL, headers, body, query params, auth and example responses.
 */
export function readMethods(method: Loose): string {
  let markdown = "";
  markdown += `\n`;
  markdown +=
    method?.request?.description !== undefined
      ? `#${method?.request?.description || ""}\n\n`
      : ``;
  markdown += `### ${method?.request?.method} ${method.name}\n\n`;
  markdown += `>\`\`\`\n`;
  markdown += `>${method?.request?.url}\n`;
  markdown += `>\`\`\`\n`;
  markdown += readRequest(method?.request);
  markdown += readFormDataBody(method?.request?.body);
  markdown += readQueryParams(method?.request?.url);
  markdown += readAuthorization(method?.request?.auth);
  markdown += readResponse(method?.response);
  markdown += `\n`;
  markdown += `![divider][divider]\n`;

  return markdown;
}

/**
 * Recursively walks a Postman collection's `item` array, emitting headings
 * for nested folders and per-method markdown for leaves. `folderDeep`
 * controls the heading level for the current folder.
 */
export function readItems(items: Loose[], folderDeep = 1): string {
  let markdown = "";
  items.forEach((item: Loose) => {
    if (item.item) {
      markdown += `${"#".repeat(folderDeep)} 📁 Collection: ${item.name} \n`;
      markdown += readItems(item.item, folderDeep + 1);
    } else {
      markdown += readMethods(item);
    }
  });

  return markdown;
}

/**
 * Writes generated markdown to `src/docs/<fileName>.md`. Synchronous from the
 * caller's point of view: opens a write stream, pushes the content, and
 * closes it. Logs a confirmation when the underlying stream finishes.
 */
export const response = (content: string, fileName: string): void => {
  const output = fs.createWriteStream(
    path.resolve(__dirname, "../../src/docs/" + fileName + ".md"),
  );
  output.write(content);
  output.on("finish", () => {
    console.log("📝 Documentation was created correctly `" + fileName + ".md`");
  });
  output.end();
};

export default { createMarkdown, response };
