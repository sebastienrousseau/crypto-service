// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { PassThrough } from "node:stream";
import crypto from "node:crypto";
import {
  CryptoMcpServer,
  TOOLS,
  RESOURCES,
  PROMPTS,
  executeTool,
  readResource,
  getPrompt,
  run,
} from "../src";
import { call, callError, newKey } from "./helpers";

describe("Crypto MCP Server Suite", () => {
  let server: CryptoMcpServer;

  beforeEach(() => {
    server = new CryptoMcpServer();
  });

  describe("Protocol Handling & Lifecycle", () => {
    it("rejects request without jsonrpc 2.0", async () => {
      const res = await server.handleRequest({
        jsonrpc: "1.0" as unknown as "2.0",
        method: "ping",
      });
      expect(res.error).to.exist;
      expect(res.error?.code).to.equal(-32600);
    });

    it("handles initialize request with capabilities and server info", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      });
      expect(res.result).to.exist;
      const initResult = res.result as {
        serverInfo: { name: string };
        protocolVersion: string;
        capabilities: { tools: unknown };
      };
      expect(initResult.serverInfo.name).to.equal("crypto-service");
      expect(initResult.protocolVersion).to.equal("2024-11-05");
      expect(initResult.capabilities.tools).to.exist;
    });

    it("handles ping request", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "ping",
      });
      expect(res.result).to.deep.equal({});
    });

    it("returns error for unknown method", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "invalid/method",
      });
      expect(res.error).to.exist;
      expect(res.error?.code).to.equal(-32601);
    });
  });

  describe("Tools Protocol", () => {
    it("lists all registered tools", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/list",
      });
      const tools = (res.result as { tools: unknown[] }).tools;
      expect(tools).to.be.an("array");
      expect(tools.length).to.equal(TOOLS.length);
    });

    it("executes crypto_generate_key for every key type, returning handles", async () => {
      const ed = await newKey("ed25519");
      expect(ed.type).to.equal("ed25519");
      expect(ed.keyHandle).to.match(/^kh_[0-9a-f]{32}$/);
      expect(ed.publicKey).to.include("BEGIN PUBLIC KEY");

      expect((await newKey("rsa", { modulusLength: 2048 })).bits).to.equal(
        2048,
      );
      expect((await newKey("rsa")).bits).to.equal(2048);
      const ecc = await newKey("ecc", { curve: "prime256v1" });
      expect(ecc.curve).to.equal("prime256v1");
      expect((await newKey("ecc")).curve).to.equal("prime256v1");

      const pqc = await newKey("ml-kem-768");
      expect(pqc.type).to.equal("ml-kem-768");
      expect(pqc.publicKey).to.match(/^[0-9a-f]{2368}$/);

      const sym = await newKey("symmetric-256");
      expect(sym).to.include({ type: "symmetric-256", bits: 256 });
      expect(sym.source).to.equal("generated");
      const mac = await newKey("hmac-sha256");
      expect(mac).to.include({ type: "hmac-sha256", bits: 256 });

      for (const key of [ed, ecc, pqc, sym, mac]) {
        expect(key).to.not.have.property("privateKey");
        expect(key).to.not.have.property("secret");
      }
    });

    it("rejects crypto_generate_key without the required type", async () => {
      expect(await callError("crypto_generate_key", {})).to.include(
        'missing required property "type"',
      );
    });

    it("round-trips crypto_encrypt and crypto_decrypt with a generated key handle", async () => {
      const plaintext = "Post-Quantum Realism 2027";
      const enc = await call("crypto_encrypt", { plaintext });
      expect(enc.algorithm).to.equal("aes-256-gcm");
      expect(enc.generatedKey).to.be.true;
      expect(enc.keyHandle).to.match(/^kh_/);
      expect(enc).to.not.have.property("key");

      const dec = await call("crypto_decrypt", {
        ciphertext: enc.ciphertext,
        keyHandle: enc.keyHandle,
        iv: enc.iv,
        authTag: enc.authTag,
      });
      expect(dec.plaintext).to.equal(plaintext);

      const tampered = await callError("crypto_decrypt", {
        ciphertext: enc.ciphertext,
        keyHandle: enc.keyHandle,
        iv: enc.iv,
        authTag: "00".repeat(16),
      });
      expect(tampered).to.include("Tool error (crypto_decrypt)");
    });

    it("round-trips ChaCha20-Poly1305 with an explicit key handle", async () => {
      const plaintext = "ChaCha20 Zero-Latency";
      const { keyHandle } = await newKey("symmetric-256");
      const enc = await call("crypto_encrypt", {
        plaintext,
        algorithm: "chacha20-poly1305",
        keyHandle,
      });
      expect(enc.keyHandle).to.equal(keyHandle);
      expect(enc.generatedKey).to.be.false;

      const dec = await call("crypto_decrypt", {
        ciphertext: enc.ciphertext,
        keyHandle,
        iv: enc.iv,
        authTag: enc.authTag,
        algorithm: "chacha20-poly1305",
      });
      expect(dec.plaintext).to.equal(plaintext);
    });

    it("refuses a key handle of the wrong kind or an unknown handle", async () => {
      const mac = await newKey("hmac-sha256");
      expect(
        await callError("crypto_encrypt", {
          plaintext: "p",
          keyHandle: mac.keyHandle,
        }),
      ).to.include("refers to a hmac-sha256 key");
      expect(
        await callError("crypto_encrypt", {
          plaintext: "p",
          keyHandle: `kh_${"0".repeat(32)}`,
        }),
      ).to.include("Unknown key handle");
    });

    it("signs and verifies with Ed25519, RSA-PSS, ECDSA and HMAC handles", async () => {
      const data = "ISO 20022 Financial Transaction Payload";
      const cases: Array<[string, object, string]> = [
        ["ed25519", {}, "ed25519"],
        ["rsa", {}, "rsa-pss"],
        ["ecc", { curve: "prime256v1" }, "ecdsa-sha256"],
        ["ecc", { curve: "secp256k1" }, "ecdsa-sha256"],
        ["ecc", { curve: "secp384r1" }, "ecdsa-sha384"],
        ["hmac-sha256", {}, "hmac-sha256"],
      ];
      for (const [type, extra, algorithm] of cases) {
        const key = await newKey(type, extra);
        const signed = await call("crypto_sign", {
          data,
          keyHandle: key.keyHandle,
        });
        expect(signed.algorithm, type).to.equal(algorithm);
        const byHandle = await call("crypto_verify", {
          data,
          signature: signed.signature,
          keyHandle: key.keyHandle,
        });
        expect(byHandle, type).to.deep.equal({ algorithm, valid: true });
        const tampered = await call("crypto_verify", {
          data: `${data}!`,
          signature: signed.signature,
          keyHandle: key.keyHandle,
        });
        expect(tampered.valid, type).to.be.false;
        if (key.publicKey) {
          const byPem = await call("crypto_verify", {
            data,
            signature: signed.signature,
            publicKey: key.publicKey,
          });
          expect(byPem, type).to.deep.equal({ algorithm, valid: true });
        }
      }
    });

    it("rejects an HMAC signature of the wrong length as invalid", async () => {
      const { keyHandle } = await newKey("hmac-sha256");
      const res = await call("crypto_verify", {
        data: "d",
        signature: "00".repeat(16),
        keyHandle,
      });
      expect(res.valid).to.be.false;
    });

    it("refuses to sign with an ML-KEM or symmetric key handle", async () => {
      for (const type of ["ml-kem-768", "symmetric-256"]) {
        const { keyHandle } = await newKey(type);
        expect(
          await callError("crypto_sign", { data: "d", keyHandle }),
          type,
        ).to.include(`refers to a ${type} key`);
      }
    });

    it("crypto_verify takes exactly one public key or handle, never a private key", async () => {
      const ed = await newKey("ed25519");
      const signed = await call("crypto_sign", {
        data: "d",
        keyHandle: ed.keyHandle,
      });
      const base = { data: "d", signature: signed.signature };
      expect(await callError("crypto_verify", base)).to.include(
        "exactly one of publicKey or keyHandle",
      );
      expect(
        await callError("crypto_verify", {
          ...base,
          publicKey: ed.publicKey,
          keyHandle: ed.keyHandle,
        }),
      ).to.include("exactly one of publicKey or keyHandle");
      const { privateKey } = crypto.generateKeyPairSync("ed25519", {
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "pem" },
      });
      expect(
        await callError("crypto_verify", { ...base, publicKey: privateKey }),
      ).to.include("not a private key");
    });

    it("crypto_verify refuses public keys of unsupported types and curves", async () => {
      const pem = { type: "spki", format: "pem" } as const;
      const x25519 = crypto
        .generateKeyPairSync("x25519")
        .publicKey.export(pem) as string;
      const p521 = crypto
        .generateKeyPairSync("ec", { namedCurve: "secp521r1" })
        .publicKey.export(pem) as string;
      const base = { data: "d", signature: "00" };
      expect(
        await callError("crypto_verify", { ...base, publicKey: x25519 }),
      ).to.include("Unsupported key type: x25519");
      expect(
        await callError("crypto_verify", { ...base, publicKey: p521 }),
      ).to.include("Unsupported EC curve: secp521r1");
    });

    it("executes crypto_hash across algorithms and default sha256", async () => {
      const res = await executeTool("crypto_hash", {
        data: "test-data",
        algorithm: "sha256",
      });
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.digest).to.have.lengthOf(64);
      expect(parsed.bytes).to.equal(32);

      const resDef = await executeTool("crypto_hash", { data: "test-data" });
      const parsedDef = JSON.parse(resDef.content[0].text);
      expect(parsedDef.algorithm).to.equal("sha256");
      expect(parsedDef.digest).to.equal(parsed.digest);
    });

    it("wraps a DEK handle with crypto_kms_wrap and unwraps it to a new handle", async () => {
      const dek = await newKey("symmetric-256");
      const keyId = "arn:aws:kms:us-east-1:test";
      const wrap = await call("crypto_kms_wrap", {
        provider: "local",
        keyId,
        keyHandle: dek.keyHandle,
      });
      expect(wrap.wrappedKey).to.match(/^[0-9a-f]+$/);
      const unwrap = await call("crypto_kms_unwrap", {
        provider: "local",
        keyId,
        wrappedKey: wrap.wrappedKey,
      });
      expect(unwrap).to.not.have.property("dek");
      expect(unwrap.keyHandle).to.not.equal(dek.keyHandle);

      // The unwrapped handle decrypts what the original encrypted.
      const enc = await call("crypto_encrypt", {
        plaintext: "envelope",
        keyHandle: dek.keyHandle,
      });
      const dec = await call("crypto_decrypt", {
        ciphertext: enc.ciphertext,
        keyHandle: unwrap.keyHandle,
        iv: enc.iv,
        authTag: enc.authTag,
      });
      expect(dec.plaintext).to.equal("envelope");

      // provider and keyId are required
      expect(
        await callError("crypto_kms_wrap", { keyHandle: dek.keyHandle }),
      ).to.include("missing required property");
      expect(
        await callError("crypto_kms_unwrap", {
          provider: "local",
          keyId,
          wrappedKey: Buffer.from("invalid-format").toString("hex"),
        }),
      ).to.include("Tool error (crypto_kms_unwrap)");
    });

    it("establishes a shared key with crypto_kem_encapsulate and crypto_kem_decapsulate", async () => {
      const recipient = await newKey("ml-kem-768");
      const sender = await call("crypto_kem_encapsulate", {
        publicKey: recipient.publicKey,
      });
      expect(sender.algorithm).to.equal("ml-kem-768");
      expect(sender).to.not.have.property("sharedSecret");
      const received = await call("crypto_kem_decapsulate", {
        keyHandle: recipient.keyHandle,
        ciphertext: sender.ciphertext,
      });
      const enc = await call("crypto_encrypt", {
        plaintext: "pq hello",
        keyHandle: sender.keyHandle,
      });
      const dec = await call("crypto_decrypt", {
        ciphertext: enc.ciphertext,
        keyHandle: received.keyHandle,
        iv: enc.iv,
        authTag: enc.authTag,
      });
      expect(dec.plaintext).to.equal("pq hello");
    });

    it("lists and destroys key handles", async () => {
      const key = await newKey("ed25519");
      const listed = await call("crypto_key_list", {});
      expect(listed.capacity).to.equal(64);
      const entry = listed.keys.find(
        (k: { keyHandle: string }) => k.keyHandle === key.keyHandle,
      );
      expect(entry).to.include({ type: "ed25519", publicKey: key.publicKey });
      expect(entry.createdAt).to.be.a("string");

      const destroyed = await call("crypto_key_destroy", {
        keyHandle: key.keyHandle,
      });
      expect(destroyed).to.deep.equal({
        keyHandle: key.keyHandle,
        destroyed: true,
      });
      expect(
        await callError("crypto_key_destroy", { keyHandle: key.keyHandle }),
      ).to.include("Unknown key handle");
      expect(
        await callError("crypto_sign", { data: "d", keyHandle: key.keyHandle }),
      ).to.include("Unknown key handle");
    });

    it("executes crypto_inspect_key for PEM, OpenPGP, and raw keys", async () => {
      const rsaPem = `-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEA...\n-----END RSA PUBLIC KEY-----`;
      const inspectRsa = await executeTool("crypto_inspect_key", {
        keyData: rsaPem,
      });
      expect(JSON.parse(inspectRsa.content[0].text).type).to.equal("RSA");

      const rsaPrivPem = `-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----`;
      const inspectRsaPriv = await executeTool("crypto_inspect_key", {
        keyData: rsaPrivPem,
      });
      expect(JSON.parse(inspectRsaPriv.content[0].text).type).to.equal("RSA");

      const pgpArmored = `-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP\n...\n-----END PGP PUBLIC KEY BLOCK-----`;
      const inspectPgp = await executeTool("crypto_inspect_key", {
        keyData: pgpArmored,
      });
      expect(JSON.parse(inspectPgp.content[0].text).format).to.equal("OpenPGP");

      const ecPem = `-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----`;
      const inspectEc = await executeTool("crypto_inspect_key", {
        keyData: ecPem,
      });
      expect(JSON.parse(inspectEc.content[0].text).type).to.equal("ECC");

      const ecPubPem = `-----BEGIN EC PUBLIC KEY-----\n...\n-----END EC PUBLIC KEY-----`;
      const inspectEcPub = await executeTool("crypto_inspect_key", {
        keyData: ecPubPem,
      });
      expect(JSON.parse(inspectEcPub.content[0].text).type).to.equal("ECC");

      const spkiPem = `-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----`;
      const inspectSpki = await executeTool("crypto_inspect_key", {
        keyData: spkiPem,
      });
      expect(JSON.parse(inspectSpki.content[0].text).type).to.equal(
        "SPKI Public Key",
      );

      const pkcs8Pem = `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`;
      const inspectPkcs8 = await executeTool("crypto_inspect_key", {
        keyData: pkcs8Pem,
      });
      expect(JSON.parse(inspectPkcs8.content[0].text).type).to.equal(
        "PKCS#8 Private Key",
      );

      const raw = `random-binary-key-bytes`;
      const inspectRaw = await executeTool("crypto_inspect_key", {
        keyData: raw,
      });
      expect(JSON.parse(inspectRaw.content[0].text).format).to.equal("Raw");

      const inspectEmpty = await executeTool("crypto_inspect_key", {
        keyData: "",
      });
      expect(JSON.parse(inspectEmpty.content[0].text).type).to.equal("unknown");
    });

    it("executes crypto_audit_cbom with risk classification", async () => {
      const res = await executeTool("crypto_audit_cbom", {
        algorithms: "ML-KEM-768, RSA-2048, MD5, AES-256-GCM, SHA-1",
      });
      const data = JSON.parse(res.content[0].text);
      expect(data.bomFormat).to.equal("CycloneDX-CBOM-1.6");
      expect(data.totalAudited).to.equal(5);
      expect(data.quantumSafeCount).to.equal(1);
      expect(data.vulnerableCount).to.equal(4);

      const emptyAudit = await executeTool("crypto_audit_cbom", {
        algorithms: "",
      });
      expect(JSON.parse(emptyAudit.content[0].text).totalAudited).to.equal(0);
    });

    it("handles unknown tool and exception cases", async () => {
      const unknown = await executeTool("nonexistent_tool", {});
      expect(unknown.isError).to.be.true;

      const badDecrypt = await executeTool("crypto_decrypt", {
        ciphertext: "invalid",
      });
      expect(badDecrypt.isError).to.be.true;
    });

    it("invokes tools via server handleRequest including without params", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 20,
        method: "tools/call",
        params: { name: "crypto_hash", arguments: { data: "mcp-test" } },
      });
      expect(res.result).to.exist;
      expect(
        (res.result as { content: Array<{ text: string }> }).content[0].text,
      ).to.include("sha256");

      const noParamsRes = await server.handleRequest({
        jsonrpc: "2.0",
        id: 21,
        method: "tools/call",
      });
      expect(noParamsRes.result).to.exist;

      const noParamsResource = await server.handleRequest({
        jsonrpc: "2.0",
        id: 22,
        method: "resources/read",
      });
      expect(noParamsResource.error).to.exist;

      const noParamsPrompt = await server.handleRequest({
        jsonrpc: "2.0",
        id: 23,
        method: "prompts/get",
      });
      expect(noParamsPrompt.error).to.exist;
    });
  });

  describe("Resources Protocol", () => {
    it("lists all registered resources", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 30,
        method: "resources/list",
      });
      const resources = (res.result as { resources: unknown[] }).resources;
      expect(resources).to.be.an("array");
      expect(resources.length).to.equal(RESOURCES.length);
    });

    it("reads crypto://standards/pqc resource", async () => {
      const res = await readResource("crypto://standards/pqc");
      expect(res.contents[0].text).to.include("ML-KEM");
      expect(res.contents[0].text).to.include("203");
    });

    it("reads crypto://algorithms/matrix resource", async () => {
      const res = await readResource("crypto://algorithms/matrix");
      expect(res.contents[0].text).to.include("ChaCha20-Poly1305");
      expect(res.contents[0].text).to.include("AES-256-GCM");
    });

    it("throws on unknown resource uri", async () => {
      try {
        await readResource("crypto://unknown/uri");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect((e as Error).message).to.include("Resource not found");
      }
    });

    it("reads resource via server handleRequest", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 31,
        method: "resources/read",
        params: { uri: "crypto://standards/pqc" },
      });
      expect(res.result).to.exist;
    });
  });

  describe("Prompts Protocol", () => {
    it("lists all registered prompts", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 40,
        method: "prompts/list",
      });
      const prompts = (res.result as { prompts: unknown[] }).prompts;
      expect(prompts).to.be.an("array");
      expect(prompts.length).to.equal(PROMPTS.length);
    });

    it("retrieves pqc-migration-plan prompt with default and custom args", async () => {
      const defPrompt = await getPrompt("pqc-migration-plan", {});
      expect(defPrompt.messages[0].content.text).to.include(
        "Enterprise Application",
      );

      const customPrompt = await getPrompt("pqc-migration-plan", {
        targetSystem: "SWIFT Gateway",
      });
      expect(customPrompt.messages[0].content.text).to.include("SWIFT Gateway");
    });

    it("retrieves dora-compliance-check prompt", async () => {
      const defPrompt = await getPrompt("dora-compliance-check", {});
      expect(defPrompt.messages[0].content.text).to.include("Financial Entity");

      const customPrompt = await getPrompt("dora-compliance-check", {
        organizationType: "Tier-1 Bank",
      });
      expect(customPrompt.messages[0].content.text).to.include("Tier-1 Bank");
    });

    it("throws on unknown prompt name", async () => {
      try {
        await getPrompt("unknown-prompt");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect((e as Error).message).to.include("Prompt not found");
      }
    });

    it("retrieves prompt via server handleRequest", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 41,
        method: "prompts/get",
        params: { name: "dora-compliance-check" },
      });
      expect(res.result).to.exist;

      const resWithArgs = await server.handleRequest({
        jsonrpc: "2.0",
        id: 43,
        method: "prompts/get",
        params: {
          name: "pqc-migration-plan",
          arguments: { targetSystem: "SWIFT Gateway" },
        },
      });
      expect(resWithArgs.result).to.exist;
    });

    it("returns error on handler exception", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 42,
        method: "prompts/get",
        params: { name: "invalid" },
      });
      expect(res.error).to.exist;
    });
  });

  describe("Stdio Transport & CLI", () => {
    it("processes lines over stdio and responds with json", (done) => {
      const input = new PassThrough();
      const output = new PassThrough();

      server.listenStdio(input, output);

      output.on("data", (chunk: Buffer) => {
        const parsed = JSON.parse(chunk.toString().trim());
        expect(parsed.result).to.deep.equal({});
        done();
      });

      input.write(
        JSON.stringify({ jsonrpc: "2.0", id: 99, method: "ping" }) + "\n",
      );
    });

    it("ignores empty lines on stdio", (done) => {
      const input = new PassThrough();
      const output = new PassThrough();

      server.listenStdio(input, output);
      let callCount = 0;
      output.on("data", () => {
        callCount++;
      });

      input.write("\n   \n");
      setTimeout(() => {
        expect(callCount).to.equal(0);
        done();
      }, 50);
    });

    it("handles invalid JSON on stdio with parse error", (done) => {
      const input = new PassThrough();
      const output = new PassThrough();

      server.listenStdio(input, output);

      output.on("data", (chunk: Buffer) => {
        const parsed = JSON.parse(chunk.toString().trim());
        expect(parsed.error.code).to.equal(-32700);
        done();
      });

      input.write("not-valid-json\n");
    });

    it("verifies isInitialized state before and after initialize", async () => {
      expect(server.isInitialized()).to.be.false;
      await server.handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      });
      expect(server.isInitialized()).to.be.true;
    });

    it("exports runnable cli function without crashing", () => {
      expect(run).to.be.a("function");
      // Execute run() with a non-interactive stdin
      const origIn = process.stdin;
      const origOut = process.stdout;
      const dummyIn = new PassThrough();
      const dummyOut = new PassThrough();
      Object.defineProperty(process, "stdin", {
        value: dummyIn,
        configurable: true,
      });
      Object.defineProperty(process, "stdout", {
        value: dummyOut,
        configurable: true,
      });
      try {
        run();
      } finally {
        Object.defineProperty(process, "stdin", {
          value: origIn,
          configurable: true,
        });
        Object.defineProperty(process, "stdout", {
          value: origOut,
          configurable: true,
        });
      }
    });
  });
});
