# --- DEPENDENCIES STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development
RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json pnpm-workspace.yaml turbo.json ./
COPY apps/frontend/web/package.json apps/frontend/web/tsconfig*.json ./apps/frontend/web/
COPY packages/types/package.json ./packages/types/package.json
COPY packages/styles/package.json ./packages/styles/package.json

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter="@crwsync/types" --filter="@crwsync/styles" --filter="@crwsync/web"

COPY packages ./packages
COPY apps/frontend/web ./apps/frontend/web

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DASH_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DASH_URL=${NEXT_PUBLIC_DASH_URL}

COPY --from=deps /app ./

RUN mkdir -p apps/frontend/web/public

RUN --mount=type=cache,target=/app/apps/frontend/web/.next/cache \
    pnpm run build --filter="@crwsync/web"

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/apps/frontend/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/web/.next/static ./apps/frontend/web/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/web/public ./apps/frontend/web/public

USER node

EXPOSE 3000
CMD ["node", "apps/frontend/web/server.js"]
