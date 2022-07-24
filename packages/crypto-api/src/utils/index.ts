import { jsonAuth, jsonDocument, jsonRequest } from "../@types/types";
import * as fs from "fs";
import path from "path";
/**
 * Create a skeleton of a markdown file from the json document type definition.
 * @param {object} data - The data to be inserted into the skeleton.
 * @return {string} Structure of the markdown file as a string.
 */
export const createMarkdown = (data: jsonDocument): string => {

  let markdown = ''
  if (data) {
    markdown += `# ${data.info.name}\n\n`
    markdown += data.info.description !== undefined ? `${data.info.description || ''}\n` : ``
    markdown += readItems(data.item)
    markdown += `\n`
    markdown += `\n`
  }
  return markdown
}

/**
 * Read auth of each method
 * @param {object} data
 * @return {string}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readAuthorization = (data: jsonAuth): string => {
  let markdown = ''
  if (data) {
    if (data.bearer) {
      markdown += `## 🔑 Authentication ${data.type}\n`
      markdown += `\n`
      markdown += `|Param|value|Type|\n`
      markdown += `|---|---|---|\n`

      data.bearer.map(auth => {
        markdown += `|${auth.key}|${auth.value}|${auth.type}|\n`
      })
      markdown += `\n`
      markdown += `\n`
    }
  }
  return markdown
}

/**
 * Read request of each method
 * @param {object} request information
 * @return {string} info of data about request options
 */
export function readRequest(data: jsonRequest): string {
  let markdown = '\n'
  markdown += `### Request Headers\n`
  markdown += `\n`
  markdown += `|Parameter|Value|Description|\n`
  markdown += `|---|---|---|\n`
  data.header.map(header => {
    markdown += `|${header.key}|${header.value}|${header.description}|\n`
  })
  return markdown
}

export function readQueryParams(url) {
  let markdown = ''
  if (url?.query) {
    markdown += `### Query Params\n`
    markdown += `\n`
    markdown += `|Param|value|\n`
    markdown += `|---|---|\n`
    url.query.map(query => {
      markdown += `|${query.key}|${query.value}|\n`
    })
    markdown += `\n`
    markdown += `\n`
  }
  return markdown
}

/**
 * Read objects of each method
 * @param {object} body
 */
export function readFormDataBody(body) {
  let markdown = ''

  if (body) {
    if (body.mode === 'raw') {
      markdown += `### Body (**${body.mode}**)\n`
      markdown += `\n`
      markdown += `\`\`\`json\n`
      markdown += `${body.raw}\n`
      markdown += `\`\`\`\n`
      markdown += `\n`
    }

    if (body.mode === 'formdata') {
      markdown += `### Body ${body.mode}\n`
      markdown += `\n`
      markdown += `|Param|value|Type|\n`
      markdown += `|---|---|---|\n`
      body.formdata.map(form => {
        markdown += `|${form.key}|${form.type === 'file' ? form.src : form.value !== undefined ? form.value.replace(/\\n/g, '') : ''}|${form.type}|\n`
      })
      markdown += `\n`
      markdown += `\n`
    }
  }

  return markdown
}

/**
 * Read methods of response
 * @param {array} responses
 */
export function readResponse(responses) {
  let markdown = ''
  if (responses?.length) {
    const response = responses[0];
    console.log(response);
    markdown += `### Response\n`
    markdown += `\n`
    markdown += `|Code|Status|\n`
    markdown += `|---|---|\n`
    responses.map(response => {
    markdown += `|${response.code}|${response.status}|\n`
    })
    markdown += `\n`
    markdown += `#### Example response\n`
    markdown += `\n`
    markdown += `\`\`\`json\n`
    markdown += `${response.body}\n`
    markdown += `\`\`\`\n`
    markdown += `\n`
  }
  return markdown;
}

/**
 * Read methods of each item
 * @param {object} post
 */
export function readMethods(method) {
  let markdown = ''

  markdown += `\n`
  markdown += method?.request?.description !== undefined ? `#${method?.request?.description || ''}\n\n` : ``
  markdown += `### ${method?.request?.method} ${method.name}\n\n`
  markdown += `>\`\`\`\n`
  markdown += `>${method?.request?.url?.raw}\n`
  markdown += `>\`\`\`\n`
  markdown += readRequest(method?.request)
  markdown += readFormDataBody(method?.request?.body)
  markdown += readQueryParams(method?.request?.url)
  markdown += readAuthorization(method?.request?.auth)
  markdown += readResponse(method?.response)
  markdown += `\n`
  markdown += `![divider][divider]\n`

  return markdown
}

/**
 * Read items of json postman
 * @param {Array} items
 */
export function readItems(items, folderDeep = 1) {
  let markdown = ''
  items.forEach(item => {
    if (item.item) {
      markdown += `${'#'.repeat(folderDeep)} 📁 Collection: ${item.name} \n`
      markdown += readItems(item.item, folderDeep + 1)
    } else {
      markdown += readMethods(item)
    }
  })

  return markdown
}

/**
 * Create file
 * @param {string} content
 */

export const response = async (content: string, fileName: string) => {
  const output =
    fs.createWriteStream(
      path
        .resolve(__dirname, "../../src/docs/" + fileName + ".md"));
  output.write(content);
  output.on("finish", () => {
    console.log(
      "📝 Documentation was created correctly `" + fileName + ".md`",
    );
  });
  output.end();
};

export default { createMarkdown, response }
