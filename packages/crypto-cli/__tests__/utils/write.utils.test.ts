/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

import { expect } from "chai";
import { writeUtils } from "../../src/utils/write.utils";

describe("writeUtils", () => {
  describe("writeLn", () => {
    let stdoutOutput: string[];
    let stderrOutput: string[];
    let originalStdoutWrite: typeof process.stdout.write;
    let originalStderrWrite: typeof process.stderr.write;

    beforeEach(() => {
      stdoutOutput = [];
      stderrOutput = [];
      originalStdoutWrite = process.stdout.write;
      originalStderrWrite = process.stderr.write;
      process.stdout.write = ((chunk: string) => {
        stdoutOutput.push(chunk);
        return true;
      }) as typeof process.stdout.write;
      process.stderr.write = ((chunk: string) => {
        stderrOutput.push(chunk);
        return true;
      }) as typeof process.stderr.write;
    });

    afterEach(() => {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    });

    it("should write to stdout by default", () => {
      writeUtils.writeLn("hello");
      expect(stdoutOutput).to.have.length(1);
      expect(stdoutOutput[0]).to.include("hello");
    });

    it("should append newline by default", () => {
      writeUtils.writeLn("hello");
      expect(stdoutOutput[0]).to.equal("hello\n");
    });

    it("should write to stderr when error flag is set", () => {
      writeUtils.writeLn("error msg", false, true);
      expect(stderrOutput).to.have.length(1);
      expect(stderrOutput[0]).to.include("error msg");
      expect(stdoutOutput).to.have.length(0);
    });

    it("should be a static method", () => {
      expect(writeUtils.writeLn).to.be.a("function");
    });

    it("should omit newline on finalLine when stream is not a TTY", () => {
      // Our mocked stdout has no isTTY so !stream.isTTY is true
      writeUtils.writeLn("final", true);
      expect(stdoutOutput[0]).to.equal("final");
    });

    it("should omit newline on finalLine for stderr", () => {
      writeUtils.writeLn("err-final", true, true);
      expect(stderrOutput[0]).to.equal("err-final");
    });
  });
});
