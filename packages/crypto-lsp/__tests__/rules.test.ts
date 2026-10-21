// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeDocument, getCodeActions } from "../src";

// Characterisation net for analyzeDocument and getCodeActions: a corpus
// that triggers every rule, several matches per line, mixed case, CRLF
// and lines that must not match. The diagnostics and the code actions
// offered for each line are in fixtures/rules.golden.json.

const uri = "file:///workspace/corpus.ts";

export const CORPUS = [
  `const h = crypto.createHash("md5"); const g = createHash('SHA1');`,
  `createHash("sha-1"); createHash("MD4"); createHash('ripemd160'); createHash("sha256");`,
  `crypto.createCipheriv("aes-128-ecb", k, iv); x = "des"; y = '3DES';`,
  `z = "des-ede3"; "RC4"; 'blowfish'; "aes-192-ECB"; "aes-256-gcm";`,
  `generateKeyPairSync("rsa", { modulusLength: 1024 }); bits = 512;`,
  `opts = { bits: 2048, modulusLength:512 };`,
  `generateKeyPair( 'ec' ); algorithm: "ed25519"; algorithm = 'ECDH';`,
  `algorithm:"RSA", algorithm: "ecdsa", algorithm: "x25519"`,
  `const secret_key = "00112233445566778899aabbccddeeff";`,
  `apiKey: 'ABCDEF0123456789ABCDEF0123456789AB'; private_key = "short";`,
  `cryptoKey = "0123456789abcdef0123456789abcdef"; PRIVATE_KEY:"ffffffffffffffffffffffffffffffff"`,
  `-----BEGIN RSA PRIVATE KEY-----`,
  `-----BEGIN broken`,
  `   prefix -----BEGIN lowercase-----`,
  ``,
  `nothing to see here`,
].join("\n");

export function runCorpus(): unknown {
  const text = `${CORPUS}\r\ncreateHash("md5")`;
  const diagnostics = analyzeDocument(uri, text);
  const lineCount = text.split(/\r?\n/).length;
  const actions = [];
  for (let line = 0; line <= lineCount; line++) {
    const range = {
      start: { line, character: 0 },
      end: { line, character: 1 },
    };
    actions.push(getCodeActions(uri, text, range, diagnostics));
  }
  return { diagnostics, actions };
}

describe("analyzeDocument and getCodeActions", () => {
  it("diagnose and fix the corpus exactly as recorded", () => {
    const golden = JSON.parse(
      readFileSync(join(__dirname, "fixtures/rules.golden.json"), "utf8"),
    );
    expect(JSON.parse(JSON.stringify(runCorpus()))).to.deep.equal(golden);
  });
});
