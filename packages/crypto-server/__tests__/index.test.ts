/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from 'chai';
import logger from '../src/lib/logger';
import {
  LIB_VERSION,
  HOST,
  PORT,
  PROTOCOL,
  consoleOutput,
  fastifyOptions,
  compressOptions,
  rateLimitOptions,
  healthCheckOptions,
} from '../src/config/constants';

describe('Crypto Server', () => {
  describe('Logger', () => {
    it('should export a logger instance', () => {
      expect(logger).to.exist;
    });

    it('should have info level logging', () => {
      expect(logger.level).to.be.a('string');
    });

    it('should have transports configured', () => {
      expect(logger.transports).to.be.an('array');
      expect(logger.transports.length).to.be.greaterThan(0);
    });

    it('should be able to log messages', () => {
      expect(() => logger.info('Test log message')).to.not.throw();
    });

    it('should be able to log warnings', () => {
      expect(() => logger.warn('Test warning message')).to.not.throw();
    });

    it('should be able to log errors', () => {
      expect(() => logger.error('Test error message')).to.not.throw();
    });
  });

  describe('Constants', () => {
    describe('LIB_VERSION', () => {
      it('should be a string', () => {
        expect(LIB_VERSION).to.be.a('string');
      });

      it('should contain a version number', () => {
        expect(LIB_VERSION).to.match(/"\d+\.\d+\.\d+"/);
      });
    });

    describe('HOST', () => {
      it('should default to localhost when env not set', () => {
        expect(HOST).to.be.a('string');
      });
    });

    describe('PORT', () => {
      it('should have a valid port value', () => {
        expect(PORT).to.satisfy((p: string | number) => {
          const num = typeof p === 'string' ? parseInt(p, 10) : p;
          return num >= 0 && num <= 65535;
        });
      });
    });

    describe('PROTOCOL', () => {
      it('should be http or https', () => {
        expect(PROTOCOL).to.match(/^https?$/);
      });
    });

    describe('consoleOutput', () => {
      it('should be an array of strings', () => {
        expect(consoleOutput).to.be.an('array');
        consoleOutput.forEach((item) => {
          expect(item).to.be.a('string');
        });
      });

      it('should contain protocol information', () => {
        expect(consoleOutput.some((s) => s.includes('protocol'))).to.be.true;
      });

      it('should contain hostname information', () => {
        expect(consoleOutput.some((s) => s.includes('hostname'))).to.be.true;
      });

      it('should contain port information', () => {
        expect(consoleOutput.some((s) => s.includes('port'))).to.be.true;
      });

      it('should contain version information', () => {
        expect(consoleOutput.some((s) => s.includes('version'))).to.be.true;
      });
    });

    describe('fastifyOptions', () => {
      it('should have bodyLimit configured', () => {
        expect(fastifyOptions.bodyLimit).to.be.a('number');
        expect(fastifyOptions.bodyLimit).to.be.greaterThan(0);
      });

      it('should have caseSensitive set to true', () => {
        expect(fastifyOptions.caseSensitive).to.be.true;
      });

      it('should have request logging enabled', () => {
        expect(fastifyOptions.disableRequestLogging).to.be.false;
      });

      it('should have keepAliveTimeout configured', () => {
        expect(fastifyOptions.keepAliveTimeout).to.be.a('number');
      });

      it('should have logger enabled', () => {
        // logger may be `true` or a Pino instance depending on initialization
        expect(fastifyOptions.logger).to.exist;
      });

      it('should not unconditionally trust proxy headers', () => {
        // Default must be `false` (or an explicit CIDR list supplied via
        // the TRUSTED_PROXY_CIDRS env var). Blanket `true` enabled IP-
        // based rate-limit bypass via spoofed X-Forwarded-For headers.
        const tp = fastifyOptions.trustProxy;
        expect(tp === false || Array.isArray(tp)).to.equal(true);
      });

      it('should have proto poisoning protection', () => {
        expect(fastifyOptions.onProtoPoisoning).to.equal('error');
      });

      it('should have constructor poisoning protection', () => {
        expect(fastifyOptions.onConstructorPoisoning).to.equal('error');
      });
    });

    describe('compressOptions', () => {
      it('should have global compression enabled', () => {
        expect(compressOptions.global).to.be.true;
      });

      it('should have a threshold set', () => {
        expect(compressOptions.threshold).to.be.a('number');
        expect(compressOptions.threshold).to.be.greaterThan(0);
      });

      it('should have zlib options configured', () => {
        expect(compressOptions.zlibOptions).to.exist;
        expect(compressOptions.zlibOptions?.level).to.be.a('number');
      });
    });

    describe('rateLimitOptions', () => {
      it('should have global rate limiting enabled', () => {
        expect(rateLimitOptions.global).to.be.true;
      });

      it('should have a max requests limit', () => {
        expect(rateLimitOptions.max).to.be.a('number');
        expect(rateLimitOptions.max).to.be.greaterThan(0);
      });

      it('should have a time window', () => {
        expect(rateLimitOptions.timeWindow).to.be.a('string');
      });

      it('should have an allowList', () => {
        expect(rateLimitOptions.allowList).to.be.an('array');
        expect(rateLimitOptions.allowList).to.include('127.0.0.1');
      });

      it('should have rate limit headers configured', () => {
        expect(rateLimitOptions.addHeaders).to.exist;
        expect(rateLimitOptions.addHeaders['x-ratelimit-limit']).to.be.true;
        expect(rateLimitOptions.addHeaders['x-ratelimit-remaining']).to.be.true;
        expect(rateLimitOptions.addHeaders['x-ratelimit-reset']).to.be.true;
        expect(rateLimitOptions.addHeaders['retry-after']).to.be.true;
      });

      it('should have an errorResponseBuilder function', () => {
        expect(rateLimitOptions.errorResponseBuilder).to.be.a('function');
      });

      it('errorResponseBuilder should return proper error object', () => {
        const mockReq = {
          ip: '192.168.1.1',
          log: { warn: () => {} },
        };
        const mockContext = {
          max: 10,
          after: '1 minute',
          ttl: 60000,
        };

        const result = rateLimitOptions.errorResponseBuilder(mockReq, mockContext);

        expect(result.code).to.equal(429);
        expect(result.error).to.equal('Too Many Requests');
        expect(result.message).to.include('10 requests');
        expect(result.message).to.include('1 minute');
        expect(result.date).to.be.a('number');
        expect(result.expiresIn).to.equal(60000);
      });
    });

    describe('healthCheckOptions', () => {
      it('should have healthcheck URL configured', () => {
        expect(healthCheckOptions.healthcheckUrl).to.equal('/health');
      });

      it('should expose uptime', () => {
        expect(healthCheckOptions.exposeUptime).to.be.true;
      });
    });
  });
});
