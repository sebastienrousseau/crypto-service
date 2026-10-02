/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { EventEmitter } from "node:events";
import { EXIT, exitOnClosedPipe } from "../../src/program/index";

const errorWithCode = (code: string) =>
  Object.assign(new Error(code), { code });

describe("exitOnClosedPipe", () => {
  it("exits OK when the reader closes the pipe (EPIPE)", () => {
    const stream = new EventEmitter();
    const codes: number[] = [];
    exitOnClosedPipe(stream, (code) => codes.push(code));
    stream.emit("error", errorWithCode("EPIPE"));
    expect(codes).to.deep.equal([EXIT.OK]);
  });

  it("re-throws any other stream error", () => {
    const stream = new EventEmitter();
    const codes: number[] = [];
    exitOnClosedPipe(stream, (code) => codes.push(code));
    expect(() => stream.emit("error", errorWithCode("EIO"))).to.throw("EIO");
    expect(codes).to.deep.equal([]);
  });
});
