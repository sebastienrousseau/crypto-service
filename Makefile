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

# @HELP Link local packages together and install remaining package dependencies.
bootstrap:
	@echo
	@echo "Link local packages together and install remaining package dependencies."
	@npx yarn bootstrap

# @HELP Run an npm `build` script in each package that contains that script.
build:
	@echo
	@echo "Run an npm `build` script in each package that contains that script."
	@npx yarn build

#
# Clean up tasks
#

# @HELP Remove the `node_modules` directory from all packages.
clean:
	@echo
	@echo "Remove the `node_modules` directory from all packages."
	@npx yarn clean

#
# Documentation tasks
#

# @HELP Generate documentation for all packages.
docs:
	@echo
	@echo "Generate documentation for all packages."
	@npx yarn doc

#
# Maintenance tasks
#

# @HELP Run `npm run lint` in each package.
lint:
	@echo
	@echo "Run `npm run lint` in each package."
	@npx yarn lint

# @HELP Run `npm run fix` in each package.
fix:
	@echo
	@echo "Run `npm run fix` in each package."
	@npx yarn fix

# @HELP Run `npm run markdown` in each package.
markdown:
	@echo
	@echo "Run `npm run markdown` in each package."
	@npx yarn markdown

# @HELP Run `npm run prettier` in each package.
prettier:
	@echo
	@echo "Run `npm run prettier` in each package."
	@npx yarn prettier

#
# Publishing tasks
#

# @HELP Publish packages in the current project.
release:
	@echo
	@echo "Publish packages in the current project."
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
	@npm install

#
# Run Crypto Service Suite tasks
#

# @HELP Generate RSA-2048 key.
rsa-2048:
	@echo
	@echo "Generate RSA-2048 key."
	@npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "rsa" --curve "" --bits 2048 --expiration 0 --format armored --sign true

# @HELP Generate RSA-4096 key.
rsa-4096:
	@echo
	@echo "Generate RSA-4096 key."
	npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "rsa" --curve "" --bits 4096 --expiration 0 --format armored --sign true

# @HELP Generate Curve 25519 key pair.
curve-25519:
	@echo
	@echo "Generate Curve 25519 key pair."
	npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve curve25519 --bits null --expiration 0 --format armored --sign true

# @HELP Generate p256 key pair.
curve-p256:
	@echo
	@echo "Generate p256 key pair."
	npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve p256 --bits null --expiration 0 --format armored --sign true

# @HELP Generate p384 key pair.
curve-p384:
	@echo
	@echo "Generate p384 key pair."
	npx ts-node packages/crypto-lib/src/bin/crypto-lib.ts --name "Jane Doe" --email "jane@doe.com" --passphrase "123456789abcdef" --type "ecc" --curve p384 --bits null --expiration 0 --format armored --sign true

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


.PHONY: bootstrap, build, clean, docs, lint, fix, markdown, prettier, release, start, start-crypto-lib, start-crypto-server, test, node_modules, rsa-2048, rsa-4096, curve-25519, curve-p256, curve-p384, curve-p521, curve-secp256k1, curve-brainpoolP256r1, curve-brainpoolP384r1, curve-brainpoolP512r1, help
