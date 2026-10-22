/**
 * Copyright (c) 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

// The post-quantum Web Streams transforms buffered their whole input and
// emitted nothing until it ended, holding about three times the payload in
// memory. They now emit each chunk once the next byte shows it is not the
// last, and decrypt chunk by chunk, with output identical to the one-shot
// functions whatever the input chunking.
import { expect } from "chai";
import { randomBytes } from "crypto";
import { hybridKemKeygen } from "../../src/modern/pq-kem";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import {
  createDecryptStream,
  createEncryptStream,
  createMultiPqDecryptStream,
  createMultiPqEncryptStream,
  createPqDecryptStream,
  createPqEncryptStream,
} from "../../src/streaming/web-streams";
import { streamDecrypt, streamEncrypt } from "../../src/streaming/stream-aead";
import {
  streamPqDecrypt,
  streamPqEncrypt,
} from "../../src/streaming/stream-pq-aead";
import {
  multiPqHeaderLength,
  streamMultiPqDecrypt,
  streamMultiPqEncrypt,
} from "../../src/streaming/stream-multi-pq-aead";

type Stream = {
  writable: {
    getWriter(): {
      write(c: Uint8Array): Promise<void>;
      close(): Promise<void>;
    };
  };
  readable: {
    getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }> };
  };
};

const CHUNK = 1024;
const tick = () => new Promise((r) => setImmediate(r));
const concat = (parts: Uint8Array[]) => new Uint8Array(Buffer.concat(parts));

/** Splits `data` into pieces of 1 to 3000 bytes. */
function pieces(data: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < data.length;) {
    const n = 1 + Math.floor(Math.random() * 3000);
    out.push(data.subarray(i, i + n));
    i += n;
  }
  return out;
}

/**
 * Writes `input` piece by piece, recording how many output bytes had been
 * emitted before the stream was closed, and returns all the output.
 */
async function drive(stream: Stream, input: Uint8Array[]) {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const output: Uint8Array[] = [];
  const reading = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      output.push(value!);
    }
  })();
  for (const piece of input) await writer.write(piece);
  await tick();
  const beforeClose = output.reduce((n, p) => n + p.length, 0);
  await writer.close();
  await reading;
  return { output: concat(output), beforeClose };
}

describe("incremental post-quantum Web Streams", function () {
  this.timeout(60000);
  const recipient = hybridKemKeygen(768);
  const keys = {
    recipientX25519Public: recipient.x25519PublicKey,
    recipientMlKemPublic: recipient.mlKemPublicKey,
  };
  const secrets = {
    recipientX25519Secret: recipient.x25519PrivateKey,
    recipientMlKemSecret: recipient.mlKemSecretKey,
  };

  for (const size of [
    0,
    1,
    CHUNK - 1,
    CHUNK,
    CHUNK + 1,
    3 * CHUNK,
    20 * CHUNK + 7,
  ]) {
    it(`encrypts ${size} bytes as it goes, decryptable in one shot`, async () => {
      const plaintext = new Uint8Array(randomBytes(size));
      const { output, beforeClose } = await drive(
        createPqEncryptStream({
          ...keys,
          chunkSize: CHUNK,
        }) as unknown as Stream,
        pieces(plaintext),
      );
      // Everything but the final chunk is out before the input ends.
      expect(beforeClose).to.be.at.least(output.length - (CHUNK + 17));
      const opened = streamPqDecrypt({
        ...secrets,
        ciphertext: output,
        chunkSize: CHUNK,
      });
      expect(Buffer.from(opened).equals(Buffer.from(plaintext))).to.equal(true);
    });

    it(`decrypts ${size} bytes as they arrive`, async () => {
      const plaintext = new Uint8Array(randomBytes(size));
      const { ciphertext } = streamPqEncrypt({
        ...keys,
        plaintext,
        chunkSize: CHUNK,
      });
      const { output, beforeClose } = await drive(
        createPqDecryptStream({
          ...secrets,
          chunkSize: CHUNK,
        }) as unknown as Stream,
        pieces(ciphertext),
      );
      expect(Buffer.from(output).equals(Buffer.from(plaintext))).to.equal(true);
      expect(beforeClose).to.be.at.least(Math.max(0, size - CHUNK));
    });
  }

  it("multi-recipient: encrypts and decrypts as data flows", async () => {
    const other = hybridKemKeygen(768);
    const recipients = [
      {
        recipientId: "alice",
        recipientX25519Public: recipient.x25519PublicKey,
        recipientMlKemPublic: recipient.mlKemPublicKey,
      },
      {
        recipientId: "bob",
        recipientX25519Public: other.x25519PublicKey,
        recipientMlKemPublic: other.mlKemPublicKey,
      },
    ];
    const plaintext = new Uint8Array(randomBytes(10 * CHUNK + 5));
    const enc = await drive(
      createMultiPqEncryptStream({
        recipients,
        chunkSize: CHUNK,
      }) as unknown as Stream,
      pieces(plaintext),
    );
    expect(enc.beforeClose).to.be.at.least(enc.output.length - (CHUNK + 17));
    const opened = streamMultiPqDecrypt({
      recipientX25519Secret: other.x25519PrivateKey,
      recipientMlKemSecret: other.mlKemSecretKey,
      ciphertext: enc.output,
    });
    expect(opened.recipientId).to.equal("bob");
    expect(
      Buffer.from(opened.plaintext).equals(Buffer.from(plaintext)),
    ).to.equal(true);

    const { ciphertext } = streamMultiPqEncrypt({
      recipients,
      plaintext,
      chunkSize: CHUNK,
    });
    const dec = await drive(
      createMultiPqDecryptStream({
        ...secrets,
        recipientId: "alice",
      }) as unknown as Stream,
      pieces(ciphertext),
    );
    expect(Buffer.from(dec.output).equals(Buffer.from(plaintext))).to.equal(
      true,
    );
    expect(dec.beforeClose).to.be.at.least(plaintext.length - CHUNK);
  });

  it("errors on a truncated stream instead of emitting a short plaintext as whole", async () => {
    const plaintext = new Uint8Array(randomBytes(5 * CHUNK));
    const { ciphertext } = streamPqEncrypt({
      ...keys,
      plaintext,
      chunkSize: CHUNK,
    });
    let error: unknown;
    try {
      await drive(
        createPqDecryptStream({
          ...secrets,
          chunkSize: CHUNK,
        }) as unknown as Stream,
        [ciphertext.subarray(0, ciphertext.length - 10)],
      );
    } catch (e) {
      error = e;
    }
    expect(String(error)).to.match(/truncated|invalid|tag/i);
  });

  it("errors on a stream too short for its header", async () => {
    let error: unknown;
    try {
      await drive(
        createPqDecryptStream({
          ...secrets,
          chunkSize: CHUNK,
        }) as unknown as Stream,
        [new Uint8Array(100)],
      );
    } catch (e) {
      error = e;
    }
    expect(String(error)).to.match(/too short/);
  });

  it("multi-recipient: knows its header length only once the header is in", () => {
    const recipients = [
      {
        recipientId: "alice",
        recipientX25519Public: recipient.x25519PublicKey,
        recipientMlKemPublic: recipient.mlKemPublicKey,
      },
    ];
    const { ciphertext } = streamMultiPqEncrypt({
      recipients,
      plaintext: new Uint8Array(10),
      chunkSize: CHUNK,
    });
    const full = multiPqHeaderLength(ciphertext)!;
    expect(full).to.be.greaterThan(35);
    // Before the prefix, at the start of a slot, and inside a slot.
    for (const cut of [10, 35, 36, full - 1]) {
      expect(
        multiPqHeaderLength(ciphertext.subarray(0, cut)),
        `${cut}`,
      ).to.equal(undefined);
    }
    expect(multiPqHeaderLength(ciphertext.subarray(0, full))).to.equal(full);
  });

  it("refuses data after the final chunk without holding it all", () => {
    const { ciphertext } = streamPqEncrypt({
      ...keys,
      plaintext: new Uint8Array(100),
      chunkSize: CHUNK,
    });
    const padded = Buffer.concat([ciphertext, new Uint8Array(CHUNK + 20)]);
    expect(() =>
      streamPqDecrypt({ ...secrets, ciphertext: padded, chunkSize: CHUNK }),
    ).to.throw("Final chunk is longer than the chunk size");
  });
});

// createEncryptStream wrote one XChaCha20-Poly1305 message, so it held the
// whole payload and emitted nothing until the input ended. It now writes
// streamEncrypt's chunked format as the input flows, and
// createDecryptStream reads it chunk by chunk; the old single-message
// output still decrypts with `format: "single-message"`.
describe("incremental symmetric Web Streams", function () {
  this.timeout(60000);
  const key = new Uint8Array(randomBytes(32));

  for (const size of [0, 1, CHUNK - 1, CHUNK, CHUNK + 1, 20 * CHUNK + 7]) {
    it(`encrypts ${size} bytes as it goes, in streamEncrypt's format`, async () => {
      const plaintext = new Uint8Array(randomBytes(size));
      const { output, beforeClose } = await drive(
        createEncryptStream({ key, chunkSize: CHUNK }) as unknown as Stream,
        pieces(plaintext),
      );
      expect(beforeClose).to.be.at.least(output.length - (CHUNK + 17));
      const opened = streamDecrypt({
        key,
        ciphertext: output,
        chunkSize: CHUNK,
      });
      expect(Buffer.from(opened).equals(Buffer.from(plaintext))).to.equal(true);
    });

    it(`decrypts ${size} bytes of streamEncrypt output as they arrive`, async () => {
      const plaintext = new Uint8Array(randomBytes(size));
      const { ciphertext } = streamEncrypt({
        key,
        plaintext,
        chunkSize: CHUNK,
      });
      const { output, beforeClose } = await drive(
        createDecryptStream({ key, chunkSize: CHUNK }) as unknown as Stream,
        pieces(ciphertext),
      );
      expect(Buffer.from(output).equals(Buffer.from(plaintext))).to.equal(true);
      expect(beforeClose).to.be.at.least(Math.max(0, size - CHUNK));
    });
  }

  it("uses streamEncrypt's default chunk size", async () => {
    const plaintext = new Uint8Array(randomBytes(3 * 65536 + 9));
    const { output } = await drive(
      createEncryptStream({ key }) as unknown as Stream,
      pieces(plaintext),
    );
    expect(
      Buffer.from(streamDecrypt({ key, ciphertext: output })).equals(
        Buffer.from(plaintext),
      ),
    ).to.equal(true);
  });

  it("still decrypts the single-message format with format: single-message", async () => {
    const plaintext = new Uint8Array(randomBytes(5000));
    const nonce = new Uint8Array(randomBytes(24));
    const legacy = concat([
      nonce,
      xchacha20poly1305(key, nonce).encrypt(plaintext),
    ]);
    const { output } = await drive(
      createDecryptStream({
        key,
        format: "single-message",
      }) as unknown as Stream,
      pieces(legacy),
    );
    expect(Buffer.from(output).equals(Buffer.from(plaintext))).to.equal(true);
  });

  it("errors on a truncated stream", async () => {
    const { ciphertext } = streamEncrypt({
      key,
      plaintext: new Uint8Array(randomBytes(5 * CHUNK)),
      chunkSize: CHUNK,
    });
    let error: unknown;
    try {
      await drive(
        createDecryptStream({ key, chunkSize: CHUNK }) as unknown as Stream,
        [ciphertext.subarray(0, 24 + 3 * (CHUNK + 17))],
      );
    } catch (e) {
      error = e;
    }
    expect((error as Error).message).to.match(/final chunk missing/);
  });
});
