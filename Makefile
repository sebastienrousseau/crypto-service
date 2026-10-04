#       ____                  _          ____                  _
#      / ___|_ __ _   _ _ __ | |_ ___   / ___|  ___ _ ____   _(_) ___ ___
#     | |   | '__| | | | '_ \| __/ _ \  \___ \ / _ \ '__\ \ / / |/ __/ _ \
#     | |___| |  | |_| | |_) | || (_) |  ___) |  __/ |   \ V /| | (_|  __/
#      \____|_|   \__, | .__/ \__\___/  |____/ \___|_|    \_/ |_|\___\___|
#                 |___/|_|
# Crypto Service Suite
# https://crypto-service.co/
#
# Copyright (c) Sebastien Rousseau 2022-2026. All rights reserved
# SPDX-License-Identifier: Apache-2.0 OR MIT
#

.DEFAULT_GOAL := help

#
# Container & Development tasks
#

# @HELP Start interactive tsdev container with 4-pane TMUX IDE
dev: up

# @HELP Start the tsdev 4-pane TMUX IDE container
up:
	@command -v docker >/dev/null 2>&1 && docker run --rm -it -v "$$(pwd):/work" -w /work ghcr.io/sebastienrousseau/tsdev:latest || echo "Docker not available"

# @HELP Start WebTTY on port 7681 for remote/tablet access
dev-web:
	@command -v docker >/dev/null 2>&1 && docker run --rm -it -p 7681:7681 -v "$$(pwd):/work" -w /work ghcr.io/sebastienrousseau/tsdev:latest ttyd -p 7681 -t fontSize=15 -t theme='{"background": "#1a1b26"}' tmux-ide --launch || echo "Docker not available"

#
# Build tasks
#

# @HELP Concurrently Building All Packages
build:
	@echo
	@echo "Concurrently Building All Packages"
	@pnpm -r run build

#
# Clean up tasks
#

# @HELP Concurrently Cleaning All Packages
clean:
	@echo
	@echo "Concurrently Cleaning All Packages"
	@pnpm -r run clean

#
# Documentation tasks
#

# @HELP Concurrently Generating Documentation for All Packages
docs:
	@echo
	@echo "Concurrently Generating Documentation for All Packages"
	@pnpm -r run docs

#
# Demo tasks
#

# @HELP Render terminal demo animation with VHS
demo:
	@echo
	@echo "Render terminal demo animation with VHS"
	@command -v vhs >/dev/null 2>&1 || { echo "vhs not found. Install from https://github.com/charmbracelet/vhs"; exit 1; }
	@export PATH="/Applications/Google Chrome.app/Contents/MacOS:$$PATH"; vhs .github/demo.tape

#
# Maintenance tasks
#

# @HELP Concurrently Linting All Packages
lint:
	@echo
	@echo "Concurrently Linting All Packages"
	@pnpm -r run lint

# @HELP Fix Lint Issues Across All Packages
lint-fix:
	@echo
	@echo "Fix Lint Issues Across All Packages"
	@pnpm -r run lint --fix

# @HELP Concurrently Formatting All Packages
format:
	@echo
	@echo "Concurrently Formatting All Packages"
	@pnpm -r run format

#
# Start tasks
#

# @HELP Build and start crypto-server
start-crypto-server:
	@echo
	@echo "Build and start crypto-server"
	@pnpm --filter "@sebastienrousseau/crypto-server..." run build
	@node packages/crypto-server/dist/index.js

#
# Test tasks
#

# @HELP Run test suite across all packages
test:
	@echo
	@echo "Run test suite across all packages"
	@pnpm -r run test

# @HELP Run every CI gate in order (build, lint, format, complexity, test, docs, manifests, publint/attw, pack smoke test)
check:
	@pnpm -r run build
	@pnpm -r run lint
	@pnpm -r run format:check
	@node scripts/complexity-check.mjs
	@pnpm -r run test
	@pnpm -r run docs
	@node scripts/check-manifests.mjs
	@node scripts/check-packages.mjs
	@./scripts/pack-smoke.sh

#
# Node Module install tasks
#

# @HELP Install all dependencies across the workspace
install: node_modules

node_modules: package.json
	@echo
	@echo "Install all packages in the current project."
	@pnpm install --frozen-lockfile

#
# Run Crypto Service Suite tasks
#

# Generate an armored OpenPGP key pair with crypto-lib's generate() API.
# Arguments (process.argv): key type (rsa or ecc), curve (empty for rsa),
# RSA modulus size in bits. Requires a prior `make build`.
KEYGEN = node -e 'require("./packages/crypto-lib/dist/bin/cryptolib.js").generate({name: "Jane Doe", email: "jane@doe.com", passphrase: "123456789abcdef", type: process.argv[1], curve: process.argv[2] || undefined, rsaBits: Number(process.argv[3]), keyExpirationTime: 0, format: "armored"}).then((k) => console.log(k.publicKey + k.privateKey), (e) => { console.error(e.message); process.exit(1); })'

# @HELP Generate RSA-2048 key.
rsa-2048:
	@echo
	@echo "Generate RSA-2048 key."
	@$(KEYGEN) rsa '' 2048

# @HELP Generate RSA-4096 key.
rsa-4096:
	@echo
	@echo "Generate RSA-4096 key."
	@$(KEYGEN) rsa '' 4096

# @HELP Generate Curve 25519 key pair.
curve-25519:
	@echo
	@echo "Generate Curve 25519 key pair."
	@$(KEYGEN) ecc 'curve25519' 2048

# @HELP Generate p256 key pair.
curve-p256:
	@echo
	@echo "Generate p256 key pair."
	@$(KEYGEN) ecc 'p256' 2048

# @HELP Generate p384 key pair.
curve-p384:
	@echo
	@echo "Generate p384 key pair."
	@$(KEYGEN) ecc 'p384' 2048

# @HELP Generate p521 key pair.
curve-p521:
	@echo
	@echo "Generate p521 key pair."
	@$(KEYGEN) ecc 'p521' 2048

# @HELP Generate secp256k1 key pair.
curve-secp256k1:
	@echo
	@echo "Generate secp256k1 key pair."
	@$(KEYGEN) ecc 'secp256k1' 2048

# @HELP Generate brainpoolP256r1 key pair.
curve-brainpoolP256r1:
	@echo
	@echo "Generate brainpoolP256r1 key pair."
	@$(KEYGEN) ecc 'brainpoolP256r1' 2048

# @HELP Generate brainpoolP384r1 key pair.
curve-brainpoolP384r1:
	@echo
	@echo "Generate brainpoolP384r1 key pair."
	@$(KEYGEN) ecc 'brainpoolP384r1' 2048

# @HELP Generate brainpoolP512r1 key pair.
curve-brainpoolP512r1:
	@echo
	@echo "Generate brainpoolP512r1 key pair."
	@$(KEYGEN) ecc 'brainpoolP512r1' 2048

# @HELP Display the help menu.
help:
	@ echo
	@ echo 'The Crypto Service Suite'
	@ echo
	@ echo 'https://crypto-service.co/'
	@ echo
	@ echo
	@ echo '  Usage:'
	@ echo ''
	@ echo '    make <target> [flags...]'
	@ echo ''
	@ echo '  Targets:'
	@ echo ''
	@ awk '/^#/{ comment = substr($$0,3) } comment && /^[a-zA-Z][a-zA-Z0-9_-]+ ?:/{ print "   ", $$1, comment }' $(MAKEFILE_LIST) | column -t -s ':' | sort
	@ echo ''
	@ echo '  Flags:'
	@ echo ''
	@ awk '/^#/{ comment = substr($$0,3) } comment && /^[a-zA-Z][a-zA-Z0-9_-]+ ?\?=/{ print "   ", $$1, $$2, comment }' $(MAKEFILE_LIST) | column -t -s '?=' | sort
	@ echo ''


.PHONY: dev up dev-web build check clean docs demo lint lint-fix format start-crypto-server test install node_modules rsa-2048 rsa-4096 curve-25519 curve-p256 curve-p384 curve-p521 curve-secp256k1 curve-brainpoolP256r1 curve-brainpoolP384r1 curve-brainpoolP512r1 help
