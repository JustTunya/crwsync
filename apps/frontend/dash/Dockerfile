# --- DEPENDENCIES STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development
RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.base.json pnpm-workspace.yaml ./
COPY apps/frontend/dash/package.json apps/frontend/dash/tsconfig*.json ./apps/frontend/dash/
COPY packages/types/package.json ./packages/types/package.json

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter="@crwsync/types" --filter="@crwsync/dash"

COPY packages ./packages
COPY apps/frontend/dash ./apps/frontend/dash

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WEB_URL=${NEXT_PUBLIC_WEB_URL}

COPY --from=deps /app ./

RUN mkdir -p apps/frontend/dash/public

RUN --mount=type=cache,target=/app/apps/frontend/dash/.next/cache \
    pnpm run build --filter="@crwsync/dash"

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=node:node /app/apps/frontend/dash/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/dash/.next/static ./apps/frontend/dash/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/dash/public ./apps/frontend/dash/public

USER node

EXPOSE 3000
CMD ["node", "apps/frontend/dash/server.js"]
