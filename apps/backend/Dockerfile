FROM node:20-alpine AS base
ENV CI=true

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

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/.turbo/cache /app/.turbo/cache
COPY turbo.json turbo.json
COPY tsconfig.json tsconfig.json
COPY tsconfig.base.json tsconfig.base.json

RUN --mount=type=secret,id=DATABASE_URL \
    DATABASE_URL=$(cat /run/secrets/DATABASE_URL) \
    pnpm --filter @crwsync/backend run prisma:generate && \
    pnpm turbo run build --filter=@crwsync/backend...

RUN pnpm prune --prod --no-optional

# --- RUNNER STAGE ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=installer --chown=node:node /app/node_modules ./node_modules
COPY --from=installer --chown=node:node /app/packages ./packages
COPY --from=installer --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer --chown=node:node /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=installer --chown=node:node /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY --from=installer --chown=node:node /app/apps/backend/package.json ./apps/backend/package.json

USER node

EXPOSE 8080
CMD ["node", "apps/backend/dist/main.js"]