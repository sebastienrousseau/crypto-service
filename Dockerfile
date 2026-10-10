# SPDX-License-Identifier: Apache-2.0 OR MIT
#
# Production image for @sebastienrousseau/crypto-server.
#
# The base image is pinned by its multi-arch index digest (node:22-alpine,
# Node 22.23.3, resolved 2026-10-01). Dependabot's docker ecosystem keeps
# the digest current.
#
# The runtime stage needs @sebastienrousseau/crypto-lib in crypto-server's
# `dependencies` (not `devDependencies`): `pnpm deploy --prod` installs
# production dependencies only.

# ============================================================================
# Stage 1: Build the server and produce a pruned, production-only deployment
# ============================================================================
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build

# Skip the root `prepare` (husky) hook: there is no .git in the build context.
ENV HUSKY=0

RUN corepack enable pnpm

WORKDIR /app

# Populate the pnpm store from the lockfile alone, so this layer is cached
# until pnpm-lock.yaml changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch --frozen-lockfile

COPY . .

RUN pnpm install --offline --frozen-lockfile \
      --filter "@sebastienrousseau/crypto-server..." && \
    pnpm --filter "@sebastienrousseau/crypto-server..." run build && \
    pnpm --filter @sebastienrousseau/crypto-server deploy --prod /out

# ============================================================================
# Stage 2: Production image (production dependencies only, non-root, tini)
# ============================================================================
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS production

RUN apk add --no-cache tini && \
    addgroup -g 1001 -S crypto && \
    adduser -S crypto -u 1001 -G crypto

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=root:root /out ./

USER crypto

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ready || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
