---
title: "Modular Crypto as a Service (CaaS) Solutions — Crypto Service Suite"
description: "Self-hosted Crypto-as-a-Service (CaaS) building blocks for fintechs, banks, and enterprise engineering teams: post-quantum primitives, a REST service, a KMS interface, database field encryption, edge runtime support, and CycloneDX CBOM generation."
eyebrow: "Institutional Solutions & Architecture"
headline: "Sovereign Cryptographic Infrastructure for Modern Enterprise Stacks"
lead: "Crypto Service Suite provides self-hostable Cryptography-as-a-Service (CaaS) building blocks across 18 lockstep libraries: FIPS 203/204 algorithms (via @noble/post-quantum; not a validated cryptographic module), a KMS interface, and transparent database field encryption."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2026-09-28"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Pastel morphing gradient with organic glass droplets"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<div class="solutions-overview-grid">
<div class="solution-nav-card">
<span class="solution-num font-mono">01</span>
<h3><a href="#post-quantum">Post-Quantum Cryptography</a></h3>
<p>NIST FIPS 203 ML-KEM and FIPS 204 ML-DSA algorithms, plus classical + ML-KEM hybrid KEMs.</p>
</div>
<div class="solution-nav-card">
<span class="solution-num font-mono">02</span>
<h3><a href="#caas-server">Self-Hosted CaaS Service &amp; SDK</a></h3>
<p>Self-hosted Fastify REST service, typed client SDK, and interactive CLI.</p>
</div>
<div class="solution-nav-card">
<span class="solution-num font-mono">03</span>
<h3><a href="#multi-cloud-kms">KMS Interface</a></h3>
<p>Uniform provider interface. AWS KMS and a local provider are implemented; GCP, Azure and Vault are stubs.</p>
</div>
<div class="solution-nav-card">
<span class="solution-num font-mono">04</span>
<h3><a href="#field-encryption">Database &amp; Middleware Encryption</a></h3>
<p>Transparent column-level encryption for Prisma ORM, TypeORM, and Express/Fastify request middleware.</p>
</div>
<div class="solution-nav-card">
<span class="solution-num font-mono">05</span>
<h3><a href="#edge-wasm">Edge Runtime Support</a></h3>
<p>Web Crypto adapter for Cloudflare Workers, Vercel Edge, Deno, Bun and browsers.</p>
</div>
<div class="solution-nav-card">
<span class="solution-num font-mono">06</span>
<h3><a href="#governance-ai">CBOM, LSP &amp; AI Agent Tooling</a></h3>
<p>CycloneDX 1.6 CBOM generator for cryptographic inventories, Language Server Protocol, and Model Context Protocol (MCP).</p>
</div>
</div>

<div class="card card-quickstart">
<div class="quickstart-header">
<span class="quickstart-title">Developer Quick-Start Installation</span>
<span class="quickstart-lang">from source (pnpm workspace)</span>
</div>
<div class="hero-code-block">
<pre><code><span class="hero-code-comment"># 1. Build from source (npm has crypto-lib 0.0.3 only; crypto-prisma is not on npm)</span>
<span class="hero-code-cmd">git clone</span> https://github.com/sebastienrousseau/crypto-service.git
<span class="hero-code-cmd">cd</span> crypto-service &amp;&amp; <span class="hero-code-cmd">pnpm install</span> &amp;&amp; <span class="hero-code-cmd">pnpm -r run build</span>

<span class="hero-code-comment">// 2. ML-KEM-768 key encapsulation (FIPS 203 algorithm)</span>
<span class="hero-code-keyword">import</span> { mlKemKeygen, mlKemEncap, mlKemDecap } <span class="hero-code-keyword">from</span> <span class="hero-code-string">"@sebastienrousseau/crypto-lib"</span>;

<span class="hero-code-keyword">const</span> kem = mlKemKeygen(768);
<span class="hero-code-keyword">const</span> { ciphertext, sharedSecret } = mlKemEncap(768, kem.publicKey);
<span class="hero-code-keyword">const</span> received = mlKemDecap(768, kem.secretKey, ciphertext);</code></pre>
</div>
</div>

<hr class="section-divider">

<section id="post-quantum" class="solution-detail-section">
<div class="solution-header">
<span class="solution-badge font-mono">SOLUTION 01 // CORE CRYPTOGRAPHY</span>
<h2>1. Post-Quantum Enclaves &amp; Hybrid Key Encapsulation</h2>
</div>

<p class="lead-text">
A cryptographically relevant quantum computer running Shor's algorithm would break RSA, Diffie-Hellman, and elliptic-curve cryptography. You can start using NIST FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA) algorithms today; crypto-lib implements them via <code>@noble/post-quantum</code>, which is not a validated cryptographic module.
</p>

<p>
Under the <strong>Harvest Now, Decrypt Later (HNDL)</strong> attack model, state actors record encrypted traffic today for future decryption. Hybrid schemes are designed so that an adversary must break both the classical and the lattice component to recover the shared secret.
</p>

<div class="grid-2x2">
<div class="card">
<h3>FIPS 203 (ML-KEM) Algorithms</h3>
<p><code>@sebastienrousseau/crypto-lib</code> exposes ML-KEM-512, ML-KEM-768 and ML-KEM-1024 through <code>@noble/post-quantum</code>. ML-KEM-768 targets NIST security category 3 and has 1,088-byte ciphertexts.</p>
</div>
<div class="card">
<h3>Composite Dual-Layer Hybrid Schemes</h3>
<p>Combines a classical curve (X25519, NIST P-256 or X448) with ML-KEM and derives the session key from both shared secrets, so an attacker must break <em>both</em> components to recover it.</p>
</div>
<div class="card" id="signatures">
<h3>FIPS 204 (ML-DSA) Digital Signatures</h3>
<p>Lattice-based digital signatures (ML-DSA-44/65/87) via <code>@noble/post-quantum</code>. ML-DSA-65 targets NIST security category 3. <code>@noble/post-quantum</code> does not guarantee constant-time execution.</p>
</div>
<div class="card" id="entropy">
<h3>Memory Hygiene &amp; Entropy</h3>
<p>Randomness comes from the platform CSPRNG. crypto-lib exports <code>wipeMemory()</code> and <code>SecureBuffer</code> for callers, but its own APIs do not zeroize intermediate state, and keys passed as hex strings cannot be wiped.</p>
</div>
</div>

<div class="visual-anchor visual-anchor-centered">
<img
src="/images/news-pqc-lattice.webp"
alt="Luminous quantum lattice chip encapsulated in a floating clear liquid glass droplet"
width="720"
height="405"
class="visual-anchor-img"
loading="lazy"
>
</div>
</section>

<hr class="section-divider">

<section id="caas-server" class="solution-detail-section">
<div class="solution-header">
<span class="solution-badge font-mono">SOLUTION 02 // MICROSERVICE ARCHITECTURE</span>
<h2>2. Sovereign Crypto-as-a-Service Daemon &amp; Client SDK</h2>
</div>

<p class="lead-text">
Third-party hosted platforms introduce counterparty risk and vendor lock-in. Crypto Service Suite lets you run a self-hosted CaaS tier in your private cloud or on-premises data centre.
</p>

<p>
Your applications call the service over a REST API. Keys you manage with it stay on infrastructure you control.
</p>

<div class="grid-2x2">
<div class="card">
<h3>Fastify REST Microservice</h3>
<p><code>@sebastienrousseau/crypto-server</code> exposes crypto-lib operations behind documented REST endpoints, with rate limiting and OpenTelemetry instrumentation. No throughput figures are published yet.</p>
</div>
<div class="card">
<h3>Type-Safe Zero-Dependency SDK</h3>
<p><code>@sebastienrousseau/crypto-sdk</code> is a zero-dependency, fetch-based TypeScript client with typed request and response bindings.</p>
</div>
<div class="card">
<h3>Interactive CLI</h3>
<p>The <code>@sebastienrousseau/crypto-cli</code> package offers key pair generation, encryption, signing, hashing and CBOM generation from an interactive terminal menu. It has no non-interactive flags, so it is not suited to scripts or CI pipelines.</p>
</div>
<div class="card">
<h3>Self-Hosted Deployment</h3>
<p>Run the service inside your private VPC or on-premises infrastructure. OpenTelemetry export is off unless you set <code>OTEL_EXPORTER_OTLP_ENDPOINT</code>.</p>
</div>
</div>
</section>

<hr class="section-divider">

<section id="multi-cloud-kms" class="solution-detail-section">
<div class="solution-header">
<span class="solution-badge font-mono">SOLUTION 03 // KEY MANAGEMENT</span>
<h2>3. KMS Interface</h2>
</div>

<p class="lead-text">
<code>@sebastienrousseau/crypto-kms</code> defines one TypeScript interface for key management backends. Today the AWS KMS and local in-memory providers are implemented. The Google Cloud, Azure and HashiCorp Vault providers are stubs that reject every call with <code>Not implemented</code>.
</p>

<p>
<code>generateDataKey()</code> supports envelope encryption: data encryption keys (DEKs) are wrapped by a key encryption key (KEK) held by the provider.
</p>

<div class="grid-2x2">
<div class="card">
<h3>AWS KMS (implemented)</h3>
<p><code>AwsKmsProvider</code> calls AWS Key Management Service through <code>@aws-sdk/client-kms</code>. There is no direct CloudHSM integration.</p>
</div>
<div class="card">
<h3>Google Cloud KMS (stub)</h3>
<p><code>GcpKmsProvider</code> exists as an interface placeholder; every method rejects with <code>Not implemented</code>.</p>
</div>
<div class="card">
<h3>Azure Key Vault (stub)</h3>
<p><code>AzureKmsProvider</code> exists as an interface placeholder; every method rejects with <code>Not implemented</code>.</p>
</div>
<div class="card">
<h3>HashiCorp Vault (stub) &amp; PKCS#11 (simulation)</h3>
<p><code>VaultKmsProvider</code> is a stub. <code>Pkcs11HsmProvider</code> is an in-memory software simulation for tests: it has no PKCS#11 binding, talks to no HSM, and requires <code>simulate: true</code>.</p>
</div>
</div>
</section>

<hr class="section-divider">

<section id="field-encryption" class="solution-detail-section">
<div class="solution-header">
<span class="solution-badge font-mono">SOLUTION 04 // DATA SECURITY</span>
<h2>4. Transparent Database Field-Level Encryption</h2>
</div>

<p class="lead-text">
Securing sensitive customer records, financial ledgers, and authentication credentials requires robust ciphertext-at-rest. You can encrypt individual database columns automatically in Prisma and TypeORM without breaking database schemas or application business logic.
</p>

<p>
Decryption happens in application memory when queries return. Database dumps and storage snapshots hold only ciphertext for the configured fields.
</p>

<div class="grid-2x2">
<div class="card">
<h3>Prisma ORM Field-Level Encryption</h3>
<p><code>@sebastienrousseau/crypto-prisma</code> provides transparent extension middleware for Prisma Client. Configured fields are encrypted with XChaCha20-Poly1305 before they are written and decrypted on read; fields marked deterministic are stored as HMAC-SHA256 values for equality search.</p>
</div>
<div class="card">
<h3>TypeORM Column Decorators</h3>
<p><code>@sebastienrousseau/crypto-typeorm</code> provides an <code>@EncryptedColumn()</code> decorator and transformer for TypeORM entities, encrypting column values with XChaCha20-Poly1305.</p>
</div>
<div class="card">
<h3>Express &amp; Fastify Middleware</h3>
<p><code>@sebastienrousseau/crypto-middleware</code> decrypts inbound request payloads, verifies HMAC signatures and HS256 JWTs, and encrypts outbound responses in Express and Fastify.</p>
</div>
<div class="card">
<h3>Client-Side React &amp; Vue Hooks</h3>
<p>Secure end-to-end data encryption before transmission using <code>@sebastienrousseau/crypto-react</code> (<code>useEncrypt</code>, <code>useKeypair</code>, <code>useHash</code>, <code>useSignature</code>) and <code>@sebastienrousseau/crypto-vue</code> composables with reactive state management.</p>
</div>
</div>

<div class="visual-anchor visual-anchor-centered">
<img
src="/images/news-hndl-shield.webp"
alt="Organic liquid glass orb protecting encrypted financial data streams"
width="720"
height="405"
class="visual-anchor-img"
loading="lazy"
>
</div>
</section>

<hr class="section-divider">

<section id="edge-wasm" class="solution-detail-section">
<div class="solution-header">
<span class="solution-badge font-mono">SOLUTION 05 // HIGH PERFORMANCE</span>
<h2>5. Edge Runtime Support</h2>
</div>

<p class="lead-text">
All cryptography in the suite runs in JavaScript (the <code>@noble/*</code> libraries and OpenPGP.js) or through the platform Web Crypto API. There is no WebAssembly code in the suite today.
</p>

<div class="grid-2x2">
<div class="card">
<h3>WebAssembly: not yet implemented</h3>
<p><code>@sebastienrousseau/crypto-wasm</code> is a placeholder package. It contains no WebAssembly module, so it provides no acceleration.</p>
</div>
<div class="card">
<h3>Edge Runtimes</h3>
<p><code>@sebastienrousseau/crypto-edge</code> adapts crypto-lib to Cloudflare Workers, Vercel Edge, Deno, Bun and browsers, with runtime detection and text/base64 fallbacks. Randomness is never polyfilled.</p>
</div>
<div class="card">
<h3>No constant-time guarantee</h3>
<p>The suite has not been verified against timing side channels, and <code>@noble/post-quantum</code> does not guarantee constant-time execution.</p>
</div>
</div>
</section>

<hr class="section-divider">

<section id="governance-ai" class="solution-detail-section">
<div class="solution-header">
<span class="solution-badge font-mono">SOLUTION 06 // GOVERNANCE &amp; AI</span>
<h2>6. CBOM, Developer LSP &amp; AI Agent MCP</h2>
</div>

<p class="lead-text">
A cryptographic inventory is a common input to DORA (EU 2022/2554) ICT risk work. You can generate machine-readable CycloneDX 1.6 Cryptographic Bills of Materials (CBOM) from your source code. Generating a CBOM does not by itself make a system compliant.
</p>

<p>
Developer IDEs and autonomous AI agents receive native cryptographic intelligence through the Language Server Protocol (LSP) and Model Context Protocol (MCP), flagging weak or quantum-vulnerable algorithm names and offering quick fixes.
</p>

<div class="grid-2x2">
<div class="card">
<h3>CycloneDX 1.6 &amp; SPDX 3.0 CBOM</h3>
<p><code>@sebastienrousseau/crypto-cbom</code> scans source code for algorithm usage and generates CycloneDX 1.6 or SPDX 3.0 Cryptographic Bill of Materials (CBOM) documents.</p>
</div>
<div class="card">
<h3>Language Server Protocol (LSP)</h3>
<p><code>@sebastienrousseau/crypto-lsp</code> is a language server that works with any LSP client. Pattern rules flag deprecated algorithms (MD5, SHA-1, DES), short RSA keys and quantum-vulnerable public-key algorithms, with code actions for some findings.</p>
</div>
<div class="card">
<h3>Model Context Protocol (MCP) for AI</h3>
<p><code>@sebastienrousseau/crypto-mcp</code> exposes crypto-lib operations, key generation and KMS tools to AI assistants through the Model Context Protocol.</p>
</div>
<div class="card">
<h3>Test Fixtures</h3>
<p><code>@sebastienrousseau/crypto-testing</code> supplies synthetic test keys (including RFC 8032 and RFC 7748 vectors), fixtures and mocks for code that uses crypto-lib.</p>
</div>
</div>

<div class="hero-cta-group hero-cta-spaced">
<a class="btn btn-swift-mint btn-lg" href="/contact/">Request Architecture Briefing →</a>
<a class="btn btn-secondary btn-lg" href="/standards/">View Standards Matrix →</a>
</div>
</section>
