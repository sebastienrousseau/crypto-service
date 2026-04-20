# ============================================================================
# Stage 1: Install dependencies
# ============================================================================
FROM node:22-alpine AS deps

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/crypto-lib/package.json packages/crypto-lib/
COPY packages/crypto-server/package.json packages/crypto-server/

RUN pnpm install --frozen-lockfile --prod=false

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:22-alpine AS build

RUN corepack enable pnpm

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/crypto-lib/node_modules ./packages/crypto-lib/node_modules
COPY --from=deps /app/packages/crypto-server/node_modules ./packages/crypto-server/node_modules
COPY . .

RUN pnpm --filter @sebastienrousseau/crypto-lib run build && \
    pnpm --filter @sebastienrousseau/crypto-server run build

# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM node:22-alpine AS production

RUN corepack enable pnpm && \
    addgroup -g 1001 -S crypto && \
    adduser -S crypto -u 1001

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/crypto-lib/node_modules ./packages/crypto-lib/node_modules
COPY --from=deps /app/packages/crypto-server/node_modules ./packages/crypto-server/node_modules
COPY --from=build /app/packages/crypto-lib/dist ./packages/crypto-lib/dist
COPY --from=build /app/packages/crypto-server/dist ./packages/crypto-server/dist
COPY --from=build /app/packages/crypto-lib/package.json ./packages/crypto-lib/
COPY --from=build /app/packages/crypto-server/package.json ./packages/crypto-server/
COPY package.json pnpm-workspace.yaml ./

USER crypto

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "packages/crypto-server/dist/src/index.js"]
