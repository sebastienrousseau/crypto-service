---
form_origin: "https://docs.crypto-service.co"
layout: index
title: "Crypto Service Suite — Quantum-Safe Cryptography for TypeScript"
description: "Official documentation for Crypto Service Suite: 50+ classical, modern, and post-quantum cryptographic primitives, REST microservice, CLI, and full-stack integrations."
eyebrow: "Next-Generation Cryptography"
author: "Sebastien Rousseau"
name: "Crypto Service"
headline: "Quantum-Safe Cryptography for TypeScript & Node.js"
lead: "Production-grade cryptographic suite with 50+ primitives: FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA, FIPS 206 FN-DSA, RFC 10024 hybrid key encapsulation, WebAssembly acceleration, Fastify REST microservice, CLI, and full-stack integrations across 18 packages."
language: en-GB
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Curved electric blue and violet light trails over a dark obsidian background"
date: "2026-09-27"
label_theme: "Theme"
label_theme_system: "System"
label_theme_light: "Light"
label_theme_dark: "Dark"
label_home: "Crypto Service home"
label_menu: "Menu"
label_menu_toggle: "Toggle navigation menu"
label_nav: "Main navigation"
label_github: "View Crypto Service on GitHub"
nav_overview: "Overview"
nav_security: "Security"
nav_faq: "FAQ"
cta_primary: "Get Started"
---

<section id="overview" class="section">
<div class="container text-center">
<h2 class="section-title">Engineered for High-Assurance Security &amp; Post-Quantum Resilience</h2>
<p class="section-desc">Zero external runtime dependencies, 100% test coverage floor across all 18 monorepo packages, constant-time algorithms, and native memory hygiene.</p>
<div class="grid-2x2">
<div class="card">
<h3>Post-Quantum Native</h3>
<p>Complete implementation of NIST standards: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), FIPS 206 (FN-DSA), and RFC 10024 hybrid key encapsulation.</p>
</div>
<div class="card">
<h3>18 Monorepo Packages</h3>
<p>From the core cryptographic engine and WebAssembly acceleration to REST APIs, CLI tooling, Edge adapters, Cloud KMS, and frontend React/Vue hooks.</p>
</div>
<div class="card">
<h3>100% Test Coverage Floor</h3>
<p>Strict quality enforcement with 100% line, branch, function, and statement coverage across every package, verified against official NIST CAVP test vectors.</p>
</div>
<div class="card">
<h3>Zero-Trust Memory Hygiene</h3>
<p>Automatic memory zeroization via <code>wipeMemory()</code> and defensive bounds checking to safeguard ephemeral keys from heap and core-dump inspection.</p>
</div>
</div>
</div>
</section>

<section id="packages" class="section">
<div class="container">
<h2 class="section-title text-center">Workspace Packages (18 Modules)</h2>
<p class="section-desc text-center">Modular architecture with lockstep releases, zero cyclic dependencies, and interactive TypeDoc API documentation.</p>

<div class="grid-2x2">
<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-lib/">crypto-lib</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Core cryptographic primitives: ML-KEM, ML-DSA, SLH-DSA, FN-DSA, RFC 10024 hybrid KEMs, AES-GCM-SIV, HPKE, PASETO v4, Double Ratchet, PAKE, and memory zeroing.</p>
<p><a href="packages/crypto-lib/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-wasm/">crypto-wasm</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>WebAssembly acceleration modules compiled from Rust for compute-intensive post-quantum lattice operations and high-throughput key generation.</p>
<p><a href="packages/crypto-wasm/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-server/">crypto-server</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Fastify-based REST microservice exposing 34+ cryptographic endpoints, OpenAPI / Swagger schemas, rate limiting, and RBAC.</p>
<p><a href="packages/crypto-server/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-cli/">crypto-cli</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Command-line interface for key generation, file encryption, digital signatures, password verification, and shell automation.</p>
<p><a href="packages/crypto-cli/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-sdk/">crypto-sdk</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Universal client SDK for browsers and Node.js with built-in retry policies, error handling, and type-safe server bindings.</p>
<p><a href="packages/crypto-sdk/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-kms/">crypto-kms</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Key Management Service provider integrating AWS KMS, GCP Cloud KMS, Azure Key Vault, and HashiCorp Vault with envelope encryption.</p>
<p><a href="packages/crypto-kms/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-edge/">crypto-edge</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Zero-dependency Edge runtime adapters optimized for Cloudflare Workers, Vercel Edge, Deno, and WinterCG runtimes.</p>
<p><a href="packages/crypto-edge/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-prisma/">crypto-prisma</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Transparent field-level encryption middleware for Prisma Client supporting blind indexing and envelope encryption.</p>
<p><a href="packages/crypto-prisma/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-typeorm/">crypto-typeorm</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>TypeORM column transformers and entity subscriber decorators for automated database encryption at rest.</p>
<p><a href="packages/crypto-typeorm/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-middleware/">crypto-middleware</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Framework-agnostic HTTP middleware providing request payload decryption, response encryption, and signature validation.</p>
<p><a href="packages/crypto-middleware/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-react/">crypto-react</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>React hooks library providing <code>useEncrypt</code>, <code>useHash</code>, <code>useKeypair</code>, and <code>useSignature</code> for frontend applications.</p>
<p><a href="packages/crypto-react/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-vue/">crypto-vue</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Vue 3 composables library offering reactive cryptographic state and asynchronous execution bridges.</p>
<p><a href="packages/crypto-vue/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-api/">crypto-api</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>High-level formatting, validation, and documentation generation utilities providing standardized schemas and JSON-RPC / REST models.</p>
<p><a href="packages/crypto-api/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-testing/">crypto-testing</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Comprehensive test harness, synthetic cryptographic vectors, mock KMS providers, and compliance validation suites.</p>
<p><a href="packages/crypto-testing/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-mcp/">crypto-mcp</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Model Context Protocol (MCP) server providing cryptographic tools, standard resources, and migration prompts to AI coding assistants.</p>
<p><a href="packages/crypto-mcp/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-lsp/">crypto-lsp</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Language Server Protocol (LSP) server providing real-time AST/regex static analysis, quantum vulnerability linting, and automated IDE quick fixes.</p>
<p><a href="packages/crypto-lsp/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-cbom/">crypto-cbom</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>Cryptographic Bill of Materials generator adhering to CycloneDX 1.6 and SPDX 3.0 with DORA Articles 9/13 and CRA Article 14 audit scoring.</p>
<p><a href="packages/crypto-cbom/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h3 style="margin-bottom: 0;"><a href="packages/crypto-benchmarks/">crypto-benchmarks</a></h3>
<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.7;">v0.0.3</span>
</div>
<p>High-resolution benchmarking suite measuring operations per second, memory allocations, and latency across classical and post-quantum primitives.</p>
<p><a href="packages/crypto-benchmarks/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>
</div>
</div>
</section>

<section id="standards" class="section">
<div class="container">
<h2 class="section-title text-center">Cryptographic Standards Matrix</h2>
<p class="section-desc text-center">Strict conformance to NIST FIPS, IETF RFC, and modern zero-trust standards.</p>

<div class="table-responsive">
<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
<thead>
<tr style="border-bottom: 2px solid var(--border); text-align: left;">
<th style="padding: 0.75rem;">Standard</th>
<th style="padding: 0.75rem;">Algorithm</th>
<th style="padding: 0.75rem;">Parameter Sets</th>
<th style="padding: 0.75rem;">Package Implementation</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>FIPS 203</strong></td>
<td style="padding: 0.75rem;">ML-KEM (Module-Lattice KEM)</td>
<td style="padding: 0.75rem;"><code>ML-KEM-512</code>, <code>ML-KEM-768</code>, <code>ML-KEM-1024</code></td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>FIPS 204</strong></td>
<td style="padding: 0.75rem;">ML-DSA (Module-Lattice Signatures)</td>
<td style="padding: 0.75rem;"><code>ML-DSA-44</code>, <code>ML-DSA-65</code>, <code>ML-DSA-87</code></td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>FIPS 205</strong></td>
<td style="padding: 0.75rem;">SLH-DSA (Stateless Hash Signatures)</td>
<td style="padding: 0.75rem;"><code>SLH-DSA-SHA2-128s</code>, <code>SLH-DSA-SHAKE-256f</code></td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>FIPS 206</strong></td>
<td style="padding: 0.75rem;">FN-DSA (FALCON Signatures)</td>
<td style="padding: 0.75rem;"><code>FALCON-512</code>, <code>FALCON-1024</code></td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>RFC 10024</strong></td>
<td style="padding: 0.75rem;">Hybrid Post-Quantum KEMs</td>
<td style="padding: 0.75rem;"><code>X25519MLKEM768</code> (0x11ec), <code>SecP256r1MLKEM768</code> (0x11ed)</td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>RFC 9180</strong></td>
<td style="padding: 0.75rem;">HPKE (Hybrid Public Key Encryption)</td>
<td style="padding: 0.75rem;"><code>DHKEM(X25519) + HKDF-SHA256 + ChaCha20Poly1305</code></td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>NIST SP 800-38D</strong></td>
<td style="padding: 0.75rem;">AES-GCM &amp; AES-GCM-SIV</td>
<td style="padding: 0.75rem;">Misuse-resistant authenticated encryption</td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr style="border-bottom: 1px solid var(--border);">
<td style="padding: 0.75rem;"><strong>PASETO v4</strong></td>
<td style="padding: 0.75rem;">Platform-Agnostic Security Tokens</td>
<td style="padding: 0.75rem;"><code>v4.local</code> (XChaCha20-Poly1305), <code>v4.public</code> (Ed25519)</td>
<td style="padding: 0.75rem;"><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
</tbody>
</table>
</div>
</div>
</section>

<section id="quickstart" class="section">
<div class="container narrow">
<h2 class="section-title text-center">Quick Start</h2>
<p class="section-desc text-center">Install packages using pnpm, npm, or yarn and run quantum-safe operations immediately.</p>

<h3>1. Installation</h3>
<pre><code>&#35; Install core cryptography engine
pnpm add @sebastienrousseau/crypto-lib

&#35; Or install full-stack client SDK
pnpm add @sebastienrousseau/crypto-sdk</code></pre>

<h3>2. Post-Quantum Key Encapsulation (FIPS 203 ML-KEM-768)</h3>
<pre><code>import { mlKemKeygen, mlKemEncapsulate, mlKemDecapsulate, wipeMemory } from "@sebastienrousseau/crypto-lib";

// Alice generates keypair
const alice = mlKemKeygen(768);

// Bob encapsulates a shared secret to Alice's public key
const { ciphertext, sharedSecret: bobSecret } = mlKemEncapsulate(768, alice.publicKey);

// Alice decapsulates the shared secret using her private key
const { sharedSecret: aliceSecret } = mlKemDecapsulate(768, alice.secretKey, ciphertext);

// Sanitize sensitive key buffers from memory
wipeMemory(alice.secretKey);

console.log("Shared secrets match:", aliceSecret.every((b, i) => b === bobSecret[i]));</code></pre>

<h3>3. RFC 10024 Classical + PQ Hybrid Key Exchange</h3>
<pre><code>import { hybridKemKeygen, hybridKemEncapsulate, hybridKemDecapsulate } from "@sebastienrousseau/crypto-lib";

// Recipient creates X25519 + ML-KEM-768 hybrid keypair
const recipient = hybridKemKeygen(768);

// Sender encapsulates dual secret
const senderResult = hybridKemEncapsulate(768, recipient.x25519PublicKey, recipient.mlKemPublicKey);

// Recipient decapsulates both and derives final hybrid secret
const recipientResult = hybridKemDecapsulate(
768,
recipient.x25519PrivateKey,
recipient.mlKemSecretKey,
senderResult.x25519EphemeralPublic,
senderResult.mlKemCiphertext
);

console.log("Hybrid key exchange established:", recipientResult.sharedSecret.length === 32);</code></pre>
</div>
</section>

<section id="architecture" class="section">
<div class="container text-center">
<h2 class="section-title">Microservice &amp; Tooling Architecture</h2>
<p class="section-desc">Production infrastructure with zero-overhead execution paths.</p>

<div class="grid-2x2">
<div class="card">
<h3>Fastify Microservice</h3>
<p>Expose 34+ cryptographic operations over high-throughput HTTP/2 with OpenAPI documentation, schema validation, and health checks.</p>
<pre><code>pnpm --filter @sebastienrousseau/crypto-server start</code></pre>
</div>
<div class="card">
<h3>Command-Line CLI</h3>
<p>Perform cryptographic key generation, encryption, signing, and verification directly in CI/CD pipelines or local shells.</p>
<pre><code>npx @sebastienrousseau/crypto-cli keygen --type ml-kem-768</code></pre>
</div>
<div class="card">
<h3>Cloud KMS Provider</h3>
<p>Seamlessly wrap data encryption keys (DEK) with AWS KMS, Google Cloud KMS, or Azure Key Vault using envelope encryption.</p>
</div>
<div class="card">
<h3>Edge &amp; Wasm Runtimes</h3>
<p>Deploy to Cloudflare Workers, Vercel Edge, and browser WebAssembly with sub-millisecond startup and zero native binaries.</p>
</div>
</div>
</div>
</section>

<section id="security" class="section">
<div class="container narrow">
<h2 class="section-title text-center">Security Model &amp; Invariants</h2>
<p class="section-desc text-center">Hardened defense in depth for high-stakes cryptographic workloads.</p>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>Constant-Time Operations</h3>
<p>All sensitive cryptographic comparisons, MAC verifications, and decapsulations are performed in constant time to eliminate timing side-channel attacks.</p>
</div>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>Deterministic Memory Sanitization</h3>
<p>The <code>wipeMemory()</code> primitive securely overwrites TypedArray buffers with zeros immediately after key operations, defeating cold boot and core dump leakage.</p>
</div>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>Automated CycloneDX SBOM</h3>
<p>Cryptographic dependencies and signatures are tracked with machine-readable CycloneDX Software Bill of Materials (SBOM) and verified on every release.</p>
</div>
</div>
</section>

<section id="faq" class="section">
<div class="container narrow">
<h2 class="section-title text-center">Frequently Asked Questions</h2>
<div class="card" style="margin-bottom: 1rem;">
<h3>Why migrate to post-quantum cryptography now?</h3>
<p>Adversaries can record encrypted network traffic today and decrypt it in the future once cryptanalytically relevant quantum computers exist (Harvest Now, Decrypt Later). FIPS 203 ML-KEM and RFC 10024 hybrid KEMs provide immediate forward secrecy against quantum adversaries.</p>
</div>
<div class="card" style="margin-bottom: 1rem;">
<h3>Can I use Crypto Service Suite in browser and edge runtimes?</h3>
<p>Yes. The entire suite is designed with universal TypeScript compatibility. <code>@sebastienrousseau/crypto-edge</code> provides optimized bindings for Cloudflare Workers, Deno, and Vercel Edge, while <code>@sebastienrousseau/crypto-react</code> and <code>@sebastienrousseau/crypto-vue</code> offer declarative frontend hooks.</p>
</div>
<div class="card" style="margin-bottom: 1rem;">
<h3>How does the 100% test coverage floor work?</h3>
<p>Our CI pipeline executes unit, integration, and fuzz testing across all 18 workspace packages. Any PR dropping line, statement, function, or branch coverage below 100% fails the verification gate immediately.</p>
</div>
</div>
</section>
