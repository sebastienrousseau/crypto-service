/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import logger from "../src/lib/logger";

describe("Logger", () => {
  it("should export a logger instance", () => {
    expect(logger).to.exist;
  });

  it("should have info level logging by default", () => {
    expect(logger.transports).to.be.an("array");
    expect(logger.transports.length).to.be.greaterThan(0);
  });

  it("should have defaultMeta with service name", () => {
    expect(logger.defaultMeta).to.have.property("service", "crypto-server");
  });

  it("should have defaultMeta with correlationId", () => {
    expect(logger.defaultMeta).to.have.property("correlationId");
    expect(logger.defaultMeta.correlationId).to.be.a("string");
  });

  it("should be able to log at all levels without throwing", () => {
    expect(() => logger.info("Test info message")).to.not.throw();
    expect(() => logger.warn("Test warning message")).to.not.throw();
    expect(() => logger.error("Test error message")).to.not.throw();
    expect(() => logger.debug("Test debug message")).to.not.throw();
  });
});
