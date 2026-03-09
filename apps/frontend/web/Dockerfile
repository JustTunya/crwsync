FROM node:20-alpine AS base

# --- BUILDER STAGE ---
FROM base AS builder
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm dlx turbo prune @crwsync/web --docker

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

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DASH_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DASH_URL=${NEXT_PUBLIC_DASH_URL}

RUN pnpm turbo run build --filter=@crwsync/web...

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
