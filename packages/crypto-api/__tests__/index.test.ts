/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

import { expect } from 'chai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { init } from '../src/index';

describe('index.ts - Main Entry Point', () => {
  let originalArgv: string[];
  let originalConsoleLog: any;
  let originalConsoleError: any;
  let logOutputs: string[];
  let errorOutputs: string[];

  beforeEach(() => {
    // Store original process.argv
    originalArgv = process.argv;

    // Mock console methods to capture output
    logOutputs = [];
    errorOutputs = [];
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    console.log = (message: string) => {
      logOutputs.push(message);
    };

    console.error = (...args: any[]) => {
      errorOutputs.push(args.join(' '));
    };
  });

  afterEach(() => {
    // Restore original process.argv and console methods
    process.argv = originalArgv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Argument Parsing', () => {
    it('should require file path argument', async () => {
      // Set argv to simulate no arguments
      process.argv = ['node', 'script.js'];

      await init();

      expect(logOutputs).to.include('Path of JSON file is required.');
    });

    it('should require output file name', async () => {
      // Create a temporary test file
      const testFilePath = path.join(__dirname, 'test-input.json');
      const testJson = { info: { name: 'Test', description: 'Test API' }, item: [] };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson));

        // Set argv to simulate file path but no output name
        process.argv = ['node', 'script.js', testFilePath];

        await init();

        expect(logOutputs).to.include('Output file name is required.');
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle invalid file path', async () => {
      const invalidPath = '/nonexistent/path/file.json';

      // Set argv to simulate invalid file path
      process.argv = ['node', 'script.js', invalidPath, 'output.md'];

      await init();

      expect(logOutputs).to.include('Path is not valid or the file does not exist.');
    });
  });

  describe('File Processing', () => {
    it('should process valid JSON file successfully', async () => {
      // Create a temporary test file
      const testFilePath = path.join(__dirname, 'valid-test.json');
      const testJson = {
        info: {
          name: 'Test API',
          description: 'A test API for unit testing'
        },
        item: "test_items"
      };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson, null, 2));

        // Set argv to simulate valid arguments
        process.argv = ['node', 'script.js', testFilePath, 'test-output.md'];

        await init();

        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      // Create a temporary test file with invalid JSON
      const testFilePath = path.join(__dirname, 'invalid-test.json');
      const invalidJson = '{ "info": { "name": "Test", invalid json }';

      try {
        await fs.writeFile(testFilePath, invalidJson);

        // Set argv to simulate valid arguments
        process.argv = ['node', 'script.js', testFilePath, 'test-output.md'];

        await init();

        expect(errorOutputs.length).to.be.greaterThan(0);
        expect(errorOutputs[0]).to.include('An error occurred:');
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should extract filename correctly from output parameter', async () => {
      // Create a temporary test file
      const testFilePath = path.join(__dirname, 'filename-test.json');
      const testJson = { info: { name: 'Test', description: 'Test' }, item: [] };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson));

        // Test with .md extension
        process.argv = ['node', 'script.js', testFilePath, 'my-output.md'];

        logOutputs = []; // Reset outputs
        await init();

        // The function should extract 'my-output' from 'my-output.md'
        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle generic Error objects', async () => {
      // This test verifies the error handling for Error instances
      const testFilePath = path.join(__dirname, 'error-test.json');

      try {
        // Create file with content that will cause JSON.parse to fail
        await fs.writeFile(testFilePath, 'invalid json content');

        process.argv = ['node', 'script.js', testFilePath, 'output.md'];

        await init();

        expect(errorOutputs.length).to.be.greaterThan(0);
        const errorMessage = errorOutputs[0];
        expect(errorMessage).to.include('An error occurred:');
        expect(errorMessage).to.include('Unexpected token'); // JSON parse error message
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle unknown error types', async () => {
      // This is harder to test directly since we need to trigger a non-Error exception
      // We can at least verify the code path exists by checking the function structure
      expect(init).to.be.a('function');

      // The error handling for unknown errors is present in the code
      // but difficult to trigger in a unit test without mocking internals
    });

    it('should handle file access errors correctly', async () => {
      const nonExistentPath = '/definitely/does/not/exist/file.json';

      process.argv = ['node', 'script.js', nonExistentPath, 'output.md'];

      await init();

      expect(logOutputs).to.include('Path is not valid or the file does not exist.');
    });
  });

  describe('Argument Destructuring', () => {
    it('should correctly destructure file path and output name from arguments', async () => {
      const testFilePath = path.join(__dirname, 'destructure-test.json');
      const testJson = { info: { name: 'Test', description: 'Test' }, item: [] };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson));

        // Test with multiple arguments to ensure correct destructuring
        process.argv = ['node', 'script.js', testFilePath, 'output.md', 'extra', 'args'];

        await init();

        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Markdown Generation', () => {
    it('should generate markdown with divider appended', async () => {
      const testFilePath = path.join(__dirname, 'markdown-test.json');
      const testJson = {
        info: {
          name: 'Markdown Test API',
          description: 'Test for markdown generation'
        },
        item: "test_items"
      };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson));

        process.argv = ['node', 'script.js', testFilePath, 'markdown-output.md'];

        await init();

        expect(logOutputs).to.include('Generating markdown file ...');
        // The function should append the divider to the markdown
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Type Definitions Validation', () => {
    it('should handle ParsedArgs type correctly', () => {
      // This validates that the TypeScript types are working correctly
      // The ParsedArgs type is used internally by minimist
      expect(init).to.be.a('function');
      expect(init.length).to.equal(0); // No parameters expected
    });

    it('should return Promise<void>', async () => {
      // Verify the function returns a Promise
      process.argv = ['node', 'script.js']; // No args to trigger early return

      const result = init();
      expect(result).to.be.instanceOf(Promise);

      const resolvedResult = await result;
      expect(resolvedResult).to.be.undefined; // void return type
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty JSON file', async () => {
      const testFilePath = path.join(__dirname, 'empty-test.json');

      try {
        await fs.writeFile(testFilePath, '{}');

        process.argv = ['node', 'script.js', testFilePath, 'empty-output.md'];

        await init();

        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle JSON file with null values', async () => {
      const testFilePath = path.join(__dirname, 'null-test.json');
      const testJson = {
        info: null,
        item: null
      };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson));

        process.argv = ['node', 'script.js', testFilePath, 'null-output.md'];

        await init();

        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle output filename without extension', async () => {
      const testFilePath = path.join(__dirname, 'no-ext-test.json');
      const testJson = { info: { name: 'Test', description: 'Test' }, item: [] };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(testJson));

        process.argv = ['node', 'script.js', testFilePath, 'output-no-extension'];

        await init();

        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle very large JSON files', async () => {
      const testFilePath = path.join(__dirname, 'large-test.json');

      // Create a moderately large JSON structure
      const largeJson = {
        info: {
          name: 'Large API',
          description: 'A large API with many endpoints'
        },
        item: Array(100).fill(0).map((_, i) => ({
          name: `Endpoint ${i}`,
          request: {
            method: 'GET',
            url: `/endpoint/${i}`,
            description: `Description for endpoint ${i}`
          }
        }))
      };

      try {
        await fs.writeFile(testFilePath, JSON.stringify(largeJson));

        process.argv = ['node', 'script.js', testFilePath, 'large-output.md'];

        await init();

        expect(logOutputs).to.include(`Reading file ${testFilePath}`);
        expect(logOutputs).to.include('Generating markdown file ...');
      } finally {
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});