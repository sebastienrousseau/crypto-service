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
# Licensed under the MIT license
#

.DEFAULT_GOAL := help

#
# Build tasks
#

# @HELP Build all packages
build:
	@echo
	@echo "Building all packages"
	@pnpm -r run build

# @HELP Clean all packages
clean:
	@echo
	@echo "Cleaning all packages"
	@pnpm -r run clean

# @HELP Generate documentation for all packages
docs:
	@echo
	@echo "Generating docs"
	@pnpm -r run docs

# @HELP Lint all packages
lint:
	@echo
	@echo "Linting all packages"
	@pnpm -r run lint

# @HELP Lint with --fix across all packages
lint-fix:
	@echo
	@echo "Lint --fix"
	@pnpm -r run lint:fix

# @HELP Format all packages
format:
	@echo
	@echo "Formatting all packages"
	@pnpm -r run format

# @HELP Run tests across all packages
test:
	@echo
	@echo "Running tests"
	@pnpm -r run test

# @HELP Install dependencies
node_modules: package.json
	@pnpm install

# @HELP Display this help
help:
	@echo
	@echo 'The Crypto Service Suite'
	@echo
	@echo '  Targets:'
	@echo
	@awk '/^#/{ comment = substr($$0,3) } comment && /^[a-zA-Z][a-zA-Z0-9_-]+ ?:/{ print "   ", $$1, comment }' $(MAKEFILE_LIST) | column -t -s ':' | sort
	@echo

.PHONY: build clean docs lint lint-fix format test help
