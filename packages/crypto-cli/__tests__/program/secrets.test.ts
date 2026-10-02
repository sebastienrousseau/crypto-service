/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Tests for how subcommands read secrets (key files, standard input,
 * prompts) and for `encrypt` / `decrypt`.
 */
import { expect } from "chai";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import prompts from "prompts";
import { EXIT } from "../../src/program/index";
import {
  isStdin,
  promptHidden,
  secretPrompt,
  valueOrJsonField,
} from "../../src/program/io";
import { parseSymmetricKey } from "../../src/program/encrypt";
import { readSecretFile, sharedModeWarning } from "../../src/program/secrets";
import { memoryIO, runCli } from "./helpers";

const POSIX = process.platform !== "win32";

describe("Secrets and encrypt/decrypt", function () {
  this.timeout(60000);

  const tempDir = path.join(os.tmpdir(), `crypto-cli-secrets-${process.pid}`);
  const at = (name: string) => path.join(tempDir, name);
  const keyHex = randomBytes(32).toString("hex");
  const otherKeyHex = randomBytes(32).toString("hex");
  const rawKey = randomBytes(32);
  const binary = Buffer.from([0x00, 0xff, 0x0a, 0x0d, 0x80, 0x1b]);

  /** Write a file only its owner can read (on POSIX). */
  const writeSecret = (name: string, data: string | Buffer) => {
    fs.writeFileSync(at(name), data, { mode: 0o600 });
    return at(name);
  };

  let keyFile: string;
  let otherKeyFile: string;
  let rawKeyFile: string;
  let dataFile: string;

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    keyFile = writeSecret("key.hex", `${keyHex}\n`);
    otherKeyFile = writeSecret("other.hex", otherKeyHex);
    rawKeyFile = writeSecret("key.bin", rawKey);
    dataFile = at("data.bin");
    fs.writeFileSync(dataFile, binary);
  });

  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  /** Encrypt `dataFile` with `keyFile` and save the base64 output. */
  const sealToFile = async (name: string, key = keyFile) => {
    const r = await runCli(["encrypt", "--key-file", key, dataFile]);
    expect(r.code).to.equal(EXIT.OK);
    fs.writeFileSync(at(name), r.stdout);
    return at(name);
  };

  describe("io helpers", () => {
    it("takes a value bare or from a --json line", () => {
      expect(valueOrJsonField(Buffer.from(" abc \n"), "x")).to.equal("abc");
      expect(valueOrJsonField(Buffer.from('{"x":"v"}\n'), "x")).to.equal("v");
      expect(() => valueOrJsonField(Buffer.from('{"y":1}'), "x")).to.throw(
        'the JSON input has no "x" string',
      );
    });

    it("treats an omitted file and '-' as standard input", () => {
      expect(isStdin(undefined)).to.be.true;
      expect(isStdin("-")).to.be.true;
      expect(isStdin("file")).to.be.false;
    });

    it("prompts only when stdin is a terminal", () => {
      expect(secretPrompt({ isTTY: true })).to.equal(promptHidden);
      expect(secretPrompt({ isTTY: false })).to.be.undefined;
      expect(secretPrompt({})).to.be.undefined;
    });

    it("returns the answer of the hidden prompt", async () => {
      prompts.inject(["s3cret"]);
      expect(await promptHidden("Password")).to.equal("s3cret");
    });
  });

  describe("key files", () => {
    it("warns about group or world access on POSIX only", () => {
      expect(sharedModeWarning("k", 0o100600, "linux")).to.be.undefined;
      expect(sharedModeWarning("k", 0o100400, "darwin")).to.be.undefined;
      expect(sharedModeWarning("k", 0o100640, "linux")).to.equal(
        "crypto-cli: warning: k can be read by other users (mode 640); " +
          "restrict it with: chmod 600 k\n",
      );
      expect(sharedModeWarning("k", 0o100604, "darwin")).to.include(
        "(mode 604)",
      );
      expect(sharedModeWarning("k", 0o100666, "win32")).to.be.undefined;
    });

    it("reads a shared file and warns on stderr", async () => {
      const file = at("shared.key");
      fs.writeFileSync(file, "secret");
      // On Windows, Node reports 0o666 whatever chmod is asked for.
      fs.chmodSync(file, 0o644);
      const { io, err } = memoryIO();
      const data = await readSecretFile(file, io, "linux");
      expect(data.toString()).to.equal("secret");
      expect(err.join("")).to.include("can be read by other users");
    });

    it("does not warn on Windows", async () => {
      const file = at("shared.key");
      const { io, err } = memoryIO();
      await readSecretFile(file, io, "win32");
      expect(err).to.be.empty;
    });

    it("parses a hex or raw 32-byte key", () => {
      expect(
        Buffer.from(parseSymmetricKey(Buffer.from(` ${keyHex}\n`))),
      ).to.deep.equal(Buffer.from(keyHex, "hex"));
      expect(parseSymmetricKey(rawKey)).to.equal(rawKey);
      expect(() => parseSymmetricKey(Buffer.from("abcd"))).to.throw(
        "the key must be 32 bytes",
      );
    });
  });

  describe("encrypt and decrypt", () => {
    it("round-trips a binary file byte for byte", async () => {
      const r = await runCli(["encrypt", "--key-file", keyFile, dataFile]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stderr).to.equal("");
      expect(r.stdout).to.match(/^[A-Za-z0-9+/]+={0,2}\n$/);
      // 24-byte nonce, the plaintext, 16-byte tag.
      expect(Buffer.from(r.stdout, "base64")).to.have.length(
        24 + binary.length + 16,
      );
      const sealed = at("sealed.txt");
      fs.writeFileSync(sealed, r.stdout);
      const d = await runCli(["decrypt", "--key-file", keyFile, sealed]);
      expect(d.code).to.equal(EXIT.OK);
      expect(d.stderr).to.equal("");
      expect(d.stdoutBytes).to.deep.equal(binary);
    });

    it("never prints the key", async () => {
      const r = await runCli(["encrypt", "--key-file", keyFile, dataFile]);
      expect(r.stdout + r.stderr).not.to.include(keyHex);
    });

    it("uses a fresh nonce for every encryption", async () => {
      const a = await runCli(["encrypt", "--key-file", keyFile, dataFile]);
      const b = await runCli(["encrypt", "--key-file", keyFile, dataFile]);
      expect(a.stdout).not.to.equal(b.stdout);
    });

    it("reads the data from stdin with a key file", async () => {
      const r = await runCli(["encrypt", "--key-file", rawKeyFile], ["hi"]);
      const d = await runCli(
        ["decrypt", "--key-file", rawKeyFile, "-"],
        [r.stdout],
      );
      expect(d.code).to.equal(EXIT.OK);
      expect(d.stdout).to.equal("hi");
    });

    it("reads the key from stdin with a data file", async () => {
      const r = await runCli(["encrypt", "--key-stdin", dataFile], [keyHex]);
      expect(r.code).to.equal(EXIT.OK);
      const sealed = at("stdin-key.txt");
      fs.writeFileSync(sealed, r.stdout);
      const d = await runCli(["decrypt", "--key-stdin", sealed], [keyHex]);
      expect(d.code).to.equal(EXIT.OK);
      expect(d.stdoutBytes).to.deep.equal(binary);
    });

    it("prints one JSON line with --json, which decrypt reads", async () => {
      const r = await runCli([
        "encrypt",
        "--json",
        "--key-file",
        keyFile,
        dataFile,
      ]);
      expect(r.stdout.trim().split("\n")).to.have.length(1);
      const body = JSON.parse(r.stdout);
      expect(Object.keys(body).sort()).to.deep.equal(["algorithm", "sealed"]);
      expect(body.algorithm).to.equal("xchacha20-poly1305");
      const d = await runCli(
        ["decrypt", "--json", "--key-file", keyFile],
        [r.stdout],
      );
      expect(d.code).to.equal(EXIT.OK);
      expect(JSON.parse(d.stdout)).to.deep.equal({
        plaintext: binary.toString("base64"),
        encoding: "base64",
        algorithm: "xchacha20-poly1305",
      });
    });

    it("exits 1 with the wrong key, nothing on stdout", async () => {
      const sealed = await sealToFile("wrong-key.txt");
      const d = await runCli(["decrypt", "--key-file", otherKeyFile, sealed]);
      expect(d.code).to.equal(EXIT.FAILURE);
      expect(d.stdout).to.equal("");
      expect(d.stderr).to.equal(
        "crypto-cli: decryption failed: wrong key, or the input was " +
          "modified or truncated\n",
      );
    });

    it("exits 1 on a modified ciphertext", async () => {
      const sealed = Buffer.from(
        fs.readFileSync(await sealToFile("tamper.txt"), "utf8"),
        "base64",
      );
      sealed[sealed.length - 1] ^= 0x01;
      const d = await runCli(
        ["decrypt", "--key-file", keyFile],
        [sealed.toString("base64")],
      );
      expect(d.code).to.equal(EXIT.FAILURE);
      expect(d.stderr).to.include("decryption failed");
    });

    it("exits 1 on input that is not base64", async () => {
      const d = await runCli(["decrypt", "--key-file", keyFile], ["*not*"]);
      expect(d.code).to.equal(EXIT.FAILURE);
      expect(d.stderr).to.include("not base64");
    });

    it("exits 1 on a key of the wrong size", async () => {
      const bad = writeSecret("short.key", "abcd");
      const r = await runCli(["encrypt", "--key-file", bad, dataFile]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.include("the key must be 32 bytes");
    });

    it("exits 1 when the key file cannot be read", async () => {
      const r = await runCli([
        "encrypt",
        "--key-file",
        at("missing.key"),
        dataFile,
      ]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.include("ENOENT");
    });

    it("warns about a key file other users can read", async function () {
      if (!POSIX) this.skip();
      const shared = at("shared.hex");
      fs.writeFileSync(shared, keyHex, { mode: 0o644 });
      fs.chmodSync(shared, 0o644);
      const r = await runCli(["encrypt", "--key-file", shared, dataFile]);
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stderr).to.include("(mode 644)");
      expect(r.stderr).not.to.include(keyHex);
    });
  });

  describe("usage errors (exit 2)", () => {
    it("requires a key source", async () => {
      const r = await runCli(["encrypt", dataFile]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stdout).to.equal("");
      expect(r.stderr).to.equal(
        "crypto-cli: missing key: pass --key-file <path> or --key-stdin\n",
      );
    });

    for (const args of [[], ["-"]]) {
      it(`refuses key and data both on stdin (${args.join("") || "no file"})`, async () => {
        const r = await runCli(["decrypt", "--key-stdin", ...args], [keyHex]);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("--key-stdin needs the data as a file");
      });
    }

    it("refuses --key-file with --key-stdin", async () => {
      const r = await runCli([
        "encrypt",
        "--key-file",
        keyFile,
        "--key-stdin",
        dataFile,
      ]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stderr).to.include("cannot be used with");
    });

    it("has no option that takes the key itself", async () => {
      const r = await runCli(["encrypt", "--key", keyHex, dataFile]);
      expect(r.code).to.equal(EXIT.USAGE);
      expect(r.stderr).to.include("unknown option");
    });
  });
});
