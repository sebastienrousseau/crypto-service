<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Contributing to Crypto Service Suite

Thank you for your interest in contributing to Crypto Service Suite! We welcome contributions
from the community.

## Code of Conduct

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/crypto-service.git
   cd crypto-service
   ```
2. Ensure you have Node.js >= 22.0.0 and pnpm >= 9.x installed.
3. Install dependencies:
   ```bash
   pnpm install
   ```

## Development Workflow

- Source code lives in `packages/*/src/`. Do not edit generated output in `dist/`.
- Tests live in `packages/*/__tests__/`.
- Run the build:
  ```bash
  pnpm -r run build
  ```
- Run tests and enforce 100% coverage:
  ```bash
  pnpm -r run test
  ```
- Run linting:
  ```bash
  pnpm -r run lint
  ```
- Format code:
  ```bash
  pnpm -r run format
  ```
- Build TypeDoc documentation:
  ```bash
  pnpm -r run docs
  ```

## Commit Message Guidelines

This project strictly follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- **Format**: `<type>(<scope>): <subject>` (maximum 50 characters, imperative mood).
  - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- **Body**: Explain WHAT and WHY (not HOW) — wrap strictly at 72 characters.
- **Signing**: Commits must be SSH-signed (`commit.gpgsign = true`) and signed-off with DCO (`format.signoff = true`).

## Submitting Pull Requests

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Ensure all quality gates (`build`, `lint`, `format`, `test`, `docs`) pass before pushing.
3. Open a pull request against `main` (or the active release branch) with a descriptive title and explanation of changes.
