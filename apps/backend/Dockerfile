FROM node:20-alpine AS base

# --- BUILDER STAGE ---
FROM base AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN mkdir -p .turbo/cache && pnpm dlx turbo prune @crwsync/backend --docker

# --- INSTALLER STAGE ---
FROM base AS installer
WORKDIR /app
RUN corepack enable

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/.turbo/cache /app/.turbo/cache
COPY turbo.json turbo.json
COPY tsconfig.json tsconfig.json
COPY tsconfig.base.json tsconfig.base.json

RUN --mount=type=secret,id=DATABASE_URL \
    DATABASE_URL=$(cat /run/secrets/DATABASE_URL) \
    pnpm --filter @crwsync/backend run prisma:generate && \
    pnpm turbo run build --filter=@crwsync/backend...

# --- RUNNER STAGE ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && \
    pnpm install --prod --frozen-lockfile

COPY --from=installer --chown=node:node /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=installer --chown=node:node /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
RUN pnpm --filter @crwsync/backend run prisma:generate

COPY --from=installer --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer --chown=node:node /app/packages/types/dist ./packages/types/dist
COPY --from=installer --chown=node:node /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=node:node /app/packages/templates ./packages/templates

USER node

EXPOSE 8080
CMD ["node", "apps/backend/dist/main.js"]