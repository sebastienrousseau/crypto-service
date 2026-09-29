// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { PassThrough } from "node:stream";
import {
  CryptoLspServer,
  analyzeDocument,
  getHover,
  getCodeActions,
  getCompletions,
  DiagnosticSeverity,
  run,
} from "../src";

describe("Crypto LSP Server Suite", () => {
  let server: CryptoLspServer;

  beforeEach(() => {
    server = new CryptoLspServer();
  });

  describe("Server Lifecycle & Base Protocol", () => {
    it("rejects non-2.0 jsonrpc requests", async () => {
      const res = await server.handleRequest({
        jsonrpc: "1.0" as unknown as "2.0",
        method: "initialize",
      });
      expect(res).to.exist;
      expect(res?.error?.code).to.equal(-32600);
    });

    it("handles initialize and exposes server capabilities", async () => {
      expect(server.isInitialized()).to.be.false;
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      });
      expect(res).to.exist;
      expect(server.isInitialized()).to.be.true;

      const initResult = res?.result as {
        serverInfo: { name: string };
        capabilities: {
          hoverProvider: boolean;
          codeActionProvider: boolean;
          completionProvider: unknown;
        };
      };
      expect(initResult.serverInfo.name).to.equal("crypto-lsp");
      expect(initResult.capabilities.hoverProvider).to.be.true;
      expect(initResult.capabilities.codeActionProvider).to.be.true;
      expect(initResult.capabilities.completionProvider).to.exist;
    });

    it("handles initialized notification without returning response", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        method: "initialized",
      });
      expect(res).to.be.null;
    });

    it("handles shutdown and exit methods", async () => {
      const shutRes = await server.handleRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "shutdown",
      });
      expect(shutRes).to.exist;
      expect(shutRes?.result).to.be.null;

      const exitRes = await server.handleRequest({
        jsonrpc: "2.0",
        method: "exit",
      });
      expect(exitRes).to.be.null;
    });

    it("returns -32601 on unknown LSP method", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "custom/unknown",
      });
      expect(res?.error?.code).to.equal(-32601);
    });
  });

  describe("Document Synchronization & Management", () => {
    const docUri = "file:///workspace/test.ts";

    it("handles didOpen, publishes diagnostics, and tracks document", async () => {
      const code = 'const h = crypto.createHash("md5");';
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri: docUri,
            languageId: "typescript",
            version: 1,
            text: code,
          },
        },
      });

      expect(res).to.exist;
      const pub = res?.result as {
        uri: string;
        diagnostics: Array<{ code: string }>;
      };
      expect(pub.uri).to.equal(docUri);
      expect(pub.diagnostics).to.have.lengthOf(1);
      expect(pub.diagnostics[0].code).to.equal("CRYPTO-001");
      expect(server.getDocument(docUri)).to.equal(code);
    });

    it("handles didChange and updates diagnostics", async () => {
      // First open
      await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri: docUri,
            languageId: "typescript",
            version: 1,
            text: "const a = 1;",
          },
        },
      });

      // Change to weak cipher
      const newCode = 'const c = crypto.createCipher("aes-128-ecb", key);';
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didChange",
        params: {
          textDocument: { uri: docUri, version: 2 },
          contentChanges: [{ text: newCode }],
        },
      });

      expect(res).to.exist;
      const pub = res?.result as {
        uri: string;
        diagnostics: Array<{ code: string }>;
      };
      expect(pub.diagnostics).to.have.lengthOf(1);
      expect(pub.diagnostics[0].code).to.equal("CRYPTO-002");
      expect(server.getDocument(docUri)).to.equal(newCode);
    });

    it("handles didClose and clears stored document", async () => {
      await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri: docUri,
            languageId: "typescript",
            version: 1,
            text: "code",
          },
        },
      });
      expect(server.getDocument(docUri)).to.exist;

      const res = await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didClose",
        params: { textDocument: { uri: docUri } },
      });
      expect(res).to.be.null;
      expect(server.getDocument(docUri)).to.be.undefined;
    });

    it("handles missing or malformed params in sync notifications gracefully", async () => {
      const openNull = await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
      });
      expect(openNull).to.be.null;

      const changeNull = await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didChange",
      });
      expect(changeNull).to.be.null;

      const closeNull = await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didClose",
      });
      expect(closeNull).to.be.null;
    });
  });

  describe("Cryptographic Diagnostic Rules (analyzeDocument)", () => {
    it("flags CRYPTO-001 for broken hashes: MD5, SHA-1, MD4, RIPEMD160", () => {
      const text = [
        'const h1 = crypto.createHash("md5");',
        "const h2 = crypto.createHash('sha1');",
        'const h3 = crypto.createHash("sha-1");',
        'const h4 = crypto.createHash("md4");',
        'const h5 = crypto.createHash("ripemd160");',
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(5);
      for (const d of diags) {
        expect(d.code).to.equal("CRYPTO-001");
        expect(d.severity).to.equal(DiagnosticSeverity.Error);
        expect(d.message).to.include("broken cryptographic hash");
      }
    });

    it("flags CRYPTO-002 for insecure symmetric ciphers and ECB mode", () => {
      const text = [
        'const c1 = crypto.createCipher("aes-128-ecb", k);',
        'const c2 = crypto.createCipher("aes-256-ecb", k);',
        'const c3 = crypto.createCipher("des", k);',
        'const c4 = crypto.createCipher("3des", k);',
        'const c5 = crypto.createCipher("des-ede3", k);',
        'const c6 = crypto.createCipher("rc4", k);',
        'const c7 = crypto.createCipher("blowfish", k);',
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(7);
      for (const d of diags) {
        expect(d.code).to.equal("CRYPTO-002");
        expect(d.severity).to.equal(DiagnosticSeverity.Error);
        expect(d.message).to.include("deprecated cipher");
      }
    });

    it("flags CRYPTO-003 for weak RSA key length < 2048", () => {
      const text = [
        "const opts1 = { modulusLength: 512 };",
        "const opts2 = { bits: 1024 };",
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(2);
      expect(diags[0].code).to.equal("CRYPTO-003");
      expect(diags[0].message).to.include("512 bits");
      expect(diags[1].code).to.equal("CRYPTO-003");
      expect(diags[1].message).to.include("1024 bits");
    });

    it("flags CRYPTO-004 for quantum-vulnerable classical public-key cryptography", () => {
      const text = [
        'const rsa = crypto.generateKeyPairSync("rsa", {});',
        'const ec = crypto.generateKeyPair("ec", {});',
        'const ed = crypto.generateKeyPairSync("ed25519", {});',
        'const kex = { algorithm: "ecdh" };',
        'const sig = { algorithm: "ecdsa" };',
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(5);
      for (const d of diags) {
        expect(d.code).to.equal("CRYPTO-004");
        expect(d.severity).to.equal(DiagnosticSeverity.Warning);
        expect(d.message).to.include("Shor's algorithm");
      }
    });

    it("flags CRYPTO-005 for hardcoded secret and private keys", () => {
      const text = [
        'const secret_key = "0123456789abcdef0123456789abcdef";',
        'const apiKey = "aabbccddeeff00112233445566778899";',
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(2);
      expect(diags[0].code).to.equal("CRYPTO-005");
      expect(diags[1].code).to.equal("CRYPTO-005");
    });

    it("flags CRYPTO-006 for malformed PEM header boundaries", () => {
      const text = [
        "-----BEGIN CERTIFICATE WITHOUT CLOSING",
        "valid text line",
        "-----BEGIN CERTIFICATE-----",
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(1);
      expect(diags[0].code).to.equal("CRYPTO-006");
      expect(diags[0].message).to.include("Malformed or unterminated PEM");
    });

    it("returns zero diagnostics for secure quantum-safe code", () => {
      const text = [
        'const kem = cryptoService.generateKey("ml-kem-768");',
        'const cipher = cryptoService.encrypt("chacha20-poly1305", data, key);',
        'const hash = crypto.createHash("sha256").update(data).digest();',
      ].join("\n");

      const diags = analyzeDocument("test.ts", text);
      expect(diags).to.have.lengthOf(0);
    });
  });

  describe("Hover Provider", () => {
    const sampleDoc = [
      'const kem = "ml-kem-768";',
      'const sig = "ml-dsa-65";',
      'const slh = "slh-dsa";',
      'const cipher = "aes-256-gcm";',
      'const stream = "chacha20-poly1305";',
      'const legacy = "ed25519";',
      'const rsa = "rsa";',
      'const bad = "md5";',
      'const bad2 = "sha-1";',
      'const normal = "nothing here";',
    ].join("\n");

    it("provides markdown hover for post-quantum and classical algorithms", () => {
      const kemHover = getHover(sampleDoc, { line: 0, character: 15 });
      expect(kemHover).to.exist;
      expect(kemHover?.contents.value).to.include("FIPS 203");
      expect(kemHover?.contents.value).to.include("✅ Yes");

      const dsaHover = getHover(sampleDoc, { line: 1, character: 15 });
      expect(dsaHover?.contents.value).to.include("FIPS 204");

      const slhHover = getHover(sampleDoc, { line: 2, character: 15 });
      expect(slhHover?.contents.value).to.include("FIPS 205");

      const aesHover = getHover(sampleDoc, { line: 3, character: 18 });
      expect(aesHover?.contents.value).to.include("AES-256-GCM");

      const chachaHover = getHover(sampleDoc, { line: 4, character: 20 });
      expect(chachaHover?.contents.value).to.include("ChaCha20-Poly1305");

      const edHover = getHover(sampleDoc, { line: 5, character: 18 });
      expect(edHover?.contents.value).to.include(
        "❌ No (Vulnerable to Shor's Algorithm)",
      );

      const rsaHover = getHover(sampleDoc, { line: 6, character: 14 });
      expect(rsaHover?.contents.value).to.include("integer factorization");

      const md5Hover = getHover(sampleDoc, { line: 7, character: 14 });
      expect(md5Hover?.contents.value).to.include("DEPRECATED");

      const sha1Hover = getHover(sampleDoc, { line: 8, character: 14 });
      expect(sha1Hover?.contents.value).to.include("SHAttered");
    });

    it("returns null for non-cryptographic tokens or out of range positions", () => {
      const nonCrypto = getHover(sampleDoc, { line: 9, character: 5 });
      expect(nonCrypto).to.be.null;

      const outOfRange = getHover(sampleDoc, { line: 99, character: 0 });
      expect(outOfRange).to.be.null;
    });

    it("serves hover request via server handleRequest", async () => {
      const uri = "file:///workspace/hover.ts";
      await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri,
            languageId: "typescript",
            version: 1,
            text: 'const alg = "aes-256-gcm";',
          },
        },
      });

      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 10,
        method: "textDocument/hover",
        params: {
          textDocument: { uri },
          position: { line: 0, character: 15 },
        },
      });
      expect(res?.result).to.exist;
      expect(
        (res?.result as { contents: { value: string } }).contents.value,
      ).to.include("AES-256-GCM");

      const emptyRes = await server.handleRequest({
        jsonrpc: "2.0",
        id: 11,
        method: "textDocument/hover",
      });
      expect(emptyRes?.result).to.be.null;

      const untrackedHover = await server.handleRequest({
        jsonrpc: "2.0",
        id: 12,
        method: "textDocument/hover",
        params: {
          textDocument: { uri: "file:///workspace/untracked.ts" },
          position: { line: 0, character: 0 },
        },
      });
      expect(untrackedHover?.result).to.be.null;
    });
  });

  describe("Code Actions & QuickFixes", () => {
    const uri = "file:///workspace/quickfix.ts";

    it("generates QuickFixes for CRYPTO-001 (Hash upgrade)", () => {
      const text = 'const h = crypto.createHash("md5");';
      const diags = analyzeDocument(uri, text);
      const actions = getCodeActions(uri, text, diags[0].range, diags);

      expect(actions).to.have.lengthOf(2);
      expect(actions[0].title).to.include("SHA-256");
      expect(actions[0].isPreferred).to.be.true;
      expect(actions[0].edit?.changes?.[uri][0].newText).to.equal("sha256");
      expect(actions[1].title).to.include("SHA-512");
    });

    it("generates QuickFixes for CRYPTO-002 (Cipher upgrade)", () => {
      const text = 'const c = crypto.createCipher("aes-128-ecb", k);';
      const diags = analyzeDocument(uri, text);
      const actions = getCodeActions(uri, text, diags[0].range, diags);

      expect(actions).to.have.lengthOf(2);
      expect(actions[0].title).to.include("AES-256-GCM");
      expect(actions[0].edit?.changes?.[uri][0].newText).to.equal(
        "aes-256-gcm",
      );
      expect(actions[1].title).to.include("ChaCha20-Poly1305");
    });

    it("generates QuickFixes for CRYPTO-003 (RSA key size upgrade)", () => {
      const text = "const opts = { modulusLength: 1024 };";
      const diags = analyzeDocument(uri, text);
      const actions = getCodeActions(uri, text, diags[0].range, diags);

      expect(actions).to.have.lengthOf(1);
      expect(actions[0].title).to.include("3072 bits");
      expect(actions[0].edit?.changes?.[uri][0].newText).to.equal(
        "modulusLength: 3072",
      );
    });

    it("generates QuickFixes for CRYPTO-004 (Quantum migration to ML-KEM/ML-DSA)", () => {
      const text = 'const k = { algorithm: "rsa" };';
      const diags = analyzeDocument(uri, text);
      const actions = getCodeActions(uri, text, diags[0].range, diags);

      expect(actions).to.have.lengthOf(2);
      expect(actions[0].title).to.include("ML-KEM-768");
      expect(actions[1].title).to.include("ML-DSA-65");
    });

    it("returns empty actions array if target line is out of bounds or no diagnostic match", () => {
      const actionsOutOfBounds = getCodeActions(
        uri,
        "line1\nline2",
        { start: { line: 10, character: 0 }, end: { line: 10, character: 5 } },
        [],
      );
      expect(actionsOutOfBounds).to.deep.equal([]);

      const text = 'const h = crypto.createHash("md5");\nconst safe = 1;';
      const diags = analyzeDocument(uri, text);
      const diffLineActions = getCodeActions(
        uri,
        text,
        { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
        diags,
      );
      expect(diffLineActions).to.deep.equal([]);
    });

    it("serves code action request via server handleRequest", async () => {
      const text = 'const h = crypto.createHash("md5");';
      await server.handleRequest({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: { uri, languageId: "typescript", version: 1, text },
        },
      });

      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 20,
        method: "textDocument/codeAction",
        params: {
          textDocument: { uri },
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 30 },
          },
        },
      });

      expect(res?.result).to.be.an("array");
      expect((res?.result as unknown[]).length).to.be.greaterThan(0);

      const emptyRes = await server.handleRequest({
        jsonrpc: "2.0",
        id: 21,
        method: "textDocument/codeAction",
      });
      expect(emptyRes?.result).to.deep.equal([]);

      const contextRes = await server.handleRequest({
        jsonrpc: "2.0",
        id: 22,
        method: "textDocument/codeAction",
        params: {
          textDocument: { uri: "file:///workspace/untracked.ts" },
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
          },
          context: {
            diagnostics: [
              {
                code: "CRYPTO-001",
                message: "test",
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 5 },
                },
                severity: DiagnosticSeverity.Error,
                source: "crypto-lsp",
              },
            ],
          },
        },
      });
      expect(contextRes?.result).to.be.an("array");
    });
  });

  describe("Completion Provider", () => {
    it("returns cryptographic completion items including PQC, symmetric, and hashes", () => {
      const items = getCompletions();
      expect(items).to.be.an("array");
      expect(items.length).to.be.greaterThan(5);

      const kem = items.find((i) => i.label === "ML-KEM-768");
      expect(kem).to.exist;
      expect(kem?.detail).to.include("FIPS 203");

      const dsa = items.find((i) => i.label === "ML-DSA-65");
      expect(dsa).to.exist;
      expect(dsa?.detail).to.include("FIPS 204");
    });

    it("serves completion request via server handleRequest", async () => {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: 30,
        method: "textDocument/completion",
      });
      expect(res?.result).to.be.an("array");
    });
  });

  describe("Stdio Transport & CLI Execution", () => {
    it("processes JSON-RPC over stdio streams", (done) => {
      const input = new PassThrough();
      const output = new PassThrough();

      server.listenStdio(input, output);

      output.on("data", (chunk: Buffer) => {
        const parsed = JSON.parse(chunk.toString().trim());
        expect(parsed.result.serverInfo.name).to.equal("crypto-lsp");
        done();
      });

      input.write(
        JSON.stringify({ jsonrpc: "2.0", id: 100, method: "initialize" }) +
          "\n",
      );
    });

    it("handles Content-Length headers and empty lines on stdio", (done) => {
      const input = new PassThrough();
      const output = new PassThrough();

      server.listenStdio(input, output);
      let received = false;

      output.on("data", (chunk: Buffer) => {
        const parsed = JSON.parse(chunk.toString().trim());
        if (parsed.id === 101) {
          received = true;
          expect(received).to.be.true;
          done();
        }
      });

      input.write("Content-Length: 50\r\n\r\n\n   \n");
      input.write(
        JSON.stringify({ jsonrpc: "2.0", id: 101, method: "shutdown" }) + "\n",
      );
    });

    it("handles malformed JSON on stdio and responds with parse error", (done) => {
      const input = new PassThrough();
      const output = new PassThrough();

      server.listenStdio(input, output);

      output.on("data", (chunk: Buffer) => {
        const parsed = JSON.parse(chunk.toString().trim());
        expect(parsed.error.code).to.equal(-32700);
        done();
      });

      input.write("this is not json\n");
    });

    it("exports runnable cli function without crashing", () => {
      expect(run).to.be.a("function");
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
