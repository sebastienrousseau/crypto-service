/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

/**
 * @fileoverview This module initializes a script that parses JSON data to generate
 * markdown content, validates file existence, reads, and parses the JSON data,
 * then utilizes utility functions to generate and handle the markdown content.
 */

import minimist from 'minimist';
import * as fs from 'fs/promises';
import { createMarkdown, response } from './utils';

/**
 * @typedef {Object} ParsedArgs
 * @property {string[]} _ - Positional arguments (unnamed arguments)
 * @property {Object<string, *>} [options] - Additional options/flags provided in the command line
 */

/**
 * Asynchronously initializes the script to convert JSON data to markdown and handle it.
 * It parses command-line arguments for file paths, validates file existence,
 * reads, and parses JSON data, generates markdown, and handles the response.
 *
 * @returns {Promise<void>} No return value
 */
export async function init(): Promise<void> {
  try {
    /**
     * Parses the command-line arguments.
     * @type {ParsedArgs}
     */
    const args = minimist(process.argv.slice(2));

    /**
     * Destructures to get the file path and output file name from the arguments.
     * @type {string[]}
     */
    const [filePath, outputFileName] = args['_'];

    if (!filePath) {
      console.log('Path of JSON file is required.');
      return;
    }

    console.log(`Reading file ${filePath}`);

    try {
      await fs.access(filePath);
    } catch (error) {
      console.log('Path is not valid or the file does not exist.');
      return;
    }

    console.log('Generating markdown file ...');

    /**
     * Reads the file and parses its content to JSON.
     * @type {Buffer}
     */
    const rawData = await fs.readFile(filePath);

    /**
     * Parses the raw data into a JSON object.
     * @type {Object}
     */
    const json = JSON.parse(rawData.toString());

    /**
     * Generates markdown using a utility function and appends a divider.
     * @type {string}
     */
    let markdown = createMarkdown(json);
    markdown += '[divider]: https://kura.pro/common/images/elements/divider.svg';

    if (outputFileName) {
      /**
       * Extracts the file name without extension.
       * @type {string}
       */
      const fileName = outputFileName.split('.')[0];

      response(markdown, fileName);
    } else {
      console.log('Output file name is required.');
    }
  } catch (error) {
    if (error instanceof Error) {
        console.error('An error occurred:', error.message);
    } else {
        console.error('An unknown error occurred:', error);
    }
  }
}

init();
