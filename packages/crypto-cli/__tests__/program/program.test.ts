/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Tests for the non-interactive command layer: hash, keygen, the entry
 * point (menu vs subcommands), --help/--version and exit codes.
 */
import { expect } from "chai";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { EXIT, main, processIO } from "../../src/program/index";
import { emit, isInteractive, readInput } from "../../src/program/io";
import { memoryIO, runCli } from "./helpers";

const sha256 = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "package.json"), "utf8"),
);

describe("Non-interactive CLI", function () {
  this.timeout(60000);

  const tempDir = path.join(os.tmpdir(), `crypto-cli-program-${process.pid}`);
  const inputFile = path.join(tempDir, "input.bin");
  const binary = Buffer.from([0x00, 0xff, 0x0a, 0x0d, 0x80]);

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(inputFile, binary);
  });

  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  describe("io", () => {
    it("reads string and buffer chunks from stdin", async () => {
      const { io } = memoryIO(["ab", Buffer.from("cd")]);
      expect((await readInput(undefined, io)).toString()).to.equal("abcd");
    });

    it("reads a Node.js stream when the file is '-'", async () => {
      const { io } = memoryIO();
      io.stdin = Readable.from([Buffer.from("xyz")]);
      expect((await readInput("-", io)).toString()).to.equal("xyz");
    });

    it("emits JSON or text with a trailing newline", () => {
      const { io, out } = memoryIO();
      emit(io, true, { a: 1 }, "text");
      emit(io, false, { a: 1 }, "text");
      expect(out).to.deep.equal(['{"a":1}\n', "text\n"]);
    });

    it("is interactive only when input and output are terminals", () => {
      expect(isInteractive({ isTTY: true }, { isTTY: true })).to.be.true;
      expect(isInteractive({ isTTY: true }, {})).to.be.false;
      expect(isInteractive({}, { isTTY: true })).to.be.false;
      expect(isInteractive({ isTTY: false }, { isTTY: false })).to.be.false;
    });

    it("binds the process streams", () => {
      const io = processIO();
      expect(io.stdin).to.equal(process.stdin);
      expect(io.isTTY).to.be.a("boolean");
      io.stdout("");
      io.stderr("");
    });
  });

  describe("hash", () => {
    it("hashes stdin with --json (sha256 by default)", async () => {
      const r = await runCli(["hash", "--json"], ["hello"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stderr).to.equal("");
      expect(r.stdout.endsWith("\n")).to.be.true;
      expect(r.stdout.trim().split("\n")).to.have.length(1);
      expect(JSON.parse(r.stdout)).to.deep.equal({
        digest: sha256("hello"),
        algorithm: "sha256",
        length: 32,
      });
    });

    it("hashes a binary file byte for byte", async () => {
      const r = await runCli(["hash", inputFile]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.equal(`${sha256(binary)}\n`);
    });

    it("reads stdin when the file is '-'", async () => {
      const r = await runCli(["hash", "-"], [binary]);
      expect(r.stdout).to.equal(`${sha256(binary)}\n`);
    });

    it("honours --algorithm", async () => {
      const r = await runCli(["hash", "-a", "sha512", "--json"], ["x"]);
      const body = JSON.parse(r.stdout);
      expect(body.algorithm).to.equal("sha512");
      expect(body.digest).to.equal(
        createHash("sha512").update("x").digest("hex"),
      );
      expect(body.length).to.equal(64);
    });

    it("hashes empty stdin", async () => {
      const r = await runCli(["hash"]);
      expect(r.stdout).to.equal(`${sha256("")}\n`);
    });

    it("exits 2 on an unknown algorithm, nothing on stdout", async () => {
      const r = await runCli(["hash", "--algorithm", "md5"], ["x"]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.include("Allowed choices");
    });

    it("exits 1 when the input file cannot be read", async () => {
      const missing = path.join(tempDir, "missing.txt");
      const r = await runCli(["hash", "--json", missing]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.match(/^crypto-cli: .*ENOENT/);
    });
  });

  describe("keygen", () => {
    it("prints the key pair as JSON", async () => {
      const r = await runCli(["keygen", "-a", "ed25519", "--json"]);
      expect(r.code).to.equal(EXIT.OK);
      const key = JSON.parse(r.stdout);
      expect(key.algorithm).to.equal("ed25519");
      expect(key.publicKey).to.match(/^[0-9a-f]{64}$/);
      expect(key.privateKey).to.match(/^[0-9a-f]{64}$/);
      expect(key.kid).to.be.a("string").and.not.empty;
    });

    it("records --kid and --use in the metadata", async () => {
      const r = await runCli([
        "keygen",
        "--algorithm",
        "x25519",
        "--kid",
        "k1",
        "--use",
        "enc",
        "--json",
      ]);
      const key = JSON.parse(r.stdout);
      expect(key.kid).to.equal("k1");
      expect(key.metadata).to.deep.equal({ kid: "k1", use: "enc" });
    });

    it("prints a readable key pair without --json", async () => {
      const r = await runCli(["keygen", "-a", "ml-kem-512"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.match(/^Algorithm: ml-kem-512\nKey ID: /);
      expect(r.stdout).to.include("\nPrivate:   ");
    });

    it("exits 2 when --algorithm is missing", async () => {
      const r = await runCli(["keygen", "--json"]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.include("--algorithm");
    });

    it("exits 2 on an invalid --use", async () => {
      const r = await runCli(["keygen", "-a", "ed25519", "--use", "x"]);
      expect(r.code).to.equal(EXIT.USAGE);
    });
  });

  describe("help, version and usage errors", () => {
    it("prints help on stdout with exit 0", async () => {
      const r = await runCli(["--help"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.include("Usage: crypto-cli");
      expect(r.stderr).to.equal("");
    });

    it("prints subcommand help", async () => {
      const r = await runCli(["cbom", "scan", "--help"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.include("Usage: crypto-cli cbom scan");
    });

    it("prints the package version", async () => {
      const r = await runCli(["--version"]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.equal(`v${pkg.version}\n`);
    });

    it("exits 2 on an unknown command", async () => {
      const r = await runCli(["frobnicate"]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stderr).to.include("unknown command");
      expect(r.stdout).to.equal("");
    });

    it("exits 2 on an unknown option", async () => {
      const r = await runCli(["hash", "--nope"]);
      expect(r.code).to.equal(EXIT.USAGE);
    });

    it("exits 2 when a command group has no subcommand", async () => {
      const r = await runCli(["cbom"]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stderr).to.include("Usage: crypto-cli cbom");
    });
  });

  describe("main", () => {
    const noMenu = async () => {
      throw new Error("the menu must not start");
    };

    it("runs a subcommand when there are arguments, even on a TTY", async () => {
      const { io, out } = memoryIO(["hello"], true);
      expect(await main(["hash"], io, noMenu)).to.equal(EXIT.OK);
      expect(out.join("")).to.equal(`${sha256("hello")}\n`);
    });

    it("starts the menu with no arguments on a TTY", async () => {
      const { io, out, err } = memoryIO([], true);
      let started = 0;
      const menu = async () => {
        started += 1;
      };
      expect(await main([], io, menu)).to.equal(EXIT.OK);
      expect(started).to.equal(1);
      expect(out).to.be.empty;
      expect(err).to.be.empty;
    });

    it("prints usage on stderr and exits 2 with no arguments and no TTY", async () => {
      const { io, out, err } = memoryIO([], false);
      expect(await main([], io, noMenu)).to.equal(EXIT.USAGE);
      expect(out).to.be.empty;
      expect(err.join("")).to.include("Usage: crypto-cli");
    });
  });
});
