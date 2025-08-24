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

COPY --from=deps /app ./

RUN --mount=type=cache,target=/app/apps/frontend/.next/cache \
    npm run build --workspace=@crwsync/types --workspace=@crwsync/frontend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]