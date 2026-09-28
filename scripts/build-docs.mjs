// SPDX-License-Identifier: Apache-2.0 OR MIT
/**
 * @fileoverview Monorepo Documentation Hub Builder for docs.crypto-service.co
 * Compiles the Voxt documentation theme using local SSG (Rust static site generator)
 * and aggregates all 18 packages with their interactive TypeDoc API references.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT_DIR, "_site");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");
const WEBSITE_DIR = path.join(ROOT_DIR, "website");

function findSsgBinary() {
  if (process.env.SSG_BIN && fs.existsSync(process.env.SSG_BIN)) {
    return process.env.SSG_BIN;
  }

  try {
    const whichOut = execSync("which ssg", { encoding: "utf8" }).trim();
    if (whichOut && fs.existsSync(whichOut)) {
      return whichOut;
    }
  } catch {
    // continue search
  }

  const candidatePaths = [
    path.join(process.env.HOME || "", ".local/share/mise/installs/cargo-ssg/0.0.63/bin/ssg"),
    path.join(process.env.HOME || "", ".cargo/bin/ssg"),
    "/usr/local/bin/ssg",
    "/opt/homebrew/bin/ssg"
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "ssg";
}

console.log("==> 1. Building TypeDoc documentation for all workspace packages...");
execSync("pnpm -r run docs", { cwd: ROOT_DIR, stdio: "inherit" });

console.log("==> 2. Compiling Voxt theme with local SSG...");
const ssgBin = findSsgBinary();
console.log(`Using SSG binary: ${ssgBin}`);

try {
  execSync(`${ssgBin} build -f website/ssg.toml`, { cwd: ROOT_DIR, stdio: "inherit" });
} catch (error) {
  console.error("Failed to compile with SSG:", error);
  process.exit(1);
}

console.log("==> 3. Assembling final site artifact at _site...");
if (fs.existsSync(SITE_DIR)) {
  fs.rmSync(SITE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SITE_DIR, { recursive: true });

// Copy SSG generated output from public/ to _site/
if (fs.existsSync(PUBLIC_DIR)) {
  fs.cpSync(PUBLIC_DIR, SITE_DIR, { recursive: true });
}

// Copy website/images to _site/images
const imagesDir = path.join(WEBSITE_DIR, "images");
if (fs.existsSync(imagesDir)) {
  fs.cpSync(imagesDir, path.join(SITE_DIR, "images"), { recursive: true });
}

// Copy website/assets to _site/assets
const assetsDir = path.join(WEBSITE_DIR, "assets");
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(SITE_DIR, "assets"), { recursive: true });
}

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
    console.log(`Copied TypeDoc docs for ${pkg} -> /packages/${pkg}/`);
  }
}

// Backwards compatibility: copy crypto-lib docs to root so direct links like /functions/... still resolve
const cryptoLibDocs = path.join(PACKAGES_DIR, "crypto-lib", "docs");
if (fs.existsSync(cryptoLibDocs)) {
  for (const item of fs.readdirSync(cryptoLibDocs)) {
    if (item === "index.html") {
      fs.copyFileSync(path.join(cryptoLibDocs, item), path.join(SITE_DIR, "crypto-lib.html"));
    } else {
      const destPath = path.join(SITE_DIR, item);
      if (!fs.existsSync(destPath)) {
        fs.cpSync(path.join(cryptoLibDocs, item), destPath, { recursive: true });
      }
    }
  }
}

console.log("==> Unified Voxt documentation portal assembled at _site!");
console.log(`==> Total workspace packages indexed: ${packageMeta.length}`);
