/**
 * Example: Fastify plugin setup with encrypted request/response pipeline.
 *
 * Run:
 *   CRYPTO_KEY=<64-char-hex> npx ts-node examples/fastify.ts
 *
 * Then:
 *   curl -X POST http://localhost:3000/api/data \
 *     -H "Content-Type: application/json" \
 *     -d '{"encrypted":"<base64-sealed-box>"}'
 */

import Fastify from "fastify";
import { cryptoPlugin } from "../src";

const CRYPTO_KEY =
  process.env.CRYPTO_KEY ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function main() {
  const app = Fastify({ logger: true });

  // Register the crypto plugin for all /api/** routes
  await app.register(cryptoPlugin, {
    key: CRYPTO_KEY,
    routes: ["/api/**"],
    operations: ["decrypt-request", "encrypt-response"],
  });

  // This handler receives decrypted body and returns encrypted response
  app.post("/api/data", async (request) => {
    return {
      status: "ok",
      received: request.body,
      timestamp: new Date().toISOString(),
    };
  });

  // Routes outside /api/** are unaffected
  app.get("/health", async () => {
    return { status: "healthy" };
  });

  const PORT = Number(process.env.PORT) || 3000;
  await app.listen({ port: PORT });
  console.log(`Fastify server with crypto plugin on http://localhost:${PORT}`);
}

main().catch(console.error);
