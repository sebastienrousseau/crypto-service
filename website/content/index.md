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

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<!-- Layered Monorepo Architecture Directory -->
<section id="packages" class="section">
  <div class="container">
    <div class="swift-section-header text-center">
      <span class="section-eyebrow font-mono">18 MODULAR WORKSPACE PACKAGES</span>
      <h2 class="swift-section-title">The Lockstep Cryptographic Monorepo</h2>
      <p class="section-desc">
        A four-layer institutional architecture released in lockstep v0.0.4 with zero cyclic dependencies, 100% test coverage floor, and interactive TypeDoc API references.
      </p>
    </div>

    <!-- Layer 1 -->
    <div class="package-layer-group">
      <h3 class="package-layer-title">Layer 1: Cryptographic Foundation &amp; WASM Acceleration</h3>
      <div class="grid-2x2">
        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-lib/">@sebastienrousseau/crypto-lib</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Core cryptographic primitives: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), RFC 10024 hybrid KEMs, and memory zeroization.</p>
          <a href="packages/crypto-lib/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>

        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-wasm/">@sebastienrousseau/crypto-wasm</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Pre-compiled WebAssembly SIMD micro-kernels delivering deterministic sub-millisecond execution across edge and serverless runtimes.</p>
          <a href="packages/crypto-wasm/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>
      </div>
    </div>

    <!-- Layer 2 -->
    <div class="package-layer-group">
      <h3 class="package-layer-title">Layer 2: Infrastructure &amp; Hardware Key Management</h3>
      <div class="grid-2x2">
        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-kms/">@sebastienrousseau/crypto-kms</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Multi-cloud KMS abstraction layer supporting AWS CloudHSM, Google Cloud EKM, Azure Managed HSM, and on-premises PKCS#11 hardware.</p>
          <a href="packages/crypto-kms/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>

        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-edge/">@sebastienrousseau/crypto-edge</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Ultra-low-latency cryptographic micro-enclaves optimized for Cloudflare Workers, Fastly Compute, and AWS Lambda@Edge runtimes.</p>
          <a href="packages/crypto-edge/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>
      </div>
    </div>

    <!-- Layer 3 -->
    <div class="package-layer-group">
      <h3 class="package-layer-title">Layer 3: Protocol Servers &amp; Enterprise Gateways</h3>
      <div class="grid-2x2">
        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-server/">@sebastienrousseau/crypto-server</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Hardened, high-throughput gRPC and JSON-RPC daemon providing microservice envelope signing and key derivation services.</p>
          <a href="packages/crypto-server/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>

        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-sdk/">@sebastienrousseau/crypto-sdk</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Type-safe institutional client SDK with automatic connection pooling, circuit breakers, and zero-allocation signing pipelines.</p>
          <a href="packages/crypto-sdk/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>
      </div>
    </div>

    <!-- Layer 4 -->
    <div class="package-layer-group">
      <h3 class="package-layer-title">Layer 4: Regulatory Auditing &amp; AI Integration</h3>
      <div class="grid-2x2">
        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-cbom/">@sebastienrousseau/crypto-cbom</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Automated Cryptographic Bill of Materials (CBOM) generator conforming to CycloneDX 1.6 for continuous DORA Article 13 compliance.</p>
          <a href="packages/crypto-cbom/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>

        <div class="card">
          <div class="package-card-header">
            <h4><a href="packages/crypto-mcp/">@sebastienrousseau/crypto-mcp</a></h4>
            <span class="version-tag">v0.0.4</span>
          </div>
          <p>Model Context Protocol (MCP) server equipping autonomous AI coding agents with verifiable cryptographic tool calling.</p>
          <a href="packages/crypto-mcp/" class="swift-arrow-link">Explore API Reference &gt;</a>
        </div>
      </div>
    </div>

  </div>
</section>
