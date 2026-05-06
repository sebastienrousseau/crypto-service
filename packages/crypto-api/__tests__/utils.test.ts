/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

import { expect } from 'chai';
import {
  createMarkdown,
  readAuthorization,
  readRequest,
  readQueryParams,
  readFormDataBody,
  readResponse,
  readItems,
} from '../src/utils';
import {
  JsonDocument,
  AuthorizationInfo,
  JsonRequest,
  ResponseType
} from '../src/@types/types';

describe('utils/index.ts - Core Utility Functions', () => {
  let originalConsoleLog: typeof console.log;
  let logOutput: string[];

  beforeEach(() => {
    // Mock console.log to capture output
    originalConsoleLog = console.log;
    logOutput = [];
    console.log = (message: string) => {
      logOutput.push(message);
    };
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  describe('createMarkdown', () => {
    it('should generate markdown from JsonDocument with all fields', () => {
      const testDoc: JsonDocument = {
        info: {
          name: 'Test API',
          description: 'A comprehensive test API'
        },
        item: [] // Array type to match readItems implementation
      };

      const result = createMarkdown(testDoc);

      expect(result).to.include('# Test API\n\n');
      expect(result).to.include('A comprehensive test API\n');
      expect(result).to.include('\n\n');
    });

    it('should generate markdown from JsonDocument without description', () => {
      const testDoc: JsonDocument = {
        info: {
          name: 'Simple API',
          description: ''
        },
        item: []
      };

      const result = createMarkdown(testDoc);

      expect(result).to.include('# Simple API\n\n');
    });

    it('should handle null/undefined data gracefully', () => {
      const result = createMarkdown(null as never);
      expect(result).to.equal('');
    });

    it('should handle undefined description', () => {
      const testDoc = {
        info: {
          name: 'Test API',
          description: undefined
        },
        item: []
      } as unknown as JsonDocument;

      const result = createMarkdown(testDoc);
      expect(result).to.include('# Test API\n\n');
    });
  });

  describe('readAuthorization', () => {
    it('should generate authorization markdown with bearer tokens', () => {
      const authData: AuthorizationInfo = {
        bearer: [{
          key: 'Authorization',
          type: 'Bearer',
          value: 'token123'
        }],
        key: 'auth_key',
        type: 'Bearer',
        value: 'auth_value'
      };

      const result = readAuthorization(authData);

      expect(result).to.include('## 🔑 Authentication Bearer');
      expect(result).to.include('|Param|value|Type|');
      expect(result).to.include('|---|---|---|');
      expect(result).to.include('|Authorization|token123|Bearer|');
    });

    it('should handle multiple bearer tokens', () => {
      const authData: AuthorizationInfo = {
        bearer: [
          { key: 'Authorization', type: 'Bearer', value: 'token1' },
          { key: 'X-API-Key', type: 'ApiKey', value: 'key123' }
        ],
        key: 'auth_key',
        type: 'Bearer',
        value: 'auth_value'
      };

      const result = readAuthorization(authData);

      expect(result).to.include('|Authorization|token1|Bearer|');
      expect(result).to.include('|X-API-Key|key123|ApiKey|');
    });

    it('should handle null/undefined data gracefully', () => {
      const result = readAuthorization(null as never);
      expect(result).to.equal('');
    });

    it('should handle auth data without bearer tokens', () => {
      const authData: AuthorizationInfo = {
        bearer: null as never,
        key: 'auth_key',
        type: 'Bearer',
        value: 'auth_value'
      };

      const result = readAuthorization(authData);
      expect(result).to.equal('');
    });
  });

  describe('readRequest', () => {
    it('should generate request headers markdown', () => {
      const requestData: JsonRequest = {
        header: [
          {
            key: 'Content-Type',
            value: 'application/json',
            description: 'Request content type'
          },
          {
            key: 'Authorization',
            value: 'Bearer token123',
            description: 'Auth header'
          }
        ],
        key: 'request_key',
        value: 'request_value',
        description: 'Test request'
      };

      const result = readRequest(requestData);

      expect(result).to.include('### Request Headers');
      expect(result).to.include('|Parameter|Value|Description|');
      expect(result).to.include('|---|---|---|');
      expect(result).to.include('|Content-Type|application/json|Request content type|');
      expect(result).to.include('|Authorization|Bearer token123|Auth header|');
    });

    it('should handle empty headers array', () => {
      const requestData: JsonRequest = {
        header: [],
        key: 'request_key',
        value: 'request_value',
        description: 'Test request'
      };

      const result = readRequest(requestData);

      expect(result).to.include('### Request Headers');
      expect(result).to.include('|Parameter|Value|Description|');
      expect(result).to.include('|---|---|---|');
    });
  });

  describe('readQueryParams', () => {
    it('should generate query params markdown when query exists', () => {
      const url = {
        query: [
          { key: 'limit', value: '10' },
          { key: 'offset', value: '0' }
        ]
      };

      const result = readQueryParams(url);

      expect(result).to.include('### Query Params');
      expect(result).to.include('|Param|value|');
      expect(result).to.include('|---|---|');
      expect(result).to.include('|limit|10|');
      expect(result).to.include('|offset|0|');
    });

    it('should return empty string when no query params', () => {
      const result = readQueryParams(null);
      expect(result).to.equal('');

      const urlWithoutQuery = {};
      const result2 = readQueryParams(urlWithoutQuery);
      expect(result2).to.equal('');
    });

    it('should handle empty query array', () => {
      const url = { query: [] };
      const result = readQueryParams(url);

      expect(result).to.include('### Query Params');
      expect(result).to.include('|Param|value|');
    });
  });

  describe('readFormDataBody', () => {
    it('should handle raw body mode', () => {
      const body = {
        mode: 'raw',
        raw: '{"test": "data"}'
      };

      const result = readFormDataBody(body);

      expect(result).to.include('### Body (**raw**)');
      expect(result).to.include('```json');
      expect(result).to.include('{"test": "data"}');
      expect(result).to.include('```');
    });

    it('should handle formdata body mode', () => {
      const body = {
        mode: 'formdata',
        formdata: [
          { key: 'name', value: 'John Doe', type: 'text' },
          { key: 'avatar', src: '/path/to/file', type: 'file' }
        ]
      };

      const result = readFormDataBody(body);

      expect(result).to.include('### Body formdata');
      expect(result).to.include('|Param|value|Type|');
      expect(result).to.include('|---|---|---|');
      expect(result).to.include('|name|John Doe|text|');
      expect(result).to.include('|avatar|/path/to/file|file|');
    });

    it('should handle formdata with newlines in values', () => {
      const body = {
        mode: 'formdata',
        formdata: [
          { key: 'description', value: 'Line 1\\nLine 2\\nLine 3', type: 'text' }
        ]
      };

      const result = readFormDataBody(body);

      expect(result).to.include('|description|Line 1Line 2Line 3|text|');
    });

    it('should handle formdata with undefined values', () => {
      const body = {
        mode: 'formdata',
        formdata: [
          { key: 'empty', value: undefined, type: 'text' }
        ]
      };

      const result = readFormDataBody(body);

      expect(result).to.include('|empty||text|');
    });

    it('should return empty string for null body', () => {
      const result = readFormDataBody(null);
      expect(result).to.equal('');
    });

    it('should ignore unknown body modes', () => {
      const body = {
        mode: 'unknown',
        data: 'test'
      };

      const result = readFormDataBody(body);
      expect(result).to.equal('');
    });
  });

  describe('readResponse', () => {
    it('should generate response markdown with single response', () => {
      const responses: ResponseType[] = [{
        code: 200,
        status: 'OK',
        body: '{"success": true}'
      }];

      const result = readResponse(responses);

      expect(result).to.include('### Response');
      expect(result).to.include('|Code|Status|');
      expect(result).to.include('|---|---|');
      expect(result).to.include('|200|OK|');
      expect(result).to.include('#### Example response');
      expect(result).to.include('```json');
      expect(result).to.include('{"success": true}');
      expect(result).to.include('```');
    });

    it('should handle multiple responses', () => {
      const responses: ResponseType[] = [
        { code: 200, status: 'OK', body: '{"success": true}' },
        { code: 404, status: 'Not Found', body: '{"error": "Not found"}' }
      ];

      const result = readResponse(responses);

      expect(result).to.include('|200|OK|');
      expect(result).to.include('|404|Not Found|');
      // Should use first response body for example
      expect(result).to.include('{"success": true}');
    });

    it('should return empty string for null/undefined responses', () => {
      expect(readResponse(null as never)).to.equal('');
      expect(readResponse(undefined as never)).to.equal('');
    });

    it('should return empty string for empty array', () => {
      const result = readResponse([]);
      expect(result).to.equal('');
    });

    it('should render a response without logging to stdout', () => {
      const responses: ResponseType[] = [{
        code: 200,
        status: 'OK',
        body: '{"test": "data"}'
      }];

      const result = readResponse(responses);

      // readResponse must not emit to stdout (debug console.log was
      // removed as part of the hot-path cleanup) and must still include
      // the response code, status and body in its output.
      expect(logOutput.length).to.equal(0);
      expect(result).to.include('|200|OK|');
      expect(result).to.include('{"test": "data"}');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null inputs gracefully across all functions', () => {
      expect(() => createMarkdown(null as never)).to.not.throw();
      expect(() => readAuthorization(null as never)).to.not.throw();
      expect(() => readQueryParams(null)).to.not.throw();
      expect(() => readFormDataBody(null)).to.not.throw();
      expect(() => readResponse(null as never)).to.not.throw();
    });

    it('should handle undefined inputs gracefully', () => {
      expect(() => readQueryParams(undefined)).to.not.throw();
      expect(() => readFormDataBody(undefined)).to.not.throw();
      expect(() => readResponse(undefined as never)).to.not.throw();
    });

    it('should handle malformed data structures', () => {
      const malformedDoc = {
        info: null,
        item: undefined
      } as unknown as JsonDocument;

      expect(() => createMarkdown(malformedDoc)).to.not.throw();
    });
  });

  describe('Integration Tests', () => {
    it('should work with complete data structures end-to-end', () => {
      const completeDoc: JsonDocument = {
        info: {
          name: 'Complete API',
          description: 'Full API documentation'
        },
        item: [] // Simplified for testing without deep mocking
      };

      const authInfo: AuthorizationInfo = {
        bearer: [{ key: 'Authorization', type: 'Bearer', value: 'token' }],
        key: 'auth',
        type: 'Bearer',
        value: 'value'
      };

      const requestData: JsonRequest = {
        header: [{ key: 'Content-Type', value: 'application/json', description: 'Content type' }],
        key: 'request',
        value: 'value',
        description: 'Complete request'
      };

      const responses: ResponseType[] = [
        { code: 200, status: 'OK', body: '{"success": true}' }
      ];

      const markdownResult = createMarkdown(completeDoc);
      const authResult = readAuthorization(authInfo);
      const requestResult = readRequest(requestData);
      const responseResult = readResponse(responses);

      expect(markdownResult).to.be.a('string').and.not.empty;
      expect(authResult).to.be.a('string').and.not.empty;
      expect(requestResult).to.be.a('string').and.not.empty;
      expect(responseResult).to.be.a('string').and.not.empty;

      // Verify specific content is present
      expect(markdownResult).to.include('# Complete API');
      expect(authResult).to.include('Authentication Bearer');
      expect(requestResult).to.include('Request Headers');
      expect(responseResult).to.include('### Response');
    });

    it('should handle complex authorization with multiple bearer tokens', () => {
      const complexAuth: AuthorizationInfo = {
        bearer: [
          { key: 'Authorization', type: 'Bearer', value: 'main-token' },
          { key: 'X-API-Key', type: 'ApiKey', value: 'api-key-123' },
          { key: 'X-Client-ID', type: 'Client', value: 'client-456' }
        ],
        key: 'complex-auth',
        type: 'Bearer',
        value: 'complex-value'
      };

      const result = readAuthorization(complexAuth);

      expect(result).to.include('|Authorization|main-token|Bearer|');
      expect(result).to.include('|X-API-Key|api-key-123|ApiKey|');
      expect(result).to.include('|X-Client-ID|client-456|Client|');
    });

    it('should handle complex request with multiple headers', () => {
      const complexRequest: JsonRequest = {
        header: [
          { key: 'Content-Type', value: 'application/json', description: 'JSON content' },
          { key: 'Accept', value: 'application/json', description: 'Accept JSON' },
          { key: 'User-Agent', value: 'TestClient/1.0', description: 'Client identifier' }
        ],
        key: 'complex-request',
        value: 'complex-value',
        description: 'Complex request with multiple headers'
      };

      const result = readRequest(complexRequest);

      expect(result).to.include('|Content-Type|application/json|JSON content|');
      expect(result).to.include('|Accept|application/json|Accept JSON|');
      expect(result).to.include('|User-Agent|TestClient/1.0|Client identifier|');
    });
  });

  describe('String Processing and Formatting', () => {
    it('should properly escape and format markdown characters', () => {
      const docWithSpecialChars: JsonDocument = {
        info: {
          name: 'API with | special chars',
          description: 'Description with * asterisks and _ underscores'
        },
        item: []
      };

      const result = createMarkdown(docWithSpecialChars);
      expect(result).to.include('# API with | special chars');
      expect(result).to.include('Description with * asterisks and _ underscores');
    });

    it('should handle empty strings in various fields', () => {
      const emptyFieldsDoc: JsonDocument = {
        info: {
          name: '',
          description: ''
        },
        item: []
      };

      const result = createMarkdown(emptyFieldsDoc);
      expect(result).to.include('# \n\n');
    });
  });

  describe('Array Processing', () => {
    it('should handle empty bearer array correctly', () => {
      const authWithEmptyBearer: AuthorizationInfo = {
        bearer: [],
        key: 'test-key',
        type: 'Bearer',
        value: 'test-value'
      };

      const result = readAuthorization(authWithEmptyBearer);
      expect(result).to.include('Authentication Bearer');
      expect(result).to.include('|Param|value|Type|');
    });

    it('should handle empty header array correctly', () => {
      const requestWithEmptyHeaders: JsonRequest = {
        header: [],
        key: 'test-key',
        value: 'test-value',
        description: 'Test description'
      };

      const result = readRequest(requestWithEmptyHeaders);
      expect(result).to.include('### Request Headers');
      expect(result).to.include('|Parameter|Value|Description|');
    });
  });

  describe('readItems', () => {
    it('should handle nested folder/collection items with sub-items', () => {
      const items = [
        {
          name: 'User Endpoints',
          item: [
            {
              name: 'Get User',
              request: {
                method: 'GET',
                url: '/users/1',
                description: 'Fetch a user',
              },
            },
          ],
        },
      ] as unknown as Parameters<typeof readItems>[0];

      const result = readItems(items);

      // The folder heading should appear at depth 1
      expect(result).to.include('# 📁 Collection: User Endpoints');
      // The nested endpoint should be rendered via readMethods
      expect(result).to.include('Get User');
    });

    it('should increase heading depth for deeply nested folders', () => {
      const items = [
        {
          name: 'Root Folder',
          item: [
            {
              name: 'Sub Folder',
              item: [
                {
                  name: 'Leaf Endpoint',
                  request: {
                    method: 'POST',
                    url: '/leaf',
                  },
                },
              ],
            },
          ],
        },
      ] as unknown as Parameters<typeof readItems>[0];

      const result = readItems(items);

      // Root folder at depth 1
      expect(result).to.include('# 📁 Collection: Root Folder');
      // Sub folder at depth 2
      expect(result).to.include('## 📁 Collection: Sub Folder');
      // Leaf endpoint rendered
      expect(result).to.include('Leaf Endpoint');
    });

    it('should handle a mix of folders and endpoints at the same level', () => {
      const items = [
        {
          name: 'Auth Folder',
          item: [
            {
              name: 'Login',
              request: { method: 'POST', url: '/login' },
            },
          ],
        },
        {
          name: 'Health Check',
          request: { method: 'GET', url: '/health' },
        },
      ] as unknown as Parameters<typeof readItems>[0];

      const result = readItems(items);

      expect(result).to.include('# 📁 Collection: Auth Folder');
      expect(result).to.include('Login');
      expect(result).to.include('Health Check');
    });
  });
});