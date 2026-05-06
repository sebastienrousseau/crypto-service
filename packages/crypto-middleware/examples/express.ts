/**
 * Example: Express middleware setup with encrypted request/response pipeline.
 *
 * Run:
 *   CRYPTO_KEY=<64-char-hex> npx ts-node examples/express.ts
 *
 * Then:
 *   curl -X POST http://localhost:3000/api/data \
 *     -H "Content-Type: application/json" \
 *     -d '{"encrypted":"<base64-sealed-box>"}'
 */

import express from "express";
import { createCryptoMiddleware } from "../src";

const CRYPTO_KEY =
  process.env.CRYPTO_KEY ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const app = express();
app.use(express.json());

// Apply crypto middleware to all /api/** routes
app.use(
  createCryptoMiddleware({
    key: CRYPTO_KEY,
    routes: ["/api/**"],
    operations: ["decrypt-request", "encrypt-response"],
  }),
);

// This handler receives decrypted body and returns encrypted response
app.post("/api/data", (req, res) => {
  console.log("Decrypted body:", req.body);
  res.json({
    status: "ok",
    received: req.body,
    timestamp: new Date().toISOString(),
  });
});

// Routes outside /api/** are unaffected
app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Express server with crypto middleware on http://localhost:${PORT}`);
});
