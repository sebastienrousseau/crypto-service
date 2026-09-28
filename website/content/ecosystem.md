---
title: "The Crypto Service Ecosystem — 18 Workspace Packages & Enterprise Modules"
description: "Explore the comprehensive Crypto Service monorepo architecture: 18 lockstep packages spanning post-quantum cryptographic primitives, CaaS servers, KMS brokers, edge runtimes, and developer tooling."
eyebrow: "Monorepo Architecture & Modules"
headline: "An Integrated Post-Quantum Ecosystem Built in Lockstep"
lead: "From bare-metal cryptographic primitives to enterprise KMS orchestration, AI agent protocols, and high-performance CaaS servers: all 18 packages move together with a 100% test coverage floor."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2026-09-28"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Curved electric teal and amber light trails over a dark obsidian background"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<section class="ecosystem-intro">
  <h2>The 18 Monorepo Workspace Modules</h2>
  <p class="lead-text">
    Crypto Service Suite is architected as an institutional-grade TypeScript monorepo governed under a strict lockstep release model. Every module undergoes automated cross-package integration verification, deterministic FIPS vector validation, and fuzz testing before deployment.
  </p>
</section>

<div class="ecosystem-category-section">
  <h3 class="category-heading">Core Cryptographic Primitives &amp; Runtimes</h3>
  <div class="packages-grid">
    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">FIPS 203 / 204</span>
        <h4><a href="{{site_path}}packages/crypto-lib/">@sebastienrousseau/crypto-lib</a></h4>
      </div>
      <p>Zero-dependency, pure post-quantum lattice primitives, ML-KEM key encapsulation, ML-DSA &amp; SLH-DSA signatures, and CNSA 2.0 dual-layer hybrid schemes.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">CaaS Engine</span>
        <h4><a href="{{site_path}}packages/crypto-server/">@sebastienrousseau/crypto-server</a></h4>
      </div>
      <p>High-throughput sovereign Cryptography-as-a-Service HTTP/2 and gRPC daemon delivering 100,000+ ops/sec with sub-millisecond signing latency.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">DevOps &amp; Ops</span>
        <h4><a href="{{site_path}}packages/crypto-cli/">@sebastienrousseau/crypto-cli</a></h4>
      </div>
      <p>Command-line toolchain for key generation, FIPS validation, envelope signing, CBOM generation, and cryptographic infrastructure verification.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Client Runtimes</span>
        <h4><a href="{{site_path}}packages/crypto-sdk/">@sebastienrousseau/crypto-sdk</a></h4>
      </div>
      <p>Universal client library with automated failover, connection pooling, and client-side signature verification across Node.js, Bun, and browser contexts.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

  </div>
</div>

<div class="ecosystem-category-section">
  <h3 class="category-heading">Enterprise Connectors &amp; Infrastructure</h3>
  <div class="packages-grid">
    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Hardware &amp; Cloud</span>
        <h4><a href="{{site_path}}packages/crypto-kms/">@sebastienrousseau/crypto-kms</a></h4>
      </div>
      <p>Unified KMS broker abstracting AWS CloudHSM, Google Cloud EKM, Azure Key Vault, HashiCorp Vault, and PKCS#11 hardware security modules.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Edge Computing</span>
        <h4><a href="{{site_path}}packages/crypto-edge/">@sebastienrousseau/crypto-edge</a></h4>
      </div>
      <p>Optimized WebAssembly-accelerated cryptographic engine tailored for Cloudflare Workers, Fastly Compute, and Vercel Edge networks.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Microservices</span>
        <h4><a href="{{site_path}}packages/crypto-api/">@sebastienrousseau/crypto-api</a></h4>
      </div>
      <p>Declarative RESTful routing, OpenAPI 3.1 contracts, and institutional webhook notification pipelines with replay attack protection.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Security Filter</span>
        <h4><a href="{{site_path}}packages/crypto-middleware/">@sebastienrousseau/crypto-middleware</a></h4>
      </div>
      <p>Zero-overhead Express, Fastify, and NestJS interceptors performing automated request decryption, payload non-repudiation, and audit logging.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

  </div>
</div>

<div class="ecosystem-category-section">
  <h3 class="category-heading">Database Envelope Encryption &amp; ORM Extensions</h3>
  <div class="packages-grid">
    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">ORM Middleware</span>
        <h4><a href="{{site_path}}packages/crypto-prisma/">@sebastienrousseau/crypto-prisma</a></h4>
      </div>
      <p>Transparent column-level encryption extensions for Prisma ORM, enabling encrypted search, blind indexing, and automated data key rotation.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Enterprise Database</span>
        <h4><a href="{{site_path}}packages/crypto-typeorm/">@sebastienrousseau/crypto-typeorm</a></h4>
      </div>
      <p>Custom TypeORM transformers, decorators, and subscribers for field-level envelope encryption backed by hardware key escrow.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Assembly Primitives</span>
        <h4><a href="{{site_path}}packages/crypto-wasm/">@sebastienrousseau/crypto-wasm</a></h4>
      </div>
      <p>Compiled WebAssembly binary module ensuring constant-time cryptographic primitives and memory isolation in untrusted environments.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Supply Chain</span>
        <h4><a href="{{site_path}}packages/crypto-cbom/">@sebastienrousseau/crypto-cbom</a></h4>
      </div>
      <p>CycloneDX-compliant Cryptographic Bill of Materials generator providing full automated inventory of algorithms, key lengths, and quantum risks.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

  </div>
</div>

<div class="ecosystem-category-section">
  <h3 class="category-heading">AI Tooling, Developer Experience &amp; UI Libraries</h3>
  <div class="packages-grid">
    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">AI Protocol</span>
        <h4><a href="{{site_path}}packages/crypto-mcp/">@sebastienrousseau/crypto-mcp</a></h4>
      </div>
      <p>Model Context Protocol server connecting LLMs, AI agents, and IDE assistants to secure cryptographic verification and analysis tools.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">IDE Analysis</span>
        <h4><a href="{{site_path}}packages/crypto-lsp/">@sebastienrousseau/crypto-lsp</a></h4>
      </div>
      <p>Language Server Protocol implementation detecting vulnerable algorithms (RSA, ECC), weak entropy seeds, and recommending PQC refactors.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">UI Hooks</span>
        <h4><a href="{{site_path}}packages/crypto-react/">@sebastienrousseau/crypto-react</a></h4>
      </div>
      <p>Idiomatic React hooks and providers for client-side cryptographic key generation, WebCrypto bindings, and zero-knowledge proofs.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">UI Composables</span>
        <h4><a href="{{site_path}}packages/crypto-vue/">@sebastienrousseau/crypto-vue</a></h4>
      </div>
      <p>Vue 3 composables for reactive cryptographic state management, message authentication, and institutional user session management.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Quality Assurance</span>
        <h4><a href="{{site_path}}packages/crypto-testing/">@sebastienrousseau/crypto-testing</a></h4>
      </div>
      <p>Comprehensive synthetic test fixtures, known-answer test vectors (KAT), and property-based fuzzing utilities across all algorithms.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

    <div class="package-card">
      <div class="package-header">
        <span class="package-badge font-mono">Performance</span>
        <h4><a href="{{site_path}}packages/crypto-benchmarks/">@sebastienrousseau/crypto-benchmarks</a></h4>
      </div>
      <p>Standardized micro-benchmarks comparing classical vs post-quantum latency, memory allocation overhead, and CPU cycle consumption.</p>
      <div class="package-meta font-mono">Version: 0.0.4 • Floor: 100% Coverage</div>
    </div>

  </div>
</div>
