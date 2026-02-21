# --- DEPENDENCY STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/nest-cli.json apps/backend/tsconfig.json ./apps/backend/
COPY packages/types/package.json ./packages/types/package.json
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter="@crwsync/types" --filter="@crwsync/backend"

COPY packages ./packages
COPY apps/backend ./apps/backend


# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    ./node_modules/.bin/prisma generate --schema=apps/backend/prisma/schema.prisma && \
    pnpm run build --filter="@crwsync/types" --filter="@crwsync/backend"


# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --filter="@crwsync/backend" && \
    ./node_modules/.bin/prisma generate --schema=apps/backend/prisma/schema.prisma

COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=node:node /app/packages/types/dist ./node_modules/@crwsync/types
COPY --from=builder --chown=node:node /app/packages/types/package.json ./node_modules/@crwsync/types/package.json
COPY --from=builder --chown=node:node /app/packages/templates ./packages/templates

COPY --chown=node:node apps/backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

EXPOSE 8080
CMD ["/usr/local/bin/entrypoint.sh"]