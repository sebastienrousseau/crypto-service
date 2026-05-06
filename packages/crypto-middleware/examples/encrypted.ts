/**
 * Example: Full encrypted request/response pipeline.
 *
 * Demonstrates the complete flow:
 *   1. Client encrypts a JSON payload using secretbox.
 *   2. Middleware decrypts the incoming request body.
 *   3. Handler processes the plaintext.
 *   4. Middleware encrypts the outgoing response.
 *   5. Client decrypts the response.
 *
 * Run:
 *   npx ts-node examples/encrypted.ts
 */

import express from "express";
import { createCryptoMiddleware, encryptPayload, decryptPayload } from "../src";

// 256-bit key (64 hex chars)
const KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// --- Server setup ---

const app = express();
app.use(express.json());

app.use(
  createCryptoMiddleware({
    key: KEY,
    operations: ["decrypt-request", "encrypt-response"],
  }),
);

app.post("/echo", (req, res) => {
  // At this point, req.body is the decrypted plaintext object
  console.log("[Server] Received plaintext:", req.body);
  res.json({
    echo: req.body,
    processedAt: new Date().toISOString(),
  });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}\n`);

  // --- Client simulation ---
  const payload = { message: "Hello, encrypted world!", count: 42 };
  console.log("[Client] Original payload:", payload);

  // Encrypt the payload
  const sealed = encryptPayload(KEY, payload);
  console.log("[Client] Encrypted (truncated):", sealed.slice(0, 60) + "...");

  // Send encrypted request
  const response = await fetch(`http://localhost:${PORT}/echo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted: sealed }),
  });

  const encryptedResponse = (await response.json()) as { encrypted: string };
  console.log(
    "[Client] Encrypted response (truncated):",
    encryptedResponse.encrypted.slice(0, 60) + "...",
  );

  // Decrypt the response
  const decrypted = decryptPayload(KEY, encryptedResponse.encrypted);
  console.log("[Client] Decrypted response:", decrypted);

  process.exit(0);
});
