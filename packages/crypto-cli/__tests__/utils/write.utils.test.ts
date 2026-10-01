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

    let originalStdoutIsTTY: boolean | undefined;
    let originalStderrIsTTY: boolean | undefined;

    beforeEach(() => {
      stdoutOutput = [];
      stderrOutput = [];
      originalStdoutWrite = process.stdout.write;
      originalStderrWrite = process.stderr.write;
      originalStdoutIsTTY = process.stdout.isTTY;
      originalStderrIsTTY = process.stderr.isTTY;
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
      (process.stdout as unknown as { isTTY?: boolean | undefined }).isTTY =
        originalStdoutIsTTY;
      (process.stderr as unknown as { isTTY?: boolean | undefined }).isTTY =
        originalStderrIsTTY;
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
      (process.stdout as unknown as { isTTY?: boolean | undefined }).isTTY =
        false;
      writeUtils.writeLn("final", true);
      expect(stdoutOutput[0]).to.equal("final");
    });

    it("should omit newline on finalLine for stderr", () => {
      (process.stderr as unknown as { isTTY?: boolean | undefined }).isTTY =
        false;
      writeUtils.writeLn("err-final", true, true);
      expect(stderrOutput[0]).to.equal("err-final");
    });

    /** Run `fn` with process.platform reported as `platform`. */
    const onPlatform = (platform: NodeJS.Platform, fn: () => void): void => {
      const original = Object.getOwnPropertyDescriptor(process, "platform")!;
      Object.defineProperty(process, "platform", { value: platform });
      try {
        fn();
      } finally {
        Object.defineProperty(process, "platform", original);
      }
    };

    // Both platforms are simulated, so coverage is the same on every OS.
    it("should append newline on finalLine when stream is a TTY and not on Windows", () => {
      (process.stdout as unknown as { isTTY?: boolean | undefined }).isTTY =
        true;
      onPlatform("linux", () => writeUtils.writeLn("tty-final", true));
      expect(stdoutOutput[0]).to.equal("tty-final\n");
    });

    it("should omit newline on finalLine on Windows even on a TTY", () => {
      (process.stdout as unknown as { isTTY?: boolean | undefined }).isTTY =
        true;
      onPlatform("win32", () => writeUtils.writeLn("win-final", true));
      expect(stdoutOutput[0]).to.equal("win-final");
    });
  });
});
