/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

import { expect } from 'chai';
import {
  AuthorizationToken,
  AuthorizationInfo,
  JsonDocument,
  MethodType,
  JsonRequest,
  RequestHeader,
  ResponseType
} from '../src/@types/types';

describe('@types/types.ts - Type Validation', () => {
  describe('AuthorizationToken', () => {
    it('should accept valid AuthorizationToken object', () => {
      const validToken: AuthorizationToken = {
        key: 'api_key',
        type: 'Bearer',
        value: 'token123'
      };

      expect(validToken.key).to.equal('api_key');
      expect(validToken.type).to.equal('Bearer');
      expect(validToken.value).to.equal('token123');
    });

    it('should require all properties for AuthorizationToken', () => {
      // TypeScript compilation will catch missing properties
      // This test validates the structure at runtime
      const token: AuthorizationToken = {
        key: 'test',
        type: 'test',
        value: 'test'
      };

      expect(token).to.have.property('key');
      expect(token).to.have.property('type');
      expect(token).to.have.property('value');
    });
  });

  describe('AuthorizationInfo', () => {
    it('should accept valid AuthorizationInfo object', () => {
      const validAuth: AuthorizationInfo = {
        bearer: [{
          key: 'Authorization',
          type: 'Bearer',
          value: 'token123'
        }],
        key: 'auth_key',
        type: 'Bearer',
        value: 'auth_value'
      };

      expect(validAuth.bearer).to.be.an('array').with.lengthOf(1);
      expect(validAuth.bearer[0]).to.have.property('key', 'Authorization');
      expect(validAuth.key).to.equal('auth_key');
      expect(validAuth.type).to.equal('Bearer');
      expect(validAuth.value).to.equal('auth_value');
    });

    it('should accept empty bearer array', () => {
      const authWithEmptyBearer: AuthorizationInfo = {
        bearer: [],
        key: 'auth_key',
        type: 'Bearer',
        value: 'auth_value'
      };

      expect(authWithEmptyBearer.bearer).to.be.an('array').with.lengthOf(0);
    });
  });

  describe('JsonDocument', () => {
    it('should accept valid JsonDocument object', () => {
      const validDoc: JsonDocument = {
        info: {
          description: 'Test API documentation',
          name: 'Test API'
        },
        item: []
      };

      expect(validDoc.info).to.have.property('description', 'Test API documentation');
      expect(validDoc.info).to.have.property('name', 'Test API');
      expect(validDoc.item).to.be.an('array').with.lengthOf(0);
    });

    it('should require info object with description and name', () => {
      const doc: JsonDocument = {
        info: {
          description: '',
          name: ''
        },
        item: []
      };

      expect(doc.info).to.have.property('description');
      expect(doc.info).to.have.property('name');
    });
  });

  describe('RequestHeader', () => {
    it('should accept valid RequestHeader object', () => {
      const validHeader: RequestHeader = {
        key: 'Content-Type',
        value: 'application/json',
        description: 'Specify the content type'
      };

      expect(validHeader.key).to.equal('Content-Type');
      expect(validHeader.value).to.equal('application/json');
      expect(validHeader.description).to.equal('Specify the content type');
    });
  });

  describe('JsonRequest', () => {
    it('should accept valid JsonRequest object', () => {
      const validRequest: JsonRequest = {
        header: [{
          key: 'Content-Type',
          value: 'application/json',
          description: 'Content type header'
        }],
        key: 'request_key',
        value: 'request_value',
        description: 'Test request description'
      };

      expect(validRequest.header).to.be.an('array').with.lengthOf(1);
      expect(validRequest.header[0]).to.have.property('key', 'Content-Type');
      expect(validRequest.key).to.equal('request_key');
      expect(validRequest.value).to.equal('request_value');
      expect(validRequest.description).to.equal('Test request description');
    });

    it('should accept empty headers array', () => {
      const requestWithEmptyHeaders: JsonRequest = {
        header: [],
        key: 'request_key',
        value: 'request_value',
        description: 'Test request'
      };

      expect(requestWithEmptyHeaders.header).to.be.an('array').with.lengthOf(0);
    });
  });

  describe('ResponseType', () => {
    it('should accept valid ResponseType object with number code', () => {
      const validResponse: ResponseType = {
        code: 200,
        status: 'OK',
        body: '{"success": true}'
      };

      expect(validResponse.code).to.be.a('number').and.equal(200);
      expect(validResponse.status).to.equal('OK');
      expect(validResponse.body).to.equal('{"success": true}');
    });

    it('should accept various HTTP status codes', () => {
      const responses: ResponseType[] = [
        { code: 200, status: 'OK', body: 'Success' },
        { code: 404, status: 'Not Found', body: 'Resource not found' },
        { code: 500, status: 'Internal Server Error', body: 'Server error' }
      ];

      responses.forEach(response => {
        expect(response.code).to.be.a('number');
        expect(response.status).to.be.a('string');
        expect(response.body).to.be.a('string');
      });
    });
  });

  describe('MethodType', () => {
    it('should accept valid MethodType with optional properties', () => {
      const validMethod: MethodType = {
        name: 'GET /users',
        request: {
          header: [],
          key: 'test',
          value: 'test',
          description: 'Get users endpoint'
        },
        response: [{
          code: 200,
          status: 'OK',
          body: '[]'
        }]
      };

      expect(validMethod.name).to.equal('GET /users');
      expect(validMethod.request).to.be.an('object');
      expect(validMethod.response).to.be.an('array').with.lengthOf(1);
    });

    it('should accept MethodType with only required name property', () => {
      const methodWithNameOnly: MethodType = {
        name: 'Simple endpoint'
      };

      expect(methodWithNameOnly.name).to.equal('Simple endpoint');
      expect(methodWithNameOnly.request).to.be.undefined;
      expect(methodWithNameOnly.response).to.be.undefined;
    });

    it('should accept MethodType with request but no response', () => {
      const methodWithRequestOnly: MethodType = {
        name: 'POST /data',
        request: {
          header: [],
          key: 'post_key',
          value: 'post_value',
          description: 'Post data'
        }
      };

      expect(methodWithRequestOnly.name).to.equal('POST /data');
      expect(methodWithRequestOnly.request).to.be.an('object');
      expect(methodWithRequestOnly.response).to.be.undefined;
    });
  });

  describe('Type Integration', () => {
    it('should support complex nested type structures', () => {
      const complexDocument: JsonDocument = {
        info: {
          name: 'Complex API',
          description: 'A comprehensive API documentation'
        },
        item: []
      };

      const authInfo: AuthorizationInfo = {
        bearer: [{
          key: 'Authorization',
          type: 'Bearer',
          value: 'complex_token'
        }],
        key: 'complex_auth',
        type: 'Bearer',
        value: 'complex_value'
      };

      const method: MethodType = {
        name: 'Complex Method',
        request: {
          header: [{
            key: 'X-API-Key',
            value: 'secret_key',
            description: 'API key header'
          }],
          key: 'complex_request',
          value: 'complex_request_value',
          description: 'Complex request description'
        },
        response: [{
          code: 201,
          status: 'Created',
          body: '{"id": 1, "created": true}'
        }]
      };

      // Validate all structures work together
      expect(complexDocument).to.have.property('info');
      expect(authInfo.bearer).to.be.an('array');
      expect(method.request).to.have.property('header');
      expect(method.response).to.be.an('array');
    });
  });
});