FROM node:26-alpine AS base
RUN npm install -g pnpm@10.29.3
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN pnpm config set store-dir /pnpm/store

# --- BUILDER STAGE ---
FROM base AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    mkdir -p .turbo/cache && pnpm dlx turbo prune @crwsync/web --docker

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
ARG NEXT_PUBLIC_DASH_URL
ARG NEXT_PUBLIC_DEMO_IDENTIFIER
ARG NEXT_PUBLIC_DEMO_PASSWORD
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DASH_URL=${NEXT_PUBLIC_DASH_URL}
ENV NEXT_PUBLIC_DEMO_IDENTIFIER=${NEXT_PUBLIC_DEMO_IDENTIFIER}
ENV NEXT_PUBLIC_DEMO_PASSWORD=${NEXT_PUBLIC_DEMO_PASSWORD}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV SENTRY_RELEASE=${SENTRY_RELEASE}
ENV CI=true

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false \
    --mount=type=cache,id=turbo,target=/app/node_modules/.cache/turbo \
    --mount=type=cache,id=next-web,target=/app/apps/frontend/web/.next/cache \
    export SENTRY_AUTH_TOKEN="$( [ -f /run/secrets/SENTRY_AUTH_TOKEN ] && cat /run/secrets/SENTRY_AUTH_TOKEN || true )" && \
    pnpm turbo run build --filter=@crwsync/web...

# --- RUNNER STAGE ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=installer --chown=node:node /app/apps/frontend/web/.next/standalone ./
COPY --from=installer --chown=node:node /app/apps/frontend/web/.next/static ./apps/frontend/web/.next/static
COPY --from=installer --chown=node:node /app/apps/frontend/web/public ./apps/frontend/web/public

USER node

EXPOSE 3000
CMD ["node", "apps/frontend/web/server.js"]