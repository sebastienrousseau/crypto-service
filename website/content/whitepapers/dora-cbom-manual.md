---
title: "DORA Article 13 & CBOM Compliance Manual: Continuous Cryptographic Auditing"
description: "Compliance implementation white paper providing step-by-step guidance for European Union Digital Operational Resilience Act (DORA) compliance, CycloneDX 1.6 Cryptographic Bill of Materials (CBOM) generation, and continuous CI/CD deprecation audits."
eyebrow: "Regulatory Audit Manual · DORA & CBOM"
headline: "DORA Article 13 & CBOM Compliance Manual: Continuous Cryptographic Auditing"
lead: "Step-by-step regulatory guidance for European Union Digital Operational Resilience Act compliance, automated CycloneDX 1.6 CBOM generation, and continuous curve deprecation audits."
layout: page
author: "Sebastien Rousseau"
name: "Crypto Service"
language: en-GB
date: "2026-09-28"
logo_alt: "Crypto Service Suite logo"
light_trace_alt: "Pastel morphing gradient with organic glass droplets"
---

<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<div class="whitepaper-doc-header">
<div class="book-meta">Published September 28, 2026 · Sebastien Rousseau · Governance, Risk &amp; Compliance Directorate</div>
<div class="whitepaper-doc-meta font-mono">
<span>Document ID: CSS-COMP-2026-005</span>
<span>Classification: Regulatory Audit Manual &amp; Implementation Guide</span>
<span>Regulatory Scope: EU DORA (Regulation 2022/2554) Articles 13 &amp; 14 · EBA RTS on ICT Security</span>
<span>Standard: CycloneDX v1.6 CBOM Extension · SPDX 3.0</span>
</div>
</div>

<div class="whitepaper-doc-abstract">
<h3>Executive Abstract</h3>
<p>
The European Union <strong>Digital Operational Resilience Act (DORA)</strong>, legally enforceable across all EU financial entities and critical ICT third-party providers, fundamentally alters how financial institutions govern cryptographic algorithms. Article 13 mandates that institutions enforce documented cryptographic policies, maintain continuous visibility over key management lifecycles, and guarantee the operational resilience of cryptographic coprocessors under stress.
</p>
<p>
Manual, point-in-time cryptographic spreadsheets are no longer legally defensible before European Supervisory Authorities (ESAs: EBA, ESMA, EIOPA). Financial entities must deploy automated, continuous discovery mechanisms.
</p>
<p>
This implementation manual specifies an automated compliance framework utilizing the <strong>CycloneDX 1.6 Cryptographic Bill of Materials (CBOM)</strong> standard and Crypto Service `@sebastienrousseau/crypto-cbom`. It details automated scanning of source code, container registries, TLS termination points, and database schemas in CI/CD pipelines, establishing an auditable trail that detects deprecated classical algorithms (RSA-1024, 3DES, SHA-1, weak ECC curves) before regulatory auditors issue non-compliance sanctions.
</p>
</div>

<div class="research-toc-box">
<h3>Table of Contents</h3>
<ol>
<li><a href="#dora-mandates">1. Regulatory Requirements: Deconstructing DORA Articles 13 &amp; 14</a></li>
<li><a href="#cbom-anatomy">2. The Anatomy of a CycloneDX 1.6 Cryptographic Bill of Materials (CBOM)</a></li>
<li><a href="#automated-pipeline">3. Integrating CBOM Auditing into Enterprise CI/CD Pipelines</a></li>
<li><a href="#deprecation-rules">4. Classical Primitive Deprecation Rules &amp; Vulnerability Scanning</a></li>
<li><a href="#third-party-risk">5. Managing Critical Third-Party ICT Provider Cryptographic Risks</a></li>
<li><a href="#evidence-generation">6. Generating Regulatory Compliance Packages for ESA Auditors</a></li>
<li><a href="#checklist">7. Practical 30-Day DORA Article 13 Readiness Checklist</a></li>
</ol>
</div>

<hr class="section-divider">

<section id="dora-mandates" class="research-section">
<h2>1. Regulatory Requirements: Deconstructing DORA Articles 13 &amp; 14</h2>
<p class="lead-text">
DORA represents a paradigm shift from reactive incident reporting to proactive operational resilience:
</p>
<ul>
<li><strong>Article 13(1) (Cryptographic Architecture):</strong> Financial entities must ensure data-in-transit, data-in-use, and data-at-rest are protected by leading-edge cryptographic mechanisms commensurate with classification levels.</li>
<li><strong>Article 13(2) (Key Lifecycle Governance):</strong> Entities must establish cryptographic key management policies guaranteeing automated generation, secure storage in FIPS 140-3 validated HSMs, documented rotation intervals, and provable destruction.</li>
<li><strong>Article 14 (Operational Resilience &amp; Continuity):</strong> Systems must sustain zero service degradation during key rotation events, cryptographic migration, or regional cloud failures.</li>
</ul>
<p>
Failure to satisfy Article 13 exposes institutions to administrative penalties of up to 1% of average daily global turnover, alongside compulsory remediation orders.
</p>
</section>

<hr class="section-divider">

<section id="cbom-anatomy" class="research-section">
<h2>2. The Anatomy of a CycloneDX 1.6 Cryptographic Bill of Materials (CBOM)</h2>
<p>
A <strong>Cryptographic Bill of Materials (CBOM)</strong> is an unambiguous, machine-readable inventory of all cryptographic assets, primitives, certificates, protocols, and algorithms deployed across an enterprise:
</p>
<pre><code>{
  "$schema": "http://cyclonedx.org/schema/bom-1.6.schema.json",
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:7f2d1968-d01a-45b9-ab28-4fe7ef3ed275",
  "version": 1,
  "metadata": {
    "timestamp": "2026-09-28T09:14:00Z",
    "component": {
      "name": "@sebastienrousseau/crypto-server",
      "version": "0.0.4",
      "type": "application"
    }
  },
  "cryptoProperties": {
    "assetType": "algorithm",
    "algorithmProperties": {
      "primitive": "kem",
      "parameterSetIdentifier": "ML-KEM-768",
      "curve": "Module-LWE",
      "executionEnvironment": "software-wasm-simd",
      "implementationPlatform": "x86_64, aarch64",
      "certificationLevel": "FIPS-203",
      "cryptoFunctions": ["keygen", "encapsulate", "decapsulate"],
      "classicalSecurityLevel": 192,
      "nistQuantumSecurityLevel": 3
    }
  }
}</code></pre>
</section>

<hr class="section-divider">

<section id="automated-pipeline" class="research-section">
<h2>3. Integrating CBOM Auditing into Enterprise CI/CD Pipelines</h2>
<p class="lead-text">
Crypto Service provides `@sebastienrousseau/crypto-cbom`, a zero-dependency static analysis and SBOM synthesis tool designed for GitHub Actions, GitLab CI, and Jenkins:
</p>
<pre><code># GitHub Actions Workflow: Continuous Cryptographic Audit
name: DORA Cryptographic Audit
on: [push, pull_request]

jobs:
cbom-audit:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - name: Setup Node.js
uses: actions/setup-node@v4
with:
node-version: 22 - name: Run Crypto Service CBOM Scanner
run: |
npx @sebastienrousseau/crypto-cbom audit \
--dir src/ \
--fail-on-deprecated \
--output cbom.cdx.json \
--report-format sarif</code></pre>
<p>
If a pull request introduces deprecated RSA keys, legacy MD5 hashes, or unapproved elliptic curves, the pipeline terminates immediately with SARIF annotations pinpointing the exact line number.
</p>
</section>

<hr class="section-divider">

<section id="deprecation-rules" class="research-section">
<h2>4. Classical Primitive Deprecation Rules &amp; Vulnerability Scanning</h2>
<div class="table-responsive">
<table class="comparison-table">
<thead>
<tr>
<th>Cryptographic Primitive</th>
<th>Current Regulatory Status</th>
<th>DORA Compliance Classification</th>
<th>Mandatory Replacement Standard</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>RSA &lt; 2048-bit</strong></td>
<td>Strictly Forbidden (Compromised)</td>
<td><span class="comp-badge-crit">NON-COMPLIANT</span></td>
<td>NIST FIPS 204 (ML-DSA-65)</td>
</tr>
<tr>
<td><strong>RSA-2048 / 3072</strong></td>
<td>Transitional Deprecation</td>
<td><span class="comp-badge-warn">TRANSITIONAL</span></td>
<td>Dual-Layer Hybrid (RFC 10024)</td>
</tr>
<tr>
<td><strong>ECDSA P-256 (secp256r1)</strong></td>
<td>Vulnerable to HNDL</td>
<td><span class="comp-badge-warn">TRANSITIONAL</span></td>
<td>Hybrid X25519 + ML-KEM-768</td>
</tr>
<tr>
<td><strong>3DES / RC4 / DES</strong></td>
<td>Cryptanalytically Broken</td>
<td><span class="comp-badge-crit">NON-COMPLIANT</span></td>
<td>AES-256-GCM Authenticated Encryption</td>
</tr>
<tr>
<td><strong>SHA-1 / MD5</strong></td>
<td>Collision Resistance Failed</td>
<td><span class="comp-badge-crit">NON-COMPLIANT</span></td>
<td>SHA-256 / SHA-512 / SHAKE-256</td>
</tr>
<tr>
<td><strong>ML-KEM-768 / 1024</strong></td>
<td>NIST Standardized (FIPS 203)</td>
<td><span class="comp-badge-pass">FULL COMPLIANCE</span></td>
<td>Primary Post-Quantum Standard</td>
</tr>
</tbody>
</table>
</div>
</section>

<hr class="section-divider">

<section id="third-party-risk" class="research-section">
<h2>5. Managing Critical Third-Party ICT Provider Cryptographic Risks</h2>
<p>
Under DORA Chapter V (Managing of ICT Third-Party Risk), financial institutions bear strict accountability for the security of outsourced technology providers.
</p>
<p>
When contracting with payment processors, core banking SaaS platforms, and cloud providers, financial entities must demand:
</p>
<ul>
<li>A valid CycloneDX 1.6 CBOM updated with every major software release.</li>
<li>Contractual Service Level Agreements (SLAs) specifying post-quantum migration milestones matching the institution's own regulatory commitments.</li>
<li>Demonstrated ability to rotate Key Encryption Keys (KEKs) across multi-cloud partitions without downtime.</li>
</ul>
</section>

<hr class="section-divider">

<section id="evidence-generation" class="research-section">
<h2>6. Generating Regulatory Compliance Packages for ESA Auditors</h2>
<p>
Crypto Service Suite generates an automated **Regulatory Evidence Bundle**:
</p>
<ul>
<li>`cbom.cdx.json`: The machine-verifiable CycloneDX 1.6 inventory.</li>
<li>`audit-report.json`: Cryptographic health score, deprecated primitive counts, and quantum-readiness percentage across all inspected repos.</li>
<li>`key-rotation-proofs.json`: Cryptographic zero-knowledge proofs confirming that master keys were rotated according to policy without manual engineer intervention.</li>
</ul>
</section>

<hr class="section-divider">

<section id="checklist" class="research-section">
<h2>7. Practical 30-Day DORA Article 13 Readiness Checklist</h2>
<ol>
<li><strong>Day 1–7: Automated Discovery:</strong> Run `@sebastienrousseau/crypto-cbom` across all internal microservice repositories and compile the baseline CBOM catalog.</li>
<li><strong>Day 8–14: Deprecation Remediation:</strong> Remove all remaining instances of 3DES, MD5, and RSA-1024 from legacy configurations.</li>
<li><strong>Day 15–21: Sovereign CaaS Evaluation:</strong> Deploy an internal `@sebastienrousseau/crypto-server` daemon in your development VPC to benchmark latency and verify mTLS authentication.</li>
<li><strong>Day 22–30: Executive Board Reporting:</strong> Present the verified CBOM report and DORA Article 13 readiness roadmap to the Board Risk Committee.</li>
</ol>

<div class="whitepaper-citation">
<strong>Preferred Citation:</strong><br>
Rousseau, S. (2026). <em>DORA Article 13 &amp; CBOM Compliance Manual: Continuous Cryptographic Auditing</em>. Crypto Service Governance Series. Reference: CSS-COMP-2026-005. Canonical URI: https://docs.crypto-service.co/whitepapers/dora-cbom-manual/
</div>

<div class="book-actions">
<a class="pill primary" href="/standards/#cbom">Explore CycloneDX CBOM Tooling</a>
<a class="pill ghost" href="/whitepapers/">Back to Publications Shelf</a>
</div>
</section>
