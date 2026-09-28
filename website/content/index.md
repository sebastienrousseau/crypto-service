---
form_origin: "https://docs.crypto-service.co"
layout: index
title: "Crypto Service Suite — Post-Quantum Cryptographic Infrastructure for Institutional Finance"
description: "Non-custodial, high-throughput cryptographic operating core for tier-1 banks, institutional custodians, and regulated fintechs: FIPS 203 ML-KEM, FIPS 204 ML-DSA, multi-cloud KMS orchestration, and DORA Article 13 & CRA compliance across 18 lockstep packages."
eyebrow: "Post-Quantum Cryptographic Architecture · FIPS 203/204"
author: "Sebastien Rousseau"
name: "Crypto Service"
headline: "Post-Quantum Cryptographic Infrastructure for Institutional Finance"
lead: "The mission-critical cryptographic architecture engineered for tier-1 banks, custodians, and regulated fintechs. High-throughput post-quantum envelope encryption, multi-cloud KMS orchestration, and real-time DORA & CBOM compliance across 18 modular TypeScript and WebAssembly packages."
language: en-GB
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Curved electric teal and amber light trails over a dark obsidian background"
date: "2026-09-28"
label_theme: "Theme"
label_theme_system: "System"
label_theme_light: "Light"
label_theme_dark: "Dark"
label_home: "Crypto Service home"
label_menu: "Menu"
label_menu_toggle: "Toggle navigation menu"
label_nav: "Main navigation"
label_github: "View Crypto Service on GitHub"
nav_overview: "Architecture"
nav_security: "Security"
nav_faq: "FAQ"
cta_primary: "Explore 18 Packages"
---

<!-- Institutional Standards Strip (SWIFT / DORA Standards) -->
<section class="section-standards">
  <div class="container text-center">
    <div class="standards-bar">
      <span class="standard-pill"><span class="pill-dot"></span> ISO 20022 MESSAGING</span>
      <span class="standard-pill"><span class="pill-dot"></span> DORA ART. 13/14 RESILIENCE</span>
      <span class="standard-pill"><span class="pill-dot"></span> NIST FIPS 203 / 204</span>
      <span class="standard-pill"><span class="pill-dot"></span> NSA CNSA 2.0 TIMELINE</span>
      <span class="standard-pill"><span class="pill-dot"></span> CYCLONEDX 1.6 CBOM</span>
    </div>
  </div>
</section>

<!-- Proven Market Scale (Copper 3-Card Metrics Dock) -->
<section class="metrics-section">
  <div class="container">
    <div class="metrics-header">
      <h2>Proven <span class="serif">Market Scale</span></h2>
      <p>Engineered for tier-1 banks, sovereign treasuries, and regulated custodians to eliminate counterparty risk and achieve quantum resilience before the 2027 regulatory deadlines.</p>
    </div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-top">
          <span class="metric-number font-mono">18</span>
          <span class="metric-icon-badge" aria-hidden="true">◆</span>
        </div>
        <p class="metric-desc">Modular packages released in lockstep with zero external runtime dependencies.</p>
      </div>
      <div class="metric-card">
        <div class="metric-top">
          <span class="metric-number font-mono">100%</span>
          <span class="metric-icon-badge" aria-hidden="true">✓</span>
        </div>
        <p class="metric-desc">Strict test coverage floor across statements, branches, functions, and lines.</p>
      </div>
      <div class="metric-card">
        <div class="metric-top">
          <span class="metric-number font-mono">&lt; 1ms</span>
          <span class="metric-icon-badge" aria-hidden="true">⚡</span>
        </div>
        <p class="metric-desc">Deterministic SIMD WebAssembly execution across edge and serverless runtimes.</p>
      </div>
    </div>
  </div>
</section>

<section id="architecture" class="section">
<div class="container text-center">
<h2 class="section-title">Institutional Architecture &amp; High-Assurance Invariants</h2>
<p class="section-desc">Zero external runtime dependencies, 100% test coverage floor across all 18 monorepo packages, constant-time algorithms, and native memory zeroization.</p>
<div class="grid-2x2">
<div class="card">
<h3>Post-Quantum Native</h3>
<p>Complete implementation of NIST standards: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), FIPS 206 (FN-DSA), and RFC 10024 hybrid key encapsulation mechanisms.</p>
</div>
<div class="card">
<h3>Non-Custodial Core Architecture</h3>
<p>Absolute counterparty risk elimination. Cryptographic roots of trust, master keys, and envelope operations remain exclusively within your sovereign VPC, enclaves, or hardware security modules.</p>
</div>
<div class="card">
<h3>100% Strict Test Floor</h3>
<p>Strict quality enforcement with 100% line, branch, function, and statement coverage across every workspace package, verified against official NIST CAVP test vectors.</p>
</div>
<div class="card">
<h3>Deterministic Memory Hygiene</h3>
<p>Automatic memory zeroization via <code>wipeMemory()</code> and defensive bounds checking to safeguard ephemeral keys from heap inspection, core dumps, and memory scanning attacks.</p>
</div>
</div>
</div>
</section>

<section id="packages" class="section">
<div class="container">
<h2 class="section-title text-center">The 18 Workspace Packages</h2>
<p class="section-desc text-center">A four-layer institutional architecture released in lockstep v0.0.4 with zero cyclic dependencies and interactive TypeDoc API documentation.</p>

<div style="margin-bottom: 2.5rem;">
<h3 style="font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--secondary); margin-bottom: 1rem;">Layer 1: Cryptographic Foundation &amp; Wasm Acceleration</h3>
<div class="grid-2x2">
<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-lib/">@sebastienrousseau/crypto-lib</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Core cryptographic primitives: ML-KEM, ML-DSA, SLH-DSA, FN-DSA, RFC 10024 hybrid KEMs, AES-GCM-SIV, HPKE, PASETO v4, Double Ratchet, PAKE, and memory zeroing.</p>
<p><a href="packages/crypto-lib/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-wasm/">@sebastienrousseau/crypto-wasm</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>WebAssembly acceleration modules compiled from Rust for compute-intensive post-quantum lattice operations, matrix NTT multiplications, and microsecond key generation.</p>
<p><a href="packages/crypto-wasm/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>
</div>
</div>

<div style="margin-bottom: 2.5rem;">
<h3 style="font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--secondary); margin-bottom: 1rem;">Layer 2: Core Services &amp; Protocol Abstractions</h3>
<div class="grid-2x2">
<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-server/">@sebastienrousseau/crypto-server</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Fastify REST microservice exposing 34+ cryptographic endpoints, OpenAPI / Swagger specifications, multi-tenant billing hooks, and rate limiting.</p>
<p><a href="packages/crypto-server/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-cli/">@sebastienrousseau/crypto-cli</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Command-line interface for key generation, file encryption, digital signatures, password verification, and automated CI/CD pipeline verification.</p>
<p><a href="packages/crypto-cli/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-sdk/">@sebastienrousseau/crypto-sdk</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Universal TypeScript client SDK for browsers and Node.js with built-in retry policies, exponential backoff, and type-safe server bindings.</p>
<p><a href="packages/crypto-sdk/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-api/">@sebastienrousseau/crypto-api</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Standardized API contracts, validation schemas, error serialization models, and JSON-RPC / REST schemas for seamless core banking integration.</p>
<p><a href="packages/crypto-api/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-kms/">@sebastienrousseau/crypto-kms</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Unified Key Management Service adapter integrating AWS KMS, Google Cloud KMS, Azure Key Vault, and HashiCorp Vault with automated envelope encryption.</p>
<p><a href="packages/crypto-kms/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>
</div>
</div>

<div style="margin-bottom: 2.5rem;">
<h3 style="font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--secondary); margin-bottom: 1rem;">Layer 3: Enterprise Integration, Edge &amp; Storage</h3>
<div class="grid-2x2">
<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-edge/">@sebastienrousseau/crypto-edge</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Zero-dependency Edge runtime adapters optimized for Cloudflare Workers, Vercel Edge, Deno, and WinterCG runtimes with cold start times under 5ms.</p>
<p><a href="packages/crypto-edge/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-prisma/">@sebastienrousseau/crypto-prisma</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Transparent field-level encryption middleware for Prisma Client supporting blind indexing and envelope encryption for sensitive financial records.</p>
<p><a href="packages/crypto-prisma/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-typeorm/">@sebastienrousseau/crypto-typeorm</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>TypeORM column transformers and entity subscriber decorators for automated database encryption at rest across PostgreSQL, MySQL, and Oracle.</p>
<p><a href="packages/crypto-typeorm/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-middleware/">@sebastienrousseau/crypto-middleware</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Framework-agnostic HTTP middleware providing automated request payload decryption, response encryption, and digital signature validation.</p>
<p><a href="packages/crypto-middleware/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-react/">@sebastienrousseau/crypto-react</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>React hooks library providing <code>useEncrypt</code>, <code>useHash</code>, <code>useKeypair</code>, and <code>useSignature</code> for frontend web and mobile applications.</p>
<p><a href="packages/crypto-react/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-vue/">@sebastienrousseau/crypto-vue</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Vue 3 composables library offering reactive cryptographic state and asynchronous execution bridges for customer-facing banking portals.</p>
<p><a href="packages/crypto-vue/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>
</div>
</div>

<div>
<h3 style="font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--secondary); margin-bottom: 1rem;">Layer 4: Compliance, Intelligence &amp; Tooling</h3>
<div class="grid-2x2">
<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-cbom/">@sebastienrousseau/crypto-cbom</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Cryptographic Bill of Materials generator adhering to CycloneDX 1.6 and SPDX 3.0 with DORA Articles 9/13 and CRA Article 14 automated audit scoring.</p>
<p><a href="packages/crypto-cbom/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-mcp/">@sebastienrousseau/crypto-mcp</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Model Context Protocol (MCP) server exposing cryptographic verification tools, standard resources, and migration prompts to AI coding agents.</p>
<p><a href="packages/crypto-mcp/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-lsp/">@sebastienrousseau/crypto-lsp</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Language Server Protocol (LSP) server providing real-time static analysis, quantum vulnerability linting, and automated IDE quick fixes.</p>
<p><a href="packages/crypto-lsp/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-testing/">@sebastienrousseau/crypto-testing</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>Comprehensive testing harness, synthetic cryptographic vectors, mock KMS providers, and compliance validation suites.</p>
<p><a href="packages/crypto-testing/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>

<div class="card">
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
<h4 style="margin: 0; font-size: 1.15rem;"><a href="packages/crypto-benchmarks/">@sebastienrousseau/crypto-benchmarks</a></h4>
<span class="version-tag">v0.0.4</span>
</div>
<p>High-resolution benchmarking suite measuring operations per second, memory allocations, and latency across classical and post-quantum primitives.</p>
<p><a href="packages/crypto-benchmarks/" class="btn btn-outline btn-sm">Explore API Reference &rarr;</a></p>
</div>
</div>
</div>

</div>
</section>

<!-- Alternating Feature Section (Copper Zig-Zag Standard) -->
<section class="zigzag-section">
  <div class="container">
    <div class="zigzag-header">
      <div class="pill-badge">
        <span class="pill-dot" aria-hidden="true"></span>
        <span class="pill-text">MOBILITY ACROSS MARKETS</span>
      </div>
      <h2 class="section-title">Infrastructure for <span class="serif">Mobility Across Markets</span></h2>
      <p class="section-desc">Always-on markets need cryptographic infrastructure that can keep up. Crypto Service connects you to a high-assurance network of key management, settlement, and compliance primitives together in one sovereign layer.</p>
    </div>

    <!-- Feature Row 1: Text Left, Graphic Right -->
    <div class="feature-row">
      <div class="feature-content">
        <h3>Reduce Risk, <span class="serif">Not Reach</span></h3>
        <p>Key management should do more than keep assets locked in a black box. Crypto Service gives institutions the sovereign foundation to sign, encrypt, and orchestrate cryptographic keys across trading, settlement, and multi-cloud workflows.</p>
        <a class="btn btn-dark-pill" href="#packages">Explore Sovereign KMS &rarr;</a>
      </div>
      <div class="feature-stage" aria-hidden="true">
        <svg viewBox="0 0 280 280" width="220" height="220" fill="none" stroke="currentColor" stroke-width="1.2" class="wireframe-sphere">
          <circle cx="140" cy="140" r="110" stroke-opacity="0.3" />
          <ellipse cx="140" cy="140" rx="110" ry="40" stroke-opacity="0.35" />
          <ellipse cx="140" cy="140" rx="40" ry="110" stroke-opacity="0.35" />
          <ellipse cx="140" cy="140" rx="80" ry="110" stroke-opacity="0.25" stroke-dasharray="3 3" />
          <circle cx="218" cy="95" r="4.5" fill="#FF9F1C" stroke="var(--bg)" stroke-width="2" />
          <circle cx="70" cy="190" r="4.5" fill="#2EC4B6" stroke="var(--bg)" stroke-width="2" />
        </svg>
        <span class="stage-badge lock">🔒 FIPS 203 Native</span>
        <span class="stage-badge secured">🛡️ Assets Secured</span>
      </div>
    </div>

    <!-- Feature Row 2: Graphic Left, Text Right -->
    <div class="feature-row reverse">
      <div class="feature-content">
        <h3>Ready to Settle <span class="serif">When It Matters Most</span></h3>
        <p>Markets move quickly. Cryptographic settlement should too. Crypto Service helps institutions move digital assets across trading, financing, and cross-border settlement workflows more efficiently through one connected infrastructure layer.</p>
        <a class="btn btn-dark-pill" href="#network">Explore Settlement Fabric &rarr;</a>
      </div>
      <div class="feature-stage" aria-hidden="true">
        <svg viewBox="0 0 280 280" width="220" height="220" fill="none" stroke="currentColor" stroke-width="1.2" class="wireframe-sphere">
          <circle cx="140" cy="140" r="110" stroke-opacity="0.3" />
          <ellipse cx="140" cy="140" rx="110" ry="50" stroke-opacity="0.35" />
          <ellipse cx="140" cy="140" rx="50" ry="110" stroke-opacity="0.35" />
          <circle cx="180" cy="110" r="4.5" fill="#2EC4B6" stroke="var(--bg)" stroke-width="2" />
          <circle cx="100" cy="170" r="4.5" fill="#FF9F1C" stroke="var(--bg)" stroke-width="2" />
        </svg>
        <span class="stage-badge btc font-mono">BTC / X25519</span>
        <span class="stage-badge eth font-mono">ETH / ML-DSA</span>
      </div>
    </div>

    <!-- Feature Row 3: Text Left, Graphic Right -->
    <div class="feature-row">
      <div class="feature-content">
        <h3>Built for <span class="serif">Tier-1 Institutions</span></h3>
        <p>Crypto Service acts as your gateway to the sovereign financial ecosystem, providing the infrastructure, services, and counterparty connectivity institutions need to move assets across markets with mathematical control.</p>
        <a class="btn btn-dark-pill" href="#architecture">Explore Architecture &rarr;</a>
      </div>
      <div class="feature-stage" aria-hidden="true">
        <svg viewBox="0 0 280 280" width="220" height="220" fill="none" stroke="currentColor" stroke-width="1.2" class="wireframe-sphere">
          <circle cx="140" cy="140" r="110" stroke-opacity="0.3" />
          <ellipse cx="140" cy="140" rx="110" ry="40" stroke-opacity="0.35" />
          <ellipse cx="140" cy="140" rx="40" ry="110" stroke-opacity="0.35" />
          <circle cx="140" cy="140" r="5" fill="var(--fg)" stroke="var(--bg)" stroke-width="2" />
        </svg>
        <span class="stage-badge uptime font-mono">24/7/365 Non-Custodial</span>
      </div>
    </div>

  </div>
</section>

<section id="network" class="section">
<div class="container text-center">
<h2 class="section-title">Global Settlement Fabric &amp; Network Interconnect</h2>
<p class="section-desc">Deterministic cross-border clearing primitives connecting institutional custody, multi-cloud KMS, and regulated banking rails across global financial hubs.</p>
<figure class="network-photo">
  <div class="photo-header">
    <span class="photo-badge font-mono">GLOBAL CLEARING FABRIC</span>
    <span class="photo-status">LOW-LATENCY MULTI-REGION</span>
  </div>
  <img src="{{site_path}}images/circuit_board_cityscape-640.webp" srcset="{{site_path}}images/circuit_board_cityscape-320.webp 320w, {{site_path}}images/circuit_board_cityscape-640.webp 640w, {{site_path}}images/circuit_board_cityscape-1200.webp 1200w, {{site_path}}images/circuit_board_cityscape-1920.webp 1920w, {{site_path}}images/circuit_board_cityscape.webp 2584w" sizes="(max-width: 48rem) 100vw, 48rem" width="1200" height="742" alt="Global digital circuit board cityscape depicting financial settlement infrastructure" loading="lazy">
</figure>
</div>
</section>

<section id="comparisons" class="section">
<div class="container">
<h2 class="section-title text-center">Institutional Architecture Comparison Matrix</h2>
<p class="section-desc text-center">A comprehensive evaluation of sovereign non-custodial cryptographic architecture versus hosted custodians, SaaS MPC providers, and settlement rings.</p>

<div class="table-responsive">
<table class="comparison-table">
<thead>
<tr>
<th style="width: 20%;">Dimension</th>
<th class="col-highlight" style="width: 24%;">Crypto Service Suite</th>
<th style="width: 19%;">BitGo</th>
<th style="width: 19%;">Fireblocks</th>
<th style="width: 18%;">Copper</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Operating Model</strong></td>
<td class="col-highlight"><span class="comp-badge-ok">NON-CUSTODIAL CORE</span><br>Self-hosted sovereign software engine; keys never leave institution</td>
<td><span class="comp-badge-warn">CUSTODIAL GATEWAY</span><br>Third-party trust model; custodial legal title</td>
<td><span class="comp-badge-warn">SAAS CO-SIGNER</span><br>Proprietary SaaS MPC; vendor key-shard dependency</td>
<td><span class="comp-badge-warn">CLEARING RING</span><br>Off-exchange collateral settlement ring</td>
</tr>
<tr>
<td><strong>Post-Quantum (PQ) Security</strong></td>
<td class="col-highlight"><span class="comp-badge-ok">FIPS 203/204 NATIVE</span><br>ML-KEM-768/1024, ML-DSA, SLH-DSA &amp; RFC 10024 hybrid</td>
<td><span class="comp-badge-warn">CLASSICAL ECC</span><br>ECDSA secp256k1; vulnerable to Shor's algorithm</td>
<td><span class="comp-badge-warn">CLASSICAL MPC</span><br>Pre-quantum threshold signatures (ECDSA/EdDSA)</td>
<td><span class="comp-badge-warn">CLASSICAL ENCLAVE</span><br>Pre-quantum hardware enclaves</td>
</tr>
<tr>
<td><strong>Execution Latency</strong></td>
<td class="col-highlight"><span class="comp-badge-ok">&lt; 1ms LOCAL WASM</span><br>In-process zero network overhead; deterministic latency</td>
<td><span class="comp-badge-warn">250ms &ndash; 1500ms</span><br>Cloud API round-trip plus internal queueing</td>
<td><span class="comp-badge-warn">300ms &ndash; 2000ms</span><br>MPC distributed quorum network latency</td>
<td><span class="comp-badge-warn">400ms &ndash; 2500ms</span><br>Multi-party signing ceremony round-trips</td>
</tr>
<tr>
<td><strong>Fee Structure</strong></td>
<td class="col-highlight"><span class="comp-badge-ok">0 BPS ASSET FEES</span><br>Open core; transparent multi-tenant billing hooks</td>
<td><span class="comp-badge-warn">5 &ndash; 25 BPS</span><br>Basis points on Assets Under Custody (AUC)</td>
<td><span class="comp-badge-warn">VOLUME SAAS</span><br>High monthly tier + transaction egress tolls</td>
<td><span class="comp-badge-warn">SETTLEMENT TOLLS</span><br>Clearing volume fee + network account fees</td>
</tr>
<tr>
<td><strong>Regulatory Compliance (DORA)</strong></td>
<td class="col-highlight"><span class="comp-badge-ok">DORA ARTICLE 13</span><br>Continuous CycloneDX 1.6 &amp; SPDX 3.0 CBOM telemetry</td>
<td><span class="comp-badge-warn">SOC 2 TYPE II</span><br>Static annual audit reports</td>
<td><span class="comp-badge-warn">SOC 2 / ISO 27001</span><br>Static periodic certifications</td>
<td><span class="comp-badge-warn">SOC 2 TYPE II</span><br>Static periodic certifications</td>
</tr>
<tr>
<td><strong>White Paper Analysis</strong></td>
<td class="col-highlight"><a href="research.html" class="btn btn-primary btn-sm">2027 Research White Paper &rarr;</a></td>
<td><a href="compare/bitgo.html" class="btn btn-outline btn-sm">BitGo Deep-Dive &rarr;</a></td>
<td><a href="compare/fireblocks.html" class="btn btn-outline btn-sm">Fireblocks Deep-Dive &rarr;</a></td>
<td><a href="compare/copper.html" class="btn btn-outline btn-sm">Copper Deep-Dive &rarr;</a></td>
</tr>
</tbody>
</table>
</div>
</div>
</section>

<section id="standards" class="section">
<div class="container">
<h2 class="section-title text-center">Cryptographic Standards &amp; Regulatory Alignment</h2>
<p class="section-desc text-center">Strict adherence to NIST Post-Quantum standards, IETF specifications, and international financial resilience mandates.</p>

<div class="table-responsive">
<table>
<thead>
<tr>
<th>Standard / Mandate</th>
<th>Algorithm / Focus</th>
<th>Parameter Sets</th>
<th>Module Implementation</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>NIST FIPS 203</strong></td>
<td>ML-KEM (Module-Lattice Key Encapsulation)</td>
<td><code>ML-KEM-512</code>, <code>ML-KEM-768</code>, <code>ML-KEM-1024</code></td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>NIST FIPS 204</strong></td>
<td>ML-DSA (Module-Lattice Digital Signatures)</td>
<td><code>ML-DSA-44</code>, <code>ML-DSA-65</code>, <code>ML-DSA-87</code></td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>NIST FIPS 205</strong></td>
<td>SLH-DSA (Stateless Hash-Based Signatures)</td>
<td><code>SLH-DSA-SHA2-128s</code>, <code>SLH-DSA-SHAKE-256f</code></td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>NIST FIPS 206</strong></td>
<td>FN-DSA (FALCON Lattice Signatures)</td>
<td><code>FALCON-512</code>, <code>FALCON-1024</code></td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>IETF RFC 10024</strong></td>
<td>Hybrid Post-Quantum Key Encapsulation</td>
<td><code>X25519MLKEM768</code>, <code>SecP256r1MLKEM768</code></td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>IETF RFC 9180</strong></td>
<td>HPKE (Hybrid Public Key Encryption)</td>
<td><code>DHKEM(X25519) + HKDF-SHA256 + ChaCha20Poly1305</code></td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>NIST SP 800-38D</strong></td>
<td>AES-GCM &amp; AES-GCM-SIV</td>
<td>Misuse-resistant authenticated envelope encryption</td>
<td><code>@sebastienrousseau/crypto-lib</code></td>
</tr>
<tr>
<td><strong>EU DORA Article 13/16</strong></td>
<td>Cryptographic Resilience &amp; CBOM Audit</td>
<td>Continuous CycloneDX 1.6 &amp; SPDX 3.0 generation</td>
<td><code>@sebastienrousseau/crypto-cbom</code></td>
</tr>
<tr>
<td><strong>US CNSA 2.0</strong></td>
<td>Commercial National Security Algorithm Suite</td>
<td>Transition timelines for federal and financial data</td>
<td>Entire Suite Architecture</td>
</tr>
<tr>
<td><strong>ISO 20022</strong></td>
<td>Financial Services Messaging Security</td>
<td>Field-level envelope encryption for payment records</td>
<td><code>@sebastienrousseau/crypto-server</code></td>
</tr>
</tbody>
</table>
</div>
</div>
</section>

<section id="quickstart" class="section">
<div class="container narrow">
<h2 class="section-title text-center">Institutional Implementation</h2>
<p class="section-desc text-center">Production-grade cryptographic integration in four lines of code.</p>

<h3>1. Package Installation</h3>

```bash
# Core cryptographic engine (zero runtime dependencies)
pnpm add @sebastienrousseau/crypto-lib

# Multi-cloud KMS adapter & envelope encryption
pnpm add @sebastienrousseau/crypto-kms

# Continuous Cryptographic Bill of Materials (DORA compliance)
pnpm add @sebastienrousseau/crypto-cbom
```

<h3>2. Post-Quantum Key Encapsulation (FIPS 203 ML-KEM-768)</h3>

```typescript
import {
  mlKemKeygen,
  mlKemEncapsulate,
  mlKemDecapsulate,
  wipeMemory,
} from "@sebastienrousseau/crypto-lib";

// Sovereign keypair generation
const receiver = mlKemKeygen(768);

// Sender encapsulates a 32-byte shared secret against receiver's public key
const { ciphertext, sharedSecret: senderSecret } = mlKemEncapsulate(
  768,
  receiver.publicKey,
);

// Receiver decapsulates ciphertext with private key
const { sharedSecret: receiverSecret } = mlKemDecapsulate(
  768,
  receiver.secretKey,
  ciphertext,
);

// Immediate memory zeroization of private key material
wipeMemory(receiver.secretKey);

console.log(
  "Post-quantum secret verified:",
  receiverSecret.every((b, i) => b === senderSecret[i]),
);
```

<h3>3. RFC 10024 Classical + PQ Hybrid Key Exchange</h3>

```typescript
import {
  hybridKemKeygen,
  hybridKemEncapsulate,
  hybridKemDecapsulate,
} from "@sebastienrousseau/crypto-lib";

// Dual X25519 + ML-KEM-768 keypair
const keys = hybridKemKeygen(768);

// Encapsulate classical and post-quantum secrets simultaneously
const encapsulation = hybridKemEncapsulate(
  768,
  keys.x25519PublicKey,
  keys.mlKemPublicKey,
);

// Decapsulate and derive single combined shared secret
const exchange = hybridKemDecapsulate(
  768,
  keys.x25519PrivateKey,
  keys.mlKemSecretKey,
  encapsulation.x25519EphemeralPublic,
  encapsulation.mlKemCiphertext,
);

console.log(
  "Hybrid key exchange established:",
  exchange.sharedSecret.length === 32,
);
```

<h3>4. Automated CBOM Generation (DORA Article 13 Export)</h3>

```typescript
import { generateCBOM } from "@sebastienrousseau/crypto-cbom";

const cbom = await generateCBOM({
  format: "cyclonedx-1.6",
  includeQuantumReadiness: true,
  doraScoring: true,
});

console.log(`DORA Compliance Score: ${cbom.complianceScore}%`);
console.log(`Algorithms Cataloged: ${cbom.components.length}`);
```

</div>
</section>

<section id="security" class="section">
<div class="container narrow">
<h2 class="section-title text-center">Security Invariants &amp; Verification Gates</h2>
<p class="section-desc text-center">Built for mission-critical banking and digital asset infrastructure.</p>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>Constant-Time Algorithmic Execution</h3>
<p>Every sensitive comparison, MAC evaluation, and decapsulation executes in strict constant time, completely preventing timing side-channel attacks and cache-timing leakage.</p>
</div>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>Deterministic Memory Zeroization</h3>
<p>The <code>wipeMemory()</code> primitive securely overwrites TypedArray buffers with zeros immediately following key operations, defeating core dumps, heap residual scanning, and cold-boot physical inspection.</p>
</div>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>100% Code Coverage Floor</h3>
<p>Continuous integration strictly rejects any pull request or commit that lowers statement, branch, function, or line test coverage below 100.00% across all 18 workspace packages.</p>
</div>

<div class="card" style="margin-bottom: 1.5rem;">
<h3>Continuous Cryptographic Bill of Materials (CBOM)</h3>
<p>Every commit generates machine-readable CycloneDX 1.6 and SPDX 3.0 manifests auditing algorithm lifecycle, key lengths, and quantum vulnerabilities under DORA Article 13 standards.</p>
</div>
</div>
</section>

<section id="faq" class="section">
<div class="container narrow">
<h2 class="section-title text-center">Institutional Architecture FAQ</h2>
<div class="faq-stack">
<div class="card">
<h3>Why are tier-1 institutions replacing hosted MPC custodians with non-custodial infrastructure?</h3>
<p>Hosted MPC and third-party custody introduce single points of failure, counterparty bankruptcy exposure, regulatory jurisdiction entanglements, and steep basis-point asset taxes (5 to 25 bps on AUC). Sovereign non-custodial infrastructure grants regulated entities 100% control over key lifecycle, deterministic latency, and compliance within their own audited infrastructure.</p>
</div>

<div class="card">
<h3>How does Crypto Service Suite protect against Store Now, Decrypt Later (SNDL) attacks?</h3>
<p>Adversaries are actively capturing and archiving encrypted financial communications today, intending to decrypt them when cryptanalytically relevant quantum computers (CRQCs) arrive. Implementing NIST FIPS 203 (ML-KEM) and RFC 10024 hybrid encapsulation today renders captured traffic mathematically undecryptable by both classical and quantum adversaries.</p>
</div>

<div class="card">
<h3>How does the suite satisfy European Union DORA Article 13 and CRA requirements?</h3>
<p>DORA mandates continuous visibility, testing, and cryptographic resilience across ICT infrastructure. <code>@sebastienrousseau/crypto-cbom</code> automates the discovery, categorization, and scoring of every cryptographic primitive in your application, exporting standard CycloneDX 1.6 CBOMs required by European supervisory authorities (EBA, ESMA, EIOPA).</p>
</div>

<div class="card">
<h3>Can these packages run across serverless edge and browser environments?</h3>
<p>Yes. The entire suite is written in pure TypeScript and WebAssembly with zero platform-specific C/C++ native addons. <code>@sebastienrousseau/crypto-edge</code> provides zero-latency bindings for Cloudflare Workers, Deno, and Vercel Edge, while <code>@sebastienrousseau/crypto-react</code> and <code>@sebastienrousseau/crypto-vue</code> support client-side operations.</p>
</div>
</div>
</div>
</section>

<!-- Pre-Footer Turquoise Banner (Copper + SWIFT Standard) -->
<section class="cta-banner-section">
  <div class="container">
    <div class="cta-banner">
      <div class="cta-banner-content">
        <h2>Access Markets <span class="serif">Through One Connected Operating Core</span></h2>
        <p>Crypto Service brings you the sovereign, mathematically verified infrastructure for accessing, moving, and managing cryptographic assets across markets with zero counterparty risk.</p>
        <a class="btn-dark-pill" href="https://github.com/sebastienrousseau/crypto-service" target="_blank" rel="noopener">Explore Specifications &rarr;</a>
      </div>
      <div class="cta-banner-graphic" aria-hidden="true">
        <svg viewBox="0 0 240 240" width="200" height="200" fill="none" stroke="#07090e" stroke-width="1.2" stroke-opacity="0.6">
          <circle cx="120" cy="120" r="95" />
          <ellipse cx="120" cy="120" rx="95" ry="35" />
          <ellipse cx="120" cy="120" rx="35" ry="95" />
          <circle cx="180" cy="85" r="4" fill="#07090e" />
          <circle cx="65" cy="155" r="4" fill="#07090e" />
        </svg>
      </div>
    </div>
  </div>
</section>
