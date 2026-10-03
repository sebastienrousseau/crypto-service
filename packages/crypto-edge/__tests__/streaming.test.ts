// SPDX-License-Identifier: MIT OR Apache-2.0

import { expect } from "chai";
import {
  generateX25519KeyPair,
  mlKemKeygen,
} from "@sebastienrousseau/crypto-lib";
import {
  createEdgePqEncryptStream,
  createEdgePqDecryptStream,
  encryptEdgeResponse,
  decryptEdgeRequest,
  createDecryptedEdgeRequest,
  type EdgePqRecipientPublicKeys,
  type EdgePqRecipientSecretKeys,
} from "../src";

describe("crypto-edge post-quantum streaming", () => {
  let recipientPublic: EdgePqRecipientPublicKeys;
  let recipientSecret: EdgePqRecipientSecretKeys;

  beforeEach(() => {
    const x25519 = generateX25519KeyPair();
    const mlkem = mlKemKeygen(768);
    recipientPublic = {
      recipientX25519Public: x25519.publicKey,
      recipientMlKemPublic: mlkem.publicKey,
    };
    recipientSecret = {
      recipientX25519Secret: x25519.privateKey,
      recipientMlKemSecret: mlkem.secretKey,
    };
  });

  async function readStream(
    stream: ReadableStream<Uint8Array>,
  ): Promise<Uint8Array> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLen = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLen += value.length;
      }
    }
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }
    return combined;
  }

  describe("createEdgePqEncryptStream & createEdgePqDecryptStream", () => {
    it("round-trips data through encrypt and decrypt transform streams", async () => {
      const encStream = createEdgePqEncryptStream(recipientPublic);
      const decStream = createEdgePqDecryptStream(recipientSecret);

      const sourceData = new TextEncoder().encode(
        "Edge PQ streaming test message",
      );
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(sourceData);
          controller.close();
        },
      });

      const encryptedStream = sourceStream.pipeThrough(encStream);
      const decryptedStream = encryptedStream.pipeThrough(decStream);
      const result = await readStream(decryptedStream);

      expect(new TextDecoder().decode(result)).to.equal(
        "Edge PQ streaming test message",
      );
    });

    it("supports custom chunk size", async () => {
      const publicKeys = { ...recipientPublic, chunkSize: 1024 };
      const secretKeys = { ...recipientSecret, chunkSize: 1024 };
      const encStream = createEdgePqEncryptStream(publicKeys);
      const decStream = createEdgePqDecryptStream(secretKeys);

      const sourceData = new Uint8Array(2500).fill(42);
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(sourceData);
          controller.close();
        },
      });

      const decryptedStream = sourceStream
        .pipeThrough(encStream)
        .pipeThrough(decStream);
      const result = await readStream(decryptedStream);

      expect(result).to.deep.equal(sourceData);
    });
  });

  describe("encryptEdgeResponse", () => {
    it("encrypts response with stream body and sets octet-stream header", async () => {
      const bodyText = "Hello Edge Response";
      const originalResponse = new Response(bodyText, {
        status: 200,
        statusText: "OK",
        headers: { "x-custom-header": "test-value" },
      });

      const encryptedResponse = encryptEdgeResponse(
        originalResponse,
        recipientPublic,
      );

      expect(encryptedResponse.status).to.equal(200);
      expect(encryptedResponse.statusText).to.equal("OK");
      expect(encryptedResponse.headers.get("content-type")).to.equal(
        "application/octet-stream",
      );
      expect(encryptedResponse.headers.get("x-custom-header")).to.equal(
        "test-value",
      );
      expect(encryptedResponse.body).to.exist;

      const decStream = createEdgePqDecryptStream(recipientSecret);
      const decrypted = await readStream(
        encryptedResponse.body!.pipeThrough(decStream),
      );
      expect(new TextDecoder().decode(decrypted)).to.equal(bodyText);
    });

    it("handles response with null body and preserves init overrides", async () => {
      const nullResponse = new Response(null, {
        status: 204,
        statusText: "No Content",
      });
      const encryptedResponse = encryptEdgeResponse(
        nullResponse,
        recipientPublic,
        {
          status: 200,
          headers: { "x-override": "yes" },
        },
      );

      expect(encryptedResponse.status).to.equal(200);
      expect(encryptedResponse.headers.get("x-override")).to.equal("yes");
      expect(encryptedResponse.headers.get("content-type")).to.equal(
        "application/octet-stream",
      );

      const ciphertext = new Uint8Array(await encryptedResponse.arrayBuffer());
      const decStream = createEdgePqDecryptStream(recipientSecret);
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(ciphertext);
          controller.close();
        },
      });
      const decrypted = await readStream(sourceStream.pipeThrough(decStream));
      expect(decrypted.length).to.equal(0);
    });
  });

  describe("decryptEdgeRequest", () => {
    it("decrypts arrayBuffer payload of an incoming request", async () => {
      const originalText = "Encrypted request payload";
      const encStream = createEdgePqEncryptStream(recipientPublic);
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(originalText));
          controller.close();
        },
      });
      const ciphertext = await readStream(sourceStream.pipeThrough(encStream));

      const request = new Request("https://example.com/api", {
        method: "POST",
        body: ciphertext,
        headers: { "content-type": "application/octet-stream" },
      });

      const decrypted = await decryptEdgeRequest(request, recipientSecret);
      expect(new TextDecoder().decode(decrypted)).to.equal(originalText);
    });

    it("throws on corrupted ciphertext", async () => {
      const corrupted = new Uint8Array(100).fill(255);
      const request = new Request("https://example.com/api", {
        method: "POST",
        body: corrupted,
      });

      let err: Error | null = null;
      try {
        await decryptEdgeRequest(request, recipientSecret);
      } catch (e) {
        err = e as Error;
      }
      expect(err).to.exist;
    });
  });

  describe("createDecryptedEdgeRequest", () => {
    it("pipes request body through decrypt stream", async () => {
      const message = "Decrypted request stream message";
      const encStream = createEdgePqEncryptStream(recipientPublic);
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(message));
          controller.close();
        },
      });
      const ciphertext = await readStream(sourceStream.pipeThrough(encStream));

      const request = new Request("https://example.com/api", {
        method: "POST",
        body: ciphertext,
        duplex: "half",
      } as RequestInit);

      const decryptedReq = createDecryptedEdgeRequest(request, recipientSecret);
      expect(decryptedReq.body).to.exist;

      const plaintextBytes = await readStream(decryptedReq.body!);
      expect(new TextDecoder().decode(plaintextBytes)).to.equal(message);
    });

    it("returns cloned request when body is null", () => {
      const request = new Request("https://example.com/api", {
        method: "GET",
      });

      const decryptedReq = createDecryptedEdgeRequest(request, recipientSecret);
      expect(decryptedReq.body).to.be.null;
      expect(decryptedReq.method).to.equal("GET");
      expect(decryptedReq.url).to.equal("https://example.com/api");
    });
  });
});
