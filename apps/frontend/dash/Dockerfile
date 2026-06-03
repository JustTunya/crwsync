FROM node:26-alpine AS base
RUN npm install -g pnpm@11.5.1
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN pnpm config set store-dir /pnpm/store

# --- BUILDER STAGE ---
FROM base AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    mkdir -p .turbo/cache && pnpm dlx turbo prune @crwsync/dash --docker

# --- INSTALLER STAGE ---
FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY --from=builder /app/.turbo/cache /app/.turbo/cache
COPY turbo.json turbo.json
COPY tsconfig.json tsconfig.json
COPY tsconfig.base.json tsconfig.base.json

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEB_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WEB_URL=${NEXT_PUBLIC_WEB_URL}

RUN --mount=type=cache,id=turbo,target=/app/node_modules/.cache/turbo \
    --mount=type=cache,id=next-dash,target=/app/apps/frontend/dash/.next/cache \
    pnpm turbo run build --filter=@crwsync/dash...

# --- RUNNER STAGE ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=installer --chown=node:node /app/apps/frontend/dash/.next/standalone ./
COPY --from=installer --chown=node:node /app/apps/frontend/dash/.next/static ./apps/frontend/dash/.next/static
COPY --from=installer --chown=node:node /app/apps/frontend/dash/public ./apps/frontend/dash/public

USER node

EXPOSE 3000
CMD ["node", "apps/frontend/dash/server.js"]
