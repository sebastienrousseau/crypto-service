/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 *
 * Tests for `sign`, `verify`, `password hash` and `password verify`.
 */
import { expect } from "chai";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  generateKeyPair,
  type KeyAlgorithm,
} from "@sebastienrousseau/crypto-lib/keys";
import { EXIT } from "../../src/program/index";
import { SIGNING_ALGORITHMS } from "../../src/program/sign";
import { runCli } from "./helpers";

describe("sign, verify and password", function () {
  this.timeout(120000);

  const tempDir = path.join(os.tmpdir(), `crypto-cli-sign-${process.pid}`);
  const at = (name: string) => path.join(tempDir, name);
  const message = Buffer.from([0x00, 0x01, 0xfe, 0x0a, 0x41]);

  /** Write a file only its owner can read (on POSIX). */
  const writeSecret = (name: string, data: string) => {
    fs.writeFileSync(at(name), data, { mode: 0o600 });
    return at(name);
  };

  /** A key pair from keygen, saved as `keygen --json` would. */
  let keys = 0;
  const keyFileFor = (algorithm: KeyAlgorithm) => {
    const key = generateKeyPair(algorithm);
    keys += 1;
    const name = `${algorithm}-${keys}.json`;
    return { key, file: writeSecret(name, JSON.stringify(key)) };
  };

  let dataFile: string;

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    dataFile = at("message.bin");
    fs.writeFileSync(dataFile, message);
  });

  after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  describe("sign and verify", () => {
    it("signs with every signing algorithm of keygen", () => {
      expect(SIGNING_ALGORITHMS).to.deep.equal([
        "ed25519",
        "ed448",
        "p256",
        "p384",
        "ml-dsa-44",
        "ml-dsa-65",
        "ml-dsa-87",
      ]);
    });

    for (const algorithm of SIGNING_ALGORITHMS as KeyAlgorithm[]) {
      it(`round-trips ${algorithm}`, async () => {
        const { key, file } = keyFileFor(algorithm);
        const s = await runCli(["sign", "--key-file", file, dataFile]);
        expect(s.code).to.equal(EXIT.OK);
        expect(s.stderr).to.equal("");
        expect(s.stdout).to.match(/^[0-9a-f]+\n$/);
        expect(s.stdout).not.to.include(key.privateKey);
        const v = await runCli([
          "verify",
          "--key-file",
          file,
          "--signature",
          s.stdout,
          dataFile,
        ]);
        expect(v.code).to.equal(EXIT.OK);
        expect(v.stdout).to.equal("valid\n");
      });
    }

    it("prints JSON with --json, which --signature-file reads", async () => {
      const { key, file } = keyFileFor("ed25519");
      const s = await runCli(["sign", "--json", "--key-file", file, dataFile]);
      const body = JSON.parse(s.stdout);
      expect(Object.keys(body).sort()).to.deep.equal([
        "algorithm",
        "kid",
        "signature",
      ]);
      expect(body.algorithm).to.equal("ed25519");
      expect(body.kid).to.equal(key.kid);
      const sigFile = at("sig.json");
      fs.writeFileSync(sigFile, s.stdout);
      const v = await runCli([
        "verify",
        "--json",
        "--key-file",
        file,
        "--signature-file",
        sigFile,
        dataFile,
      ]);
      expect(v.code).to.equal(EXIT.OK);
      expect(JSON.parse(v.stdout)).to.deep.equal({
        valid: true,
        algorithm: "ed25519",
        kid: key.kid,
      });
    });

    it("verifies with a public key alone, read from stdin", async () => {
      const { key, file } = keyFileFor("p256");
      const s = await runCli(["sign", "--key-file", file, dataFile]);
      const sigFile = at("p256.sig");
      fs.writeFileSync(sigFile, s.stdout);
      const publicOnly = JSON.stringify({
        algorithm: "p256",
        publicKey: key.publicKey,
      });
      const v = await runCli(
        [
          "verify",
          "--json",
          "--key-stdin",
          "--signature-file",
          sigFile,
          dataFile,
        ],
        [publicOnly],
      );
      expect(v.code).to.equal(EXIT.OK);
      expect(JSON.parse(v.stdout)).to.deep.equal({
        valid: true,
        algorithm: "p256",
      });
    });

    it("signs data from stdin and with a key from stdin", async () => {
      const { key, file } = keyFileFor("ed448");
      const a = await runCli(["sign", "--key-file", file], [message]);
      const b = await runCli(
        ["sign", "--key-stdin", dataFile],
        [JSON.stringify(key)],
      );
      expect(a.code).to.equal(EXIT.OK);
      // Ed448 signatures are deterministic.
      expect(a.stdout).to.equal(b.stdout);
    });

    describe("invalid signatures (exit 1, valid: false)", () => {
      let file: string;
      let signature: string;

      before(async () => {
        file = keyFileFor("ed25519").file;
        signature = (await runCli(["sign", "--key-file", file, dataFile]))
          .stdout;
      });

      const verify = (sig: string, input?: string) =>
        runCli(
          [
            "verify",
            "--json",
            "--key-file",
            file,
            "--signature",
            sig,
            ...(input === undefined ? [dataFile] : []),
          ],
          input === undefined ? [] : [input],
        );

      it("rejects modified data", async () => {
        const v = await verify(signature, "other data");
        expect(v.code).to.equal(EXIT.FAILURE);
        expect(JSON.parse(v.stdout).valid).to.be.false;
        expect(v.stderr).to.equal("");
      });

      it("rejects a signature by another key", async () => {
        const other = keyFileFor("ed25519").file;
        const s = await runCli(["sign", "--key-file", other, dataFile]);
        const v = await verify(s.stdout);
        expect(v.code).to.equal(EXIT.FAILURE);
        expect(JSON.parse(v.stdout).valid).to.be.false;
      });

      it("rejects a signature of the wrong length", async () => {
        const v = await verify("00");
        expect(v.code).to.equal(EXIT.FAILURE);
        expect(JSON.parse(v.stdout).valid).to.be.false;
      });

      it("rejects a signature that is not hex", async () => {
        const v = await verify(`${signature.trim()}zz`);
        expect(v.code).to.equal(EXIT.FAILURE);
        expect(JSON.parse(v.stdout).valid).to.be.false;
      });

      it("prints 'invalid' without --json", async () => {
        const v = await runCli([
          "verify",
          "--key-file",
          file,
          "--signature",
          "00",
          dataFile,
        ]);
        expect(v.code).to.equal(EXIT.FAILURE);
        expect(v.stdout).to.equal("invalid\n");
      });
    });

    describe("key file errors (exit 1)", () => {
      const signWith = (name: string, content: string) =>
        runCli(["sign", "--key-file", writeSecret(name, content), dataFile]);

      it("refuses a key that cannot sign", async () => {
        const r = await signWith(
          "x.json",
          JSON.stringify(generateKeyPair("x25519")),
        );
        expect(r.code).to.equal(EXIT.FAILURE);
        expect(r.stderr).to.include("must be a signing key");
      });

      it("refuses a file that is not JSON", async () => {
        const r = await signWith("bad.json", "not json");
        expect(r.code).to.equal(EXIT.FAILURE);
        expect(r.stderr).to.include("not JSON from crypto-cli keygen --json");
      });

      it("refuses JSON that is not an object", async () => {
        const r = await signWith("null.json", "null");
        expect(r.code).to.equal(EXIT.FAILURE);
        expect(r.stderr).to.include("must be a signing key");
      });

      it("refuses a public key for signing", async () => {
        const { publicKey } = generateKeyPair("ed25519");
        const r = await signWith(
          "pub.json",
          JSON.stringify({ algorithm: "ed25519", publicKey }),
        );
        expect(r.code).to.equal(EXIT.FAILURE);
        expect(r.stderr).to.include("the key file has no privateKey");
      });

      it("exits 1 when the signature file cannot be read", async () => {
        const { file } = keyFileFor("ed25519");
        const r = await runCli([
          "verify",
          "--key-file",
          file,
          "--signature-file",
          at("missing.sig"),
          dataFile,
        ]);
        expect(r.code).to.equal(EXIT.FAILURE);
        expect(r.stderr).to.include("ENOENT");
      });
    });

    describe("usage errors (exit 2)", () => {
      let file: string;
      before(() => {
        file = keyFileFor("ed25519").file;
      });

      it("requires a signature", async () => {
        const r = await runCli(["verify", "--key-file", file, dataFile]);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("missing signature");
      });

      it("refuses --signature with --signature-file", async () => {
        const r = await runCli([
          "verify",
          "--key-file",
          file,
          "--signature",
          "00",
          "--signature-file",
          file,
          dataFile,
        ]);
        expect(r.code).to.equal(EXIT.USAGE);
      });

      it("requires a key source", async () => {
        const r = await runCli(["sign", dataFile]);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("missing key");
      });

      it("refuses key and data both on stdin", async () => {
        const r = await runCli(["sign", "--key-stdin"], ["{}"]);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stdout).to.equal("");
      });
    });
  });

  describe("password", () => {
    const password = "correct horse battery staple";
    let passwordFile: string;
    let phcFile: string;
    let phc: string;

    before(async () => {
      passwordFile = writeSecret("password.txt", `${password}\n`);
      const r = await runCli([
        "password",
        "hash",
        "--password-file",
        passwordFile,
      ]);
      expect(r.code).to.equal(EXIT.OK);
      phc = r.stdout.trim();
      phcFile = at("password.phc");
      fs.writeFileSync(phcFile, r.stdout);
    });

    it("hashes with Argon2id and crypto-lib's defaults", () => {
      expect(phc).to.match(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$[^$]+\$[^$]+$/);
      expect(phc).not.to.include(password);
    });

    it("verifies the password, from stdin without its line break", async () => {
      const r = await runCli(
        ["password", "verify", "--password-stdin", phcFile],
        [`${password}\r\n`],
      );
      expect(r.code).to.equal(EXIT.OK);
      expect(r.stdout).to.equal("valid\n");
    });

    it("exits 1 with valid: false on a wrong password", async () => {
      const r = await runCli(
        ["password", "verify", "--json", "--password-stdin", phcFile],
        ["wrong"],
      );
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stdout).to.equal('{"valid":false}\n');
    });

    it("prints JSON with --json, which verify reads", async () => {
      const r = await runCli(
        ["password", "hash", "--json", "--password-stdin"],
        ["pw"],
      );
      const body = JSON.parse(r.stdout);
      expect(Object.keys(body).sort()).to.deep.equal([
        "algorithm",
        "params",
        "phc",
      ]);
      expect(body.algorithm).to.equal("argon2id");
      expect(body.params).to.deep.equal({ t: 3, m: 65536, p: 4 });
      const pw = writeSecret("pw.txt", "pw");
      const v = await runCli(
        ["password", "verify", "--json", "--password-file", pw],
        [r.stdout],
      );
      expect(v.code).to.equal(EXIT.OK);
      expect(JSON.parse(v.stdout)).to.deep.equal({ valid: true });
    });

    it("prompts twice to hash on a terminal", async () => {
      const asked: string[] = [];
      const promptSecret = async (message: string) => {
        asked.push(message);
        return password;
      };
      const r = await runCli(["password", "hash"], [], { promptSecret });
      expect(r.code).to.equal(EXIT.OK);
      expect(asked).to.deep.equal(["Password", "Repeat the password"]);
      const v = await runCli(["password", "verify", phcFile], [], {
        promptSecret,
      });
      expect(v.code).to.equal(EXIT.OK);
      expect(asked).to.have.length(3);
    });

    it("exits 1 when the prompted passwords differ", async () => {
      const answers = ["a", "b"];
      const r = await runCli(["password", "hash"], [], {
        promptSecret: async () => answers.shift(),
      });
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.include("the passwords do not match");
    });

    it("exits 1 on a cancelled prompt or an empty password", async () => {
      const cancelled = await runCli(["password", "verify", phcFile], [], {
        promptSecret: async () => undefined,
      });
      expect(cancelled.code).to.equal(EXIT.FAILURE);
      expect(cancelled.stderr).to.include("the password is empty");
      const empty = writeSecret("empty.txt", "\n");
      const r = await runCli(["password", "hash", "--password-file", empty]);
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.include("the password is empty");
    });

    it("exits 1 on a malformed PHC string", async () => {
      const r = await runCli(
        ["password", "verify", "--password-file", passwordFile],
        ["$argon2id$nope"],
      );
      expect(r.code).to.equal(EXIT.FAILURE);
      expect(r.stderr).to.include("Invalid PHC string");
    });

    describe("usage errors (exit 2)", () => {
      const prompt = { promptSecret: async () => password };

      it("requires a password source without a terminal", async () => {
        const r = await runCli(["password", "hash"]);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("missing password");
      });

      it("does not prompt when the PHC string is on stdin", async () => {
        const r = await runCli(["password", "verify"], [phc], prompt);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("missing password");
      });

      it("refuses password and PHC string both on stdin", async () => {
        const r = await runCli(
          ["password", "verify", "--password-stdin", "-"],
          [phc],
        );
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("--password-stdin needs the data");
      });

      it("refuses --password-file with --password-stdin", async () => {
        const r = await runCli([
          "password",
          "hash",
          "--password-file",
          passwordFile,
          "--password-stdin",
        ]);
        expect(r.code).to.equal(EXIT.USAGE);
      });

      it("requires a subcommand", async () => {
        const r = await runCli(["password"]);
        expect(r.code).to.equal(EXIT.USAGE);
        expect(r.stderr).to.include("Usage: crypto-cli password");
      });
    });
  });
});
