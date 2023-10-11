#       ____                  _          ____                  _
#      / ___|_ __ _   _ _ __ | |_ ___   / ___|  ___ _ ____   _(_) ___ ___
#     | |   | '__| | | | '_ \| __/ _ \  \___ \ / _ \ '__\ \ / / |/ __/ _ \
#     | |___| |  | |_| | |_) | || (_) |  ___) |  __/ |   \ V /| | (_|  __/
#      \____|_|   \__, | .__/ \__\___/  |____/ \___|_|    \_/ |_|\___\___|
#                 |___/|_|
# Crypto Service Suite
# https://crypto-service.co/
#
# Copyright (c) Sebastien Rousseau 2022. All rights reserved
# Licensed under the MIT license
#

.DEFAULT_GOAL := help

#
# Build tasks
#

# @HELP Concurrently Building All Packages
build:
	@echo
	@echo "Concurrently Building All Packages"
	@npx lerna run build --stream

#
# Clean up tasks
#

# @HELP Concurrently Cleaning All Packages
clean:
	@echo
	@echo "Concurrently Cleaning All Packages"
	@npx lerna run clean --stream

#
# Documentation tasks
#

# @HELP Concurrently Generating Documentation for All Packages
docs:
	@echo
	@echo "Concurrently Generating Documentation for All Packages"
	@npx lerna run docs --stream

#
# Maintenance tasks
#

# @HELP Concurrently Linting All Packages
lint:
	@echo
	@echo "Concurrently Linting All Packages"
	@npx lerna run lint --stream

# @HELP Fix Lint Issues Across All Packages Without Exiting on Error
lint-fix:
	@echo
	@echo "Fix Lint Issues Across All Packages Without Exiting on Error"
	@npx lerna run lint:fix --no-bail

# @HELP Running Remark and Markdown Scripts Across All Packages
markdown:
	@echo
	@echo "Running Remark and Markdown Scripts Across All Packages"
	@npx lerna exec -- yarn run remark ./*.md --rc-path ./.remarkrc --quiet && lerna exec yarn markdown --parallel

# @HELP Concurrently Formatting All Packages
format:
	@echo
	@echo "Concurrently Formatting All Packages"
	@npx lerna run format --stream

#
# Publishing tasks
#

# @HELP Perform a Yarn Release
release:
	@echo
	@echo "Perform a Yarn Release"
	@npx yarn release

#
# Start tasks
#

# @HELP Run `npm start` in each package.
start:
	@echo
	@echo "Run `npm start` in each package."
	@npx yarn start

# @HELP Start crypto-lib - Run `npm start` in the crypto-lib package.
start-crypto-lib:
	@echo
	@echo "Start crypto-lib - Run `npm start` in the crypto-lib package."
	@npx yarn start:crypto-lib

# @HELP Start crypto-server - Run `npm start` in the crypto-server package.
start-crypto-server:
	@echo
	@echo "Start crypto-server - Run `npm start` in the crypto-server package."
	@npx yarn start:crypto-server

#
# Test tasks
#

# @HELP Run `npm test` in each package.
test:
	@echo
	@echo "Run `npm test` in each package."
	@npx yarn test

#
# Node Module install tasks
#

# @HELP Install all packages in the current project.
node_modules: package.json
	@echo
	@echo "Install all packages in the current project."
	@pnpm install

#
# Run Crypto Service Suite tasks
#

# @HELP Generate RSA-2048 key.
rsa-2048:
	@echo
	@echo "Generate RSA-2048 key."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "rsa" --curve "" --bits 2048 --expiration 0 --format armored --sign true || echo "An error occurred while generating the RSA-2048 key."

# @HELP Generate RSA-4096 key.
rsa-4096:
	@echo
	@echo "Generate RSA-4096 key."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "rsa" --curve "" --bits 4096 --expiration 0 --format armored --sign true

# @HELP Generate Curve 25519 key pair.
curve-25519:
	@echo
	@echo "Generate Curve 25519 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve curve25519 --bits null --expiration 0 --format armored --sign true

# @HELP Generate p256 key pair.
curve-p256:
	@echo
	@echo "Generate p256 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve p256 --bits null --expiration 0 --format armored --sign true

# @HELP Generate p384 key pair.
curve-p384:
	@echo
	@echo "Generate p384 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve p384 --bits null --expiration 0 --format armored --sign true

# @HELP Generate p521 key pair.
curve-p521:
	@echo
	@echo "Generate p521 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve p521 --bits null --expiration 0 --format armored --sign true

# @HELP Generate secp256k1 key pair.
curve-secp256k1:
	@echo
	@echo "Generate secp256k1 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve secp256k1 --bits null --expiration 0 --format armored --sign true

# @HELP Generate brainpoolP256r1 key pair.
curve-brainpoolP256r1:
	@echo
	@echo "Generate brainpoolP256r1 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve brainpoolP256r1 --bits null --expiration 0 --format armored --sign true

# @HELP Generate brainpoolP384r1 key pair.
curve-brainpoolP384r1:
	@echo
	@echo "Generate brainpoolP384r1 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve brainpoolP384r1 --bits null --expiration 0 --format armored --sign true

# @HELP Generate brainpoolP512r1 key pair.
curve-brainpoolP512r1:
	@echo
	@echo "Generate brainpoolP512r1 key pair."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve brainpoolP512r1 --bits null --expiration 0 --format armored --sign true

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


.PHONY: build, clean, docs, lint, lint-fix, markdown, prettier, release, start, start-crypto-lib, start-crypto-server, test, node_modules, rsa-2048, rsa-4096, curve-25519, curve-p256, curve-p384, curve-p521, curve-secp256k1, curve-brainpoolP256r1, curve-brainpoolP384r1, curve-brainpoolP512r1, help
