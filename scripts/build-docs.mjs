// SPDX-License-Identifier: Apache-2.0 OR MIT
/**
 * @fileoverview Monorepo Documentation Hub Builder for docs.crypto-service.co
 * Assembles a unified documentation portal aggregating all 14 packages
 * with their interactive TypeDoc API references, guides, and architecture.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT_DIR, "_site");
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");

console.log("==> Building TypeDoc documentation for all workspace packages...");
execSync("pnpm -r run docs", { cwd: ROOT_DIR, stdio: "inherit" });

console.log("==> Assembling unified documentation portal at _site...");
if (fs.existsSync(SITE_DIR)) {
  fs.rmSync(SITE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SITE_DIR, { recursive: true });

// Ensure CNAME and .nojekyll for GitHub Pages
fs.writeFileSync(path.join(SITE_DIR, "CNAME"), "docs.crypto-service.co\n");
fs.writeFileSync(path.join(SITE_DIR, ".nojekyll"), "");

// Copy package documentation into _site/packages/<pkg-name>
const packages = fs.readdirSync(PACKAGES_DIR).filter((f) => {
  return fs.statSync(path.join(PACKAGES_DIR, f)).isDirectory();
});

const packageMeta = [];

for (const pkg of packages) {
  const pkgDir = path.join(PACKAGES_DIR, pkg);
  const pkgDocsDir = path.join(pkgDir, "docs");
  const pkgJsonPath = path.join(pkgDir, "package.json");
  const destDir = path.join(SITE_DIR, "packages", pkg);

  let description = "Package documentation and API reference.";
  let version = "0.0.3";
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      description = data.description || description;
      version = data.version || version;
    } catch {
      // ignore
    }
  }

  packageMeta.push({ name: pkg, version, description });

  if (fs.existsSync(pkgDocsDir)) {
    fs.cpSync(pkgDocsDir, destDir, { recursive: true });
    console.log(`Copied docs for ${pkg} -> /packages/${pkg}/`);
  }
}

// Backwards compatibility: copy crypto-lib docs to root so direct links like /functions/... still resolve
const cryptoLibDocs = path.join(PACKAGES_DIR, "crypto-lib", "docs");
if (fs.existsSync(cryptoLibDocs)) {
  for (const item of fs.readdirSync(cryptoLibDocs)) {
    if (item === "index.html") {
      fs.copyFileSync(path.join(cryptoLibDocs, item), path.join(SITE_DIR, "crypto-lib.html"));
    } else {
      fs.cpSync(path.join(cryptoLibDocs, item), path.join(SITE_DIR, item), { recursive: true });
    }
  }
}

// Generate the unified index.html portal
const portalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crypto Service Suite Documentation — Quantum-Safe Cryptography for TypeScript</title>
  <meta name="description" content="Official documentation for Crypto Service Suite: 50+ classical, modern, and post-quantum cryptographic primitives (FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA, FIPS 206 FN-DSA, HPKE), REST microservice, CLI, and full-stack integrations." />
  <link rel="canonical" href="https://docs.crypto-service.co/" />
  <link rel="icon" type="image/svg+xml" href="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-service-logo.svg" />
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --card-hover: #1c2128;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-glow: rgba(88, 166, 255, 0.15);
      --badge-bg: #21262d;
      --success: #3fb950;
      --code-bg: #090d13;
      --font-mono: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    header {
      border-bottom: 1px solid var(--border);
      background: rgba(13, 17, 23, 0.9);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: inherit;
    }
    .logo-group img {
      height: 36px;
      width: auto;
    }
    .brand-title {
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }
    .version-pill {
      font-size: 0.75rem;
      background: var(--badge-bg);
      border: 1px solid var(--border);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      color: var(--accent);
      font-family: var(--font-mono);
    }
    .nav-links {
      display: flex;
      gap: 1.25rem;
      align-items: center;
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: color 0.15s;
    }
    .nav-links a:hover { color: var(--text); }
    .btn-github {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text) !important;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-github:hover {
      background: var(--card-hover);
      border-color: var(--text-muted);
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
    }
    .hero {
      text-align: center;
      padding: 2.5rem 0 3.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 3rem;
    }
    .hero h1 {
      font-size: 2.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #ffffff 40%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: 1.2rem;
      color: var(--text-muted);
      max-width: 780px;
      margin: 0 auto 1.75rem;
    }
    .badges {
      display: flex;
      justify-content: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.25rem 0.65rem;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      color: var(--text);
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      margin-right: 0.4rem;
      display: inline-block;
    }
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .section-desc {
      color: var(--text-muted);
      margin-bottom: 1.75rem;
      font-size: 0.95rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
      margin-bottom: 3.5rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
      box-shadow: 0 8px 24px var(--accent-glow);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
      font-family: var(--font-mono);
      text-decoration: none;
    }
    .card-title:hover { color: var(--accent); }
    .card-version {
      font-size: 0.75rem;
      background: var(--badge-bg);
      border: 1px solid var(--border);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .card-body {
      color: var(--text-muted);
      font-size: 0.88rem;
      margin-bottom: 1.25rem;
      flex-grow: 1;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(48, 54, 61, 0.5);
    }
    .card-btn {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .card-btn:hover { text-decoration: underline; }
    .card-tag {
      font-size: 0.72rem;
      color: var(--text-muted);
      background: var(--badge-bg);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      border: 1px solid var(--border);
    }
    .specs-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3.5rem;
      font-size: 0.9rem;
    }
    .specs-table th, .specs-table td {
      border: 1px solid var(--border);
      padding: 0.75rem 1rem;
      text-align: left;
    }
    .specs-table th {
      background: var(--card-bg);
      color: var(--text);
      font-weight: 600;
    }
    .specs-table td { background: rgba(22, 27, 34, 0.4); }
    .specs-table code {
      font-family: var(--font-mono);
      background: var(--badge-bg);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.82rem;
      color: var(--accent);
    }
    .code-box {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      overflow-x: auto;
      margin-bottom: 3.5rem;
      color: #c9d1d9;
    }
    .code-box .kw { color: #ff7b72; }
    .code-box .str { color: #a5d6ff; }
    .code-box .fn { color: #d2a8ff; }
    .code-box .comment { color: #8b949e; font-style: italic; }
    footer {
      border-top: 1px solid var(--border);
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    footer a {
      color: var(--accent);
      text-decoration: none;
    }
    footer a:hover { text-decoration: underline; }
    @media (max-width: 768px) {
      .hero h1 { font-size: 2rem; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="nav-container">
      <a href="https://docs.crypto-service.co/" class="logo-group">
        <img src="https://raw.githubusercontent.com/sebastienrousseau/crypto-service/main/assets/crypto-service-logo.svg" alt="Crypto Service Suite logo" />
        <span class="brand-title">Crypto Service Suite</span>
        <span class="version-pill">v0.0.3</span>
      </a>
      <nav class="nav-links">
        <a href="#packages">14 Packages</a>
        <a href="#standards">Standards</a>
        <a href="#quickstart">Quick Start</a>
        <a href="https://github.com/sebastienrousseau/crypto-service/releases/tag/v0.0.3">Changelog</a>
        <a href="https://github.com/sebastienrousseau/crypto-service" class="btn-github">
          <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
          GitHub
        </a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <h1>Quantum-Safe Cryptography for TypeScript</h1>
      <p>A unified, modular monorepo suite providing 50+ classical, modern, and post-quantum cryptographic primitives, high-performance WebAssembly acceleration, REST microservice, and full-stack integrations.</p>
      <div class="badges">
        <span class="badge"><span class="badge-dot"></span> 100% Test Coverage Floor</span>
        <span class="badge">FIPS 203 / 204 / 205 / 206</span>
        <span class="badge">RFC 10024 Hybrid KEMs</span>
        <span class="badge">Zero Unsafe Dependencies</span>
        <span class="badge">Node.js &gt;= 22 LTS</span>
        <span class="badge">Apache-2.0 OR MIT</span>
      </div>
    </section>

    <section id="packages">
      <h2 class="section-title">Workspace Packages (14 Modules)</h2>
      <p class="section-desc">Each package maintains zero cyclic dependencies, 100% branch and statement coverage, and full TypeDoc documentation.</p>
      
      <div class="grid">
        <!-- 1. crypto-lib -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-lib/index.html" class="card-title">@sebastienrousseau/crypto-lib</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Core modern cryptographic engine: ML-KEM, ML-DSA, SLH-DSA, FN-DSA, RFC 10024 hybrid KEMs, AES-GCM-SIV, HPKE, PASETO v4, Double Ratchet, PAKE, and memory zeroing.</p>
          <div class="card-footer">
            <span class="card-tag">Core Engine</span>
            <a href="packages/crypto-lib/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 2. crypto-api -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-api/index.html" class="card-title">@sebastienrousseau/crypto-api</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">High-level formatting, validation, and documentation generation utilities providing standardized schemas and JSON-RPC / REST models.</p>
          <div class="card-footer">
            <span class="card-tag">Web &amp; Validation</span>
            <a href="packages/crypto-api/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 3. crypto-cli -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-cli/index.html" class="card-title">@sebastienrousseau/crypto-cli</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Production-ready command-line interface: key generation, hashing, encryption, signing, password verification, and shell automation.</p>
          <div class="card-footer">
            <span class="card-tag">CLI Tooling</span>
            <a href="packages/crypto-cli/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 4. crypto-server -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-server/index.html" class="card-title">@sebastienrousseau/crypto-server</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Fastify-based REST microservice exposing 34+ cryptographic endpoints, OpenAPI / Swagger schemas, rate limiting, and RBAC.</p>
          <div class="card-footer">
            <span class="card-tag">Microservice</span>
            <a href="packages/crypto-server/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 5. crypto-sdk -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-sdk/index.html" class="card-title">@sebastienrousseau/crypto-sdk</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Universal client SDK for browsers and Node.js with built-in retry policies, error handling, and type-safe server bindings.</p>
          <div class="card-footer">
            <span class="card-tag">Client SDK</span>
            <a href="packages/crypto-sdk/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 6. crypto-edge -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-edge/index.html" class="card-title">@sebastienrousseau/crypto-edge</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Zero-dependency Edge runtime adapters optimized for Cloudflare Workers, Vercel Edge, Deno, and WinterCG runtimes.</p>
          <div class="card-footer">
            <span class="card-tag">Serverless &amp; Edge</span>
            <a href="packages/crypto-edge/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 7. crypto-kms -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-kms/index.html" class="card-title">@sebastienrousseau/crypto-kms</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Unified Key Management Service provider integrating AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault.</p>
          <div class="card-footer">
            <span class="card-tag">Cloud KMS</span>
            <a href="packages/crypto-kms/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 8. crypto-wasm -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-wasm/index.html" class="card-title">@sebastienrousseau/crypto-wasm</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">High-performance WebAssembly acceleration modules compiled from Rust for compute-intensive post-quantum operations.</p>
          <div class="card-footer">
            <span class="card-tag">WebAssembly</span>
            <a href="packages/crypto-wasm/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 9. crypto-prisma -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-prisma/index.html" class="card-title">@sebastienrousseau/crypto-prisma</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Transparent field-level encryption middleware for Prisma Client supporting blind indexing and envelope encryption.</p>
          <div class="card-footer">
            <span class="card-tag">Prisma ORM</span>
            <a href="packages/crypto-prisma/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 10. crypto-typeorm -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-typeorm/index.html" class="card-title">@sebastienrousseau/crypto-typeorm</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">TypeORM column transformers and entity subscriber decorators for automated database encryption at rest.</p>
          <div class="card-footer">
            <span class="card-tag">TypeORM</span>
            <a href="packages/crypto-typeorm/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 11. crypto-middleware -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-middleware/index.html" class="card-title">@sebastienrousseau/crypto-middleware</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Framework-agnostic HTTP middleware providing request payload decryption, response encryption, and signature validation.</p>
          <div class="card-footer">
            <span class="card-tag">HTTP Middleware</span>
            <a href="packages/crypto-middleware/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 12. crypto-react -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-react/index.html" class="card-title">@sebastienrousseau/crypto-react</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">React hooks library providing <code>useEncrypt</code>, <code>useHash</code>, <code>useKeypair</code>, and <code>useSignature</code> for frontend applications.</p>
          <div class="card-footer">
            <span class="card-tag">React Hooks</span>
            <a href="packages/crypto-react/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 13. crypto-vue -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-vue/index.html" class="card-title">@sebastienrousseau/crypto-vue</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Vue 3 composables library offering reactive cryptographic state and asynchronous execution bridges.</p>
          <div class="card-footer">
            <span class="card-tag">Vue Composables</span>
            <a href="packages/crypto-vue/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>

        <!-- 14. crypto-testing -->
        <div class="card">
          <div class="card-header">
            <a href="packages/crypto-testing/index.html" class="card-title">@sebastienrousseau/crypto-testing</a>
            <span class="card-version">v0.0.3</span>
          </div>
          <p class="card-body">Comprehensive test harness, synthetic cryptographic vectors, mock KMS providers, and compliance validation suites.</p>
          <div class="card-footer">
            <span class="card-tag">Testing &amp; Fixtures</span>
            <a href="packages/crypto-testing/index.html" class="card-btn">API Reference &rarr;</a>
          </div>
        </div>
      </div>
    </section>

    <section id="standards">
      <h2 class="section-title">Cryptographic Standard Specifications</h2>
      <p class="section-desc">Adherence to NIST FIPS, IETF RFC, and standard specifications implemented across the monorepo suite.</p>

      <table class="specs-table">
        <thead>
          <tr>
            <th>Specification</th>
            <th>Algorithm Name / Category</th>
            <th>Parameter Sets / Ciphers</th>
            <th>Primary Module</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>FIPS 203</strong></td>
            <td>ML-KEM (Module-Lattice KEM)</td>
            <td><code>ML-KEM-512</code>, <code>ML-KEM-768</code>, <code>ML-KEM-1024</code></td>
            <td><code>crypto-lib/modern/pq-kem</code></td>
          </tr>
          <tr>
            <td><strong>FIPS 204</strong></td>
            <td>ML-DSA (Module-Lattice Signatures)</td>
            <td><code>ML-DSA-44</code>, <code>ML-DSA-65</code>, <code>ML-DSA-87</code></td>
            <td><code>crypto-lib/modern/pq-sign</code></td>
          </tr>
          <tr>
            <td><strong>FIPS 205</strong></td>
            <td>SLH-DSA (Stateless Hash Signatures)</td>
            <td><code>SLH-DSA-SHA2-128s</code>, <code>SLH-DSA-SHAKE-256f</code></td>
            <td><code>crypto-lib/modern/pq-hash-sign</code></td>
          </tr>
          <tr>
            <td><strong>FIPS 206</strong></td>
            <td>FN-DSA (FALCON Signatures)</td>
            <td><code>FALCON-512</code>, <code>FALCON-1024</code></td>
            <td><code>crypto-lib/modern/fn-dsa</code></td>
          </tr>
          <tr>
            <td><strong>RFC 10024</strong></td>
            <td>Hybrid Post-Quantum KEMs</td>
            <td><code>X25519MLKEM768</code> (0x11ec), <code>SecP256r1MLKEM768</code> (0x11ed)</td>
            <td><code>crypto-lib/modern/pq-kem</code></td>
          </tr>
          <tr>
            <td><strong>RFC 9180</strong></td>
            <td>HPKE (Hybrid Public Key Encryption)</td>
            <td><code>DHKEM(X25519) + HKDF-SHA256 + ChaCha20Poly1305</code></td>
            <td><code>crypto-lib/modern/hpke</code></td>
          </tr>
          <tr>
            <td><strong>RFC 8439</strong></td>
            <td>ChaCha20-Poly1305 &amp; XChaCha20</td>
            <td>Authenticated Encryption with Associated Data (AEAD)</td>
            <td><code>crypto-lib/modern/aead</code></td>
          </tr>
          <tr>
            <td><strong>NIST SP 800-38D</strong></td>
            <td>AES-GCM &amp; AES-GCM-SIV</td>
            <td>Misuse-resistant authenticated encryption</td>
            <td><code>crypto-lib/modern/aes</code></td>
          </tr>
          <tr>
            <td><strong>PASETO v4</strong></td>
            <td>Platform-Agnostic Security Tokens</td>
            <td><code>v4.local</code> (XChaCha20-Poly1305), <code>v4.public</code> (Ed25519)</td>
            <td><code>crypto-lib/tokens/paseto</code></td>
          </tr>
          <tr>
            <td><strong>Threshold Cryptography</strong></td>
            <td>Shamir Secret Sharing + Feldman VSS</td>
            <td>(k, n) threshold key generation and distributed Ed25519 signing</td>
            <td><code>crypto-lib/protocols/threshold</code></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="quickstart">
      <h2 class="section-title">Quick Start Code Examples</h2>
      <p class="section-desc">Minimal runnable samples demonstrating classical and post-quantum cryptographic operations.</p>

      <div class="code-box">
<span class="comment">// 1. Import ML-KEM and RFC 10024 hybrid KEM from crypto-lib</span>
<span class="kw">import</span> {
  mlKemKeygen,
  mlKemEncapsulate,
  mlKemDecapsulate,
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
  RFC10024_X25519_MLKEM768,
  wipeMemory
} <span class="kw">from</span> <span class="str">"@sebastienrousseau/crypto-lib"</span>;

<span class="comment">// 2. Post-Quantum Key Exchange: FIPS 203 ML-KEM-768</span>
<span class="kw">const</span> alice = <span class="fn">mlKemKeygen</span>(768);
<span class="kw">const</span> { ciphertext, sharedSecret: bobSecret } = <span class="fn">mlKemEncapsulate</span>(768, alice.publicKey);
<span class="kw">const</span> { sharedSecret: aliceSecret } = <span class="fn">mlKemDecapsulate</span>(768, alice.secretKey, ciphertext);
console.<span class="fn">log</span>(<span class="str">"Shared secrets match:"</span>, aliceSecret === bobSecret);

<span class="comment">// 3. RFC 10024 Classical + PQ Hybrid Key Exchange (X25519 + ML-KEM-768)</span>
<span class="kw">const</span> recipient = <span class="fn">hybridKemKeygen</span>(768);
<span class="kw">const</span> senderResult = <span class="fn">hybridKemEncapsulate</span>(768, recipient.x25519PublicKey, recipient.mlKemPublicKey);
<span class="kw">const</span> recipientResult = <span class="fn">hybridKemDecapsulate</span>(
  768,
  recipient.x25519PrivateKey,
  recipient.mlKemSecretKey,
  senderResult.x25519EphemeralPublic,
  senderResult.mlKemCiphertext
);
console.<span class="fn">log</span>(<span class="str">"Hybrid secret derived:"</span>, recipientResult.sharedSecret === senderResult.sharedSecret);

<span class="comment">// 4. Memory Zeroing to sanitize sensitive key buffers</span>
<span class="kw">const</span> keyBuf = <span class="kw">new</span> <span class="fn">Uint8Array</span>([0xde, 0xad, 0xbe, 0xef]);
<span class="fn">wipeMemory</span>(keyBuf);
console.<span class="fn">log</span>(<span class="str">"Buffer wiped:"</span>, keyBuf.every(b =&gt; b === 0)); <span class="comment">// true</span>
      </div>
    </section>
  </main>

  <footer>
    <p>Crypto Service Suite &copy; 2022&ndash;2026 Sebastien Rousseau. Licensed under <a href="https://github.com/sebastienrousseau/crypto-service/blob/main/LICENSE">Apache-2.0 OR MIT</a>.</p>
    <p style="margin-top: 0.5rem;">Documentation hub for <a href="https://docs.crypto-service.co/">docs.crypto-service.co</a> &bull; Monorepo suite at <a href="https://github.com/sebastienrousseau/crypto-service">GitHub</a></p>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(SITE_DIR, "index.html"), portalHtml);
console.log("==> Unified documentation portal generated at _site/index.html!");
console.log(`==> Total packages indexed: ${packageMeta.length}`);
