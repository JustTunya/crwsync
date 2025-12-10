# --- DEPENDENCIES STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development
RUN corepack enable

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/frontend/web/package.json apps/frontend/web/tsconfig*.json ./apps/frontend/web/
COPY packages/types/package.json ./packages/types/package.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@crwsync/types --workspace=@crwsync/web

COPY packages ./packages
COPY apps/frontend/web ./apps/frontend/web

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DASH_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DASH_URL=${NEXT_PUBLIC_DASH_URL}

COPY --from=deps /app ./

RUN mkdir -p apps/frontend/web/public

RUN --mount=type=cache,target=/app/apps/frontend/web/.next/cache \
    npm run build -w @crwsync/web

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/frontend/web/.next/standalone ./
COPY --from=builder /app/apps/frontend/web/.next/static ./apps/frontend/web/.next/static
COPY --from=builder /app/apps/frontend/web/public ./apps/frontend/web/public

EXPOSE 3000
CMD ["node", "apps/frontend/web/server.js"]
