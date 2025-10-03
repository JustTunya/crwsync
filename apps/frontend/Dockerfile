# --- DEPENDENCIES STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development

RUN corepack enable

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/tsconfig*.json ./apps/frontend/
COPY packages/types/package.json ./packages/types/package.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@crwsync/types --workspace=@crwsync/frontend

COPY packages ./packages
COPY apps/frontend ./apps/frontend

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app ./

RUN mkdir -p apps/frontend/public

RUN --mount=type=cache,target=/app/apps/frontend/.next/cache \
    npm run build -w @crwsync/frontend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]