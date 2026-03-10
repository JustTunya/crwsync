FROM node:20-alpine AS base

# --- BUILDER STAGE ---
FROM base AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm dlx turbo prune @crwsync/backend --docker

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
COPY turbo.json turbo.json
COPY tsconfig.json tsconfig.json
COPY tsconfig.base.json tsconfig.base.json
RUN pnpx prisma generate --schema=apps/backend/prisma/schema.prisma && \
    pnpm turbo run build --filter=@crwsync/backend...

# --- RUNNER STAGE ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && \
    pnpm install --prod --frozen-lockfile

COPY --from=installer /app/apps/backend/prisma ./apps/backend/prisma
RUN pnpx prisma generate --schema=apps/backend/prisma/schema.prisma

COPY --from=installer --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer --chown=node:node /app/packages/types/dist ./node_modules/@crwsync/types/dist
COPY --from=installer --chown=node:node /app/packages/types/package.json ./node_modules/@crwsync/types/package.json
COPY --from=builder --chown=node:node /app/packages/templates ./packages/templates

COPY --from=installer --chown=node:node /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

COPY --from=installer --chown=node:node /app/apps/backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

EXPOSE 8080
CMD ["/usr/local/bin/entrypoint.sh"]