/**
 * Example: JWT verification middleware.
 *
 * Verifies HS256 JWT tokens from the Authorization header and makes
 * the decoded payload available as `req.jwtPayload`.
 *
 * Run:
 *   JWT_SECRET=my-secret npx ts-node examples/jwt.ts
 *
 * Then:
 *   # Generate a token: node -e "
 *   #   const crypto = require('crypto');
 *   #   const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 *   #   const p = Buffer.from(JSON.stringify({sub:'user-1',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 *   #   const s = crypto.createHmac('sha256','my-secret').update(h+'.'+p).digest('base64url');
 *   #   console.log(h+'.'+p+'.'+s);
 *   # "
 *   curl http://localhost:3000/api/profile \
 *     -H "Authorization: Bearer <token>"
 */

import express from "express";
import { createCryptoMiddleware } from "../src";

const JWT_SECRET = process.env.JWT_SECRET ?? "my-secret";

const app = express();
app.use(express.json());

// Verify JWT on all /api/** routes
app.use(
  createCryptoMiddleware({
    jwtSecret: JWT_SECRET,
    routes: ["/api/**"],
    operations: ["verify-jwt"],
  }),
);

app.get("/api/profile", (req, res) => {
  const payload = (req as Record<string, unknown>).jwtPayload;
  res.json({
    message: "Authenticated!",
    user: payload,
  });
});

// Public routes (no JWT required)
app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`JWT-protected server on http://localhost:${PORT}`);
  console.log("GET /api/profile with Authorization: Bearer <token>");
});
