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

    it("executes crypto_generate_key for ed25519, rsa, ecc, ml-kem-768", async () => {
      const edRes = await executeTool("crypto_generate_key", {
        type: "ed25519",
      });
      expect(edRes.isError).to.be.undefined;
      expect(edRes.content[0].text).to.include("ed25519");

      const rsaRes = await executeTool("crypto_generate_key", {
        type: "rsa",
        modulusLength: 2048,
      });
      expect(rsaRes.isError).to.be.undefined;
      expect(rsaRes.content[0].text).to.include("rsa");

      const rsaDefRes = await executeTool("crypto_generate_key", {
        type: "rsa",
      });
      expect(rsaDefRes.content[0].text).to.include("2048");

      const eccRes = await executeTool("crypto_generate_key", {
        type: "ecc",
        curve: "prime256v1",
      });
      expect(eccRes.isError).to.be.undefined;
      expect(eccRes.content[0].text).to.include("prime256v1");

      const eccDefRes = await executeTool("crypto_generate_key", {
        type: "ecc",
      });
      expect(eccDefRes.content[0].text).to.include("prime256v1");

      const pqcRes = await executeTool("crypto_generate_key", {
        type: "ml-kem-768",
      });
      expect(pqcRes.isError).to.be.undefined;
      expect(pqcRes.content[0].text).to.include("ml-kem-768");

      const unsupp = await executeTool("crypto_generate_key", {
        type: "unsupported-alg",
      });
      expect(unsupp.isError).to.be.true;
    });

    it("executes default crypto_generate_key when type is not provided", async () => {
      const defRes = await executeTool("crypto_generate_key", {});
      expect(defRes.content[0].text).to.include("ed25519");
    });

    it("executes crypto_encrypt and crypto_decrypt roundtrip (AES-256-GCM) with default and explicit algorithm", async () => {
      const plaintext = "Post-Quantum Realism 2027";
      // Default algorithm (omit algorithm) and auto-generated key
      const encRes = await executeTool("crypto_encrypt", { plaintext });
      const encData = JSON.parse(encRes.content[0].text);
      expect(encData.algorithm).to.equal("aes-256-gcm");
      expect(encData.key).to.exist;

      // Decrypt with default algorithm
      const decRes = await executeTool("crypto_decrypt", {
        ciphertext: encData.ciphertext,
        key: encData.key,
        iv: encData.iv,
        authTag: encData.authTag,
      });
      const decData = JSON.parse(decRes.content[0].text);
      expect(decData.plaintext).to.equal(plaintext);

      // Explicit algorithm and explicit key
      const explicitKey = crypto.randomBytes(32).toString("hex");
      const encRes2 = await executeTool("crypto_encrypt", {
        plaintext,
        algorithm: "aes-256-gcm",
        key: explicitKey,
      });
      const encData2 = JSON.parse(encRes2.content[0].text);
      expect(encData2.key).to.be.undefined;
    });

    it("executes crypto_encrypt and crypto_decrypt with custom key and ChaCha20-Poly1305, plus auto key", async () => {
      const plaintext = "ChaCha20 Zero-Latency";
      const customKey = crypto.randomBytes(32).toString("hex");
      const encRes = await executeTool("crypto_encrypt", {
        plaintext,
        algorithm: "chacha20-poly1305",
        key: customKey,
      });
      const encData = JSON.parse(encRes.content[0].text);
      expect(encData.key).to.be.undefined;

      const decRes = await executeTool("crypto_decrypt", {
        ciphertext: encData.ciphertext,
        key: customKey,
        iv: encData.iv,
        authTag: encData.authTag,
        algorithm: "chacha20-poly1305",
      });
      const decData = JSON.parse(decRes.content[0].text);
      expect(decData.plaintext).to.equal(plaintext);

      // ChaCha20 with auto-generated key
      const encResAuto = await executeTool("crypto_encrypt", {
        plaintext,
        algorithm: "chacha20-poly1305",
      });
      const encDataAuto = JSON.parse(encResAuto.content[0].text);
      expect(encDataAuto.key).to.exist;
    });

    it("hashes string key if not 32 bytes hex in crypto_encrypt/decrypt", async () => {
      const plaintext = "Short Key Passphrase";
      const shortKey = "my-secret-passphrase";
      const encRes = await executeTool("crypto_encrypt", {
        plaintext,
        key: shortKey,
      });
      const encData = JSON.parse(encRes.content[0].text);

      const decRes = await executeTool("crypto_decrypt", {
        ciphertext: encData.ciphertext,
        key: shortKey,
        iv: encData.iv,
        authTag: encData.authTag,
      });
      const decData = JSON.parse(decRes.content[0].text);
      expect(decData.plaintext).to.equal(plaintext);
    });

    it("executes crypto_sign and crypto_verify with Ed25519 (explicit and default) and HMAC", async () => {
      const message = "ISO 20022 Financial Transaction Payload";
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      // Default algorithm
      const signDef = await executeTool("crypto_sign", {
        data: message,
        privateKey,
      });
      const signDefData = JSON.parse(signDef.content[0].text);
      expect(signDefData.algorithm).to.equal("ed25519");

      const verifyDef = await executeTool("crypto_verify", {
        data: message,
        signature: signDefData.signature,
        publicKey,
      });
      expect(JSON.parse(verifyDef.content[0].text).valid).to.be.true;

      const signRes = await executeTool("crypto_sign", {
        data: message,
        algorithm: "ed25519",
        privateKey,
      });
      const signData = JSON.parse(signRes.content[0].text);

      const verifyRes = await executeTool("crypto_verify", {
        data: message,
        signature: signData.signature,
        algorithm: "ed25519",
        publicKey,
      });
      const verifyData = JSON.parse(verifyRes.content[0].text);
      expect(verifyData.valid).to.be.true;

      // HMAC test
      const hmacKey = "super-secret-hmac-key";
      const hmacSign = await executeTool("crypto_sign", {
        data: message,
        algorithm: "hmac-sha256",
        privateKey: hmacKey,
      });
      const hmacSigData = JSON.parse(hmacSign.content[0].text);

      const hmacVerify = await executeTool("crypto_verify", {
        data: message,
        signature: hmacSigData.signature,
        algorithm: "hmac-sha256",
        publicKey: hmacKey,
      });
      expect(JSON.parse(hmacVerify.content[0].text).valid).to.be.true;

      // Bad signature HMAC
      const badHmacVerify = await executeTool("crypto_verify", {
        data: message,
        signature: "00".repeat(32),
        algorithm: "hmac-sha256",
        publicKey: hmacKey,
      });
      expect(JSON.parse(badHmacVerify.content[0].text).valid).to.be.false;
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

    it("executes crypto_kms_wrap and unwrap roundtrip with custom and default parameters", async () => {
      const dek = crypto.randomBytes(32).toString("hex");
      const wrapRes = await executeTool("crypto_kms_wrap", {
        provider: "aws",
        keyId: "arn:aws:kms:us-east-1:test",
        dek,
      });
      const wrapData = JSON.parse(wrapRes.content[0].text);

      const unwrapRes = await executeTool("crypto_kms_unwrap", {
        provider: "aws",
        keyId: "arn:aws:kms:us-east-1:test",
        wrappedKey: wrapData.wrappedKey,
      });
      const unwrapData = JSON.parse(unwrapRes.content[0].text);
      expect(unwrapData.dek).to.equal(dek);

      // Default KMS wrap/unwrap parameters
      const wrapDef = await executeTool("crypto_kms_wrap", { dek });
      const wrapDefData = JSON.parse(wrapDef.content[0].text);
      expect(wrapDefData.provider).to.equal("local");
      expect(wrapDefData.keyId).to.equal("kms-key-default");

      const unwrapDef = await executeTool("crypto_kms_unwrap", {
        wrappedKey: wrapDefData.wrappedKey,
      });
      const unwrapDefData = JSON.parse(unwrapDef.content[0].text);
      expect(unwrapDefData.dek).to.equal(dek);

      // Invalid wrapped payload
      const badUnwrap = await executeTool("crypto_kms_unwrap", {
        provider: "aws",
        keyId: "test",
        wrappedKey: Buffer.from("invalid-format").toString("hex"),
      });
      expect(badUnwrap.isError).to.be.true;
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

      const inspectEmpty = await executeTool("crypto_inspect_key", {});
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

      const emptyAudit = await executeTool("crypto_audit_cbom", {});
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

    it("signs and verifies data with RSA", async () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      const data = "Sensitive RSA Payload";
      const signRes = await executeTool("crypto_sign", {
        data,
        algorithm: "rsa-pss",
        privateKey,
      });
      const signData = JSON.parse(signRes.content[0].text);

      const verifyRes = await executeTool("crypto_verify", {
        data,
        signature: signData.signature,
        algorithm: "rsa-pss",
        publicKey,
      });
      expect(JSON.parse(verifyRes.content[0].text).valid).to.be.true;
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
