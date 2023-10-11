/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

import { AuthorizationInfo, JsonDocument, JsonRequest, ResponseType } from "../@types/types";
import * as fs from "fs";
import path from "path";

/**
 * Creates a markdown structure from a JSON document type definition.
 *
 * @param data - The JSON data to be converted into markdown format.
 * @returns - The markdown string representing the input data.
 */
export const createMarkdown = (data: JsonDocument): string => {
  let markdown = "";
  if (data) {
    markdown += `# ${data.info.name}\n\n`;
    markdown +=
      data.info.description !== undefined
        ? `${data.info.description || ""}\n`
        : ``;
    markdown += readItems(data.item);
    markdown += `\n`;
    markdown += `\n`;
  }
  return markdown;
};

/**
 * Generates markdown for displaying authorization information.
 *
 * @param data - The authorization data to be converted into markdown format.
 * @returns - The markdown string representing the authorization data.
 */
export const readAuthorization = (data: AuthorizationInfo): string => {
  let markdown = "";
  if (data) {
    if (data.bearer) {
      markdown += `## 🔑 Authentication ${data.type}\n`;
      markdown += `\n`;
      markdown += `|Param|value|Type|\n`;
      markdown += `|---|---|---|\n`;

      data.bearer.map((auth) => {
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
 *
 * @param data - The request data containing headers information.
 * @returns - The markdown string representing the request headers.
 */
export function readRequest(data: JsonRequest): string {
  let markdown = "\n";
  markdown += `### Request Headers\n`;
  markdown += `\n`;
  markdown += `|Parameter|Value|Description|\n`;
  markdown += `|---|---|---|\n`;
  data.header.map((header) => {
    markdown += `|${header.key}|${header.value}|${header.description}|\n`;
  });
  return markdown;
}


/**
 * Generates markdown for displaying response headers.
 *
 * @param data - The response data containing headers information.
 * @param statusCode - The status code of the response.
 * @param headers - The headers of the response.
 * @param body - The body of the response.
 * @returns - The markdown string representing the response headers.
 * */
export function readQueryParams(url) {
  let markdown = "";
  if (url?.query) {
    markdown += `### Query Params\n`;
    markdown += `\n`;
    markdown += `|Param|value|\n`;
    markdown += `|---|---|\n`;
    url.query.map((query) => {
      markdown += `|${query.key}|${query.value}|\n`;
    });
    markdown += `\n`;
    markdown += `\n`;
  }
  return markdown;
}

/**
 * Read objects of each method
 * @param {object} body
 */
export function readFormDataBody(body) {
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
      body.formdata.map((form) => {
        markdown += `|${form.key}|${
          form.type === "file"
            ? form.src
            : form.value !== undefined
            ? form.value.replace(/\\n/g, "")
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
 * Read methods of response.
 *
 * @param responses - An array of response objects, each containing code, status, and body properties.
 * @returns A markdown string that documents the response codes, statuses, and an example body.
 */
export function readResponse(responses: ResponseType[]): string {
  let markdown = "";
  if (responses?.length) {
    const response = responses[0];
    console.log(response);
    markdown += `### Response\n`;
    markdown += `\n`;
    markdown += `|Code|Status|\n`;
    markdown += `|---|---|\n`;
    responses.map((response) => {
      markdown += `|${response.code}|${response.status}|\n`;
    });
    markdown += `\n`;
    markdown += `#### Example response\n`;
    markdown += `\n`;
    markdown += `\`\`\`json\n`;
    markdown += `${response.body}\n`;
    markdown += `\`\`\`\n`;
    markdown += `\n`;
  }
  return markdown;
}

/**
 * Read methods of each item
 * @param {object} post
 */
export function readMethods(method) {
  let markdown = "";
  console.log(method);
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
 * Read items of json postman
 * @param {Array} items
 */
export function readItems(items, folderDeep = 1) {
  let markdown = "";
  items.forEach((item) => {
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
 * Creates a markdown file with specified content.
 *
 * @param content - The markdown content to be written to the file.
 * @param fileName - The name of the file (without extension) to be created.
 */
export const response = async (content: string, fileName: string) => {
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
