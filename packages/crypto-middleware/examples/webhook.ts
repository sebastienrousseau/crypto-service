/**
 * Example: Webhook signature verification middleware.
 *
 * Verifies incoming webhook payloads using HMAC-SHA256 signatures,
 * similar to GitHub's webhook verification (x-hub-signature-256).
 *
 * Run:
 *   HMAC_KEY=<hex-key> npx ts-node examples/webhook.ts
 *
 * Then:
 *   # Compute signature: echo -n '{"event":"push"}' | openssl dgst -sha256 -hmac <key>
 *   curl -X POST http://localhost:3000/webhooks/github \
 *     -H "Content-Type: application/json" \
 *     -H "x-hub-signature-256: sha256=<hex-signature>" \
 *     -d '{"event":"push"}'
 */

import express from "express";
import { createCryptoMiddleware } from "../src";

const HMAC_KEY =
  process.env.HMAC_KEY ??
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

const app = express();
app.use(express.json());

// Verify signatures on all webhook routes
app.use(
  "/webhooks",
  createCryptoMiddleware({
    hmacKey: HMAC_KEY,
    routes: ["/webhooks/**"],
    operations: ["verify-signature"],
  }),
);

app.post("/webhooks/github", (req, res) => {
  console.log("Verified webhook payload:", req.body);
  res.json({ status: "accepted" });
});

app.post("/webhooks/stripe", (req, res) => {
  console.log("Verified Stripe event:", req.body);
  res.json({ status: "accepted" });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server on http://localhost:${PORT}`);
  console.log("POST /webhooks/github with x-hub-signature-256 header");
});
