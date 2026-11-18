// SPDX-License-Identifier: Apache-2.0 OR MIT
/**
 * @fileoverview Monorepo Documentation Hub Builder for docs.crypto-service.co
 * Compiles the Crypto Service documentation theme using local SSG (Rust static site generator)
 * and aggregates all 18 packages with their interactive TypeDoc API references.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runIfMain } from "./lib/cli.mjs";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** The path `which ssg` prints, or "" when it finds none. */
function whichSsg(exec) {
  try {
    return exec("which ssg", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** The ssg binary: $SSG_BIN, then `which ssg`, then the usual installs. */
export function findSsgBinary(env, exec) {
  if (env.SSG_BIN && fs.existsSync(env.SSG_BIN)) {
    return env.SSG_BIN;
  }
  const home = env.HOME || "";
  const candidatePaths = [
    whichSsg(exec),
    path.join(home, ".local/share/mise/installs/cargo-ssg/0.0.76/bin/ssg"),
    path.join(home, ".cargo/bin/ssg"),
    "/usr/local/bin/ssg",
    "/opt/homebrew/bin/ssg",
  ];
  return candidatePaths.find((c) => c && fs.existsSync(c)) ?? "ssg";
}

/** Copy `dir` (when it exists) into each of `targets`. */
function copyInto(dir, targets) {
  if (!fs.existsSync(dir)) return;
  for (const target of targets) fs.cpSync(dir, target, { recursive: true });
}

/** A package's name, version and description from its manifest. */
function packageMetaOf(pkg, pkgJsonPath) {
  let description = "Package documentation and API reference.";
  let version = "0.0.4";
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      description = data.description || description;
      version = data.version || version;
    } catch {
      // ignore
    }
  }
  return { name: pkg, version, description };
}

/** Copy each package's TypeDoc output to _site/packages/<pkg>. */
function copyPackageDocs(packagesDir, siteDir, log) {
  const packages = fs.readdirSync(packagesDir).filter((f) => {
    return fs.statSync(path.join(packagesDir, f)).isDirectory();
  });
  const packageMeta = [];
  for (const pkg of packages) {
    const pkgDir = path.join(packagesDir, pkg);
    const pkgDocsDir = path.join(pkgDir, "docs");
    packageMeta.push(packageMetaOf(pkg, path.join(pkgDir, "package.json")));
    if (fs.existsSync(pkgDocsDir)) {
      fs.cpSync(pkgDocsDir, path.join(siteDir, "packages", pkg), {
        recursive: true,
      });
      log(`Copied TypeDoc docs for ${pkg} -> /packages/${pkg}/`);
    }
  }
  return packageMeta;
}

/**
 * Backwards compatibility: copy crypto-lib docs to root so direct links
 * like /functions/... still resolve.
 */
function copyRootDocs(cryptoLibDocs, siteDir) {
  if (!fs.existsSync(cryptoLibDocs)) return;
  for (const item of fs.readdirSync(cryptoLibDocs)) {
    if (item === "index.html") {
      fs.copyFileSync(
        path.join(cryptoLibDocs, item),
        path.join(siteDir, "crypto-lib.html"),
      );
    } else {
      // Merge without overwriting: the portal's own files win, and
      // TypeDoc's assets/ (style.css, main.js) still land next to the
      // portal's assets/ so the root-level pages keep their styling.
      fs.cpSync(path.join(cryptoLibDocs, item), path.join(siteDir, item), {
        recursive: true,
        force: false,
      });
    }
  }
}

/**
 * Assemble _site under `root` from ssg's public/ output, the website's
 * images and assets, and every package's TypeDoc output; returns the
 * metadata of each package indexed.
 */
export function assembleSite(root, log = console.log) {
  const siteDir = path.join(root, "_site");
  const publicDir = path.join(root, "public");
  const packagesDir = path.join(root, "packages");
  const websiteDir = path.join(root, "website");

  if (fs.existsSync(siteDir)) {
    fs.rmSync(siteDir, { recursive: true, force: true });
  }
  fs.mkdirSync(siteDir, { recursive: true });

  // Copy SSG generated output from public/ to _site/
  copyInto(publicDir, [siteDir]);
  // Copy website/images and website/assets to public/ and _site/
  for (const sub of ["images", "assets"]) {
    copyInto(path.join(websiteDir, sub), [
      path.join(publicDir, sub),
      path.join(siteDir, sub),
    ]);
  }

  // Ensure CNAME and .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(siteDir, "CNAME"), "docs.crypto-service.co\n");
  fs.writeFileSync(path.join(siteDir, ".nojekyll"), "");

  const packageMeta = copyPackageDocs(packagesDir, siteDir, log);
  copyRootDocs(path.join(packagesDir, "crypto-lib", "docs"), siteDir);

  // The root index.html is the portal home rendered by ssg (PRISM layouts in
  // website/_layouts). It used to be overwritten with a redirect to
  // https://crypto-service.co/ecosystem/, which made the "Docs" link on
  // crypto-service.co bounce straight back to the site; the portal now
  // serves its own home, which links to the ecosystem page.
  return packageMeta;
}

/** Build TypeDoc and the portal, then assemble _site; returns the exit code. */
export function main(
  _argv,
  {
    root = ROOT_DIR,
    exec = execSync,
    env = process.env,
    log = console.log,
    error = console.error,
  } = {},
) {
  log("==> 1. Building TypeDoc documentation for all workspace packages...");
  exec("pnpm -r run docs", { cwd: root, stdio: "inherit" });

  log("==> 2. Compiling Crypto Service theme with local SSG...");
  const ssgBin = findSsgBinary(env, exec);
  log(`Using SSG binary: ${ssgBin}`);

  try {
    exec(`${ssgBin} build -f website/ssg.toml`, {
      cwd: root,
      stdio: "inherit",
    });
  } catch (caught) {
    error("Failed to compile with SSG:", caught);
    return 1;
  }

  log("==> 3. Assembling final site artifact at _site...");
  const packageMeta = assembleSite(root, log);

  log("==> Unified Crypto Service documentation portal assembled at _site!");
  log(`==> Total workspace packages indexed: ${packageMeta.length}`);
  return 0;
}

await runIfMain(import.meta.url, main, { name: "build-docs" });
