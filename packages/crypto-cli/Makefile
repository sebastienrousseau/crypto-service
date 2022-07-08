#   ____                  _           ____ _     ___
#  / ___|_ __ _   _ _ __ | |_ ___    / ___| |   |_ _|
# | |   | '__| | | | '_ \| __/ _ \  | |   | |    | |
# | |___| |  | |_| | |_) | || (_) | | |___| |___ | |
#  \____|_|   \__, | .__/ \__\___/   \____|_____|___|
#             |___/|_|
#
# Crypto CLI
# https://cryptocli.io
#
# Copyright (c) Sebastien Rousseau 2022. All rights reserved
# Licensed under the MIT license
#

export OS ?= $(shell uname -s | tr '[:upper:]' '[:lower:]')
export CRYPTO_CLI_PATH ?= $(shell 'pwd')

# Forces auto-init off to avoid invoking the macro on recursive $(MAKE)
export CRYPTO_CLI_AUTO_INIT := false

.DEFAULT_GOAL := help

PROJECT = Crypto CLI

# Run commands with the yarn debugger. (default: false)
DEBUG ?=false

ifeq ($(DEBUG),false)
  yarn = yarn
else
  yarn = yarn debug
endif

ifeq ($(words $(MAKEFILE_LIST)),1)
	NAME     			= $(PROJECT)
	GITHUB   			= https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-cli
	DESCRIPTION 	= A simple, yet powerful, command line interface that can be used to perform common cryptographic operations from the command prompt or terminal.
	AUTHOR   			= Sebastien Rousseau (https://github.com/sebastienrousseau)
endif

# @HELP Run all commands.
all:
	@echo
	@echo ${PROJECT} executing all commands...
	make ncu && make install && make build && make lint && make test

# @HELP Display information about the project.
info:
	@echo
	@echo NAME: '$(NAME)'
	@echo
	@echo DESCRIPTION:'$(DESCRIPTION)'
	@echo
	@echo AUTHOR: '$(AUTHOR)'
	@echo
	@echo GITHUB: '$(GITHUB)'
	@echo

# @HELP Run Install.
install:
	@echo
	@echo ${PROJECT} installing...
	$(yarn) install

# @HELP Run npx check updates.
ncu:
	@echo
	@echo ${PROJECT} checking npx updates...
	npx npm-check-updates -u

# @HELP Run build.
build:
	@echo
	@echo ${PROJECT} building...
	$(yarn) build

# @HELP Run directory clean.
clean:
	@echo
	@echo ${PROJECT} cleaning...
	$(yarn) clean

# @HELP Run Unit test.
test:
	@echo
	@echo ${PROJECT} checking unit tests...
	$(yarn) test

# @HELP Run Documentation.
docs:
	@echo
	@echo ${PROJECT} generating documentation...
	$(yarn) docs

# @HELP Run Eslint and autofix.
lint:
	@echo
	@echo ${PROJECT} running eslint...
	$(yarn) lint:fix

# @HELP Display the help menu.
help:
	@ echo ''
	@ echo '⚙️  Crypto Lib (https://cryptolib.io)'
	@ echo ''
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
	@ echo 'Copyright (c) Sebastien Rousseau 2022. All rights reserved'
	@ echo 'Licensed under the MIT license'
	@ echo ''

.PHONY: all clean install build test run lint lint-fix docs help
