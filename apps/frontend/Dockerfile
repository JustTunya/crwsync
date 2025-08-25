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

# Making sure public folder exists even if empty
RUN mkdir -p apps/frontend/public

RUN --mount=type=cache,target=/app/apps/frontend/.next/cache \
    npm run build --workspace=@crwsync/types --workspace=@crwsync/frontend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000

COPY --from=builder /app/apps/frontend/.next/standalone ./

WORKDIR /app/apps/frontend

COPY --from=builder /app/apps/frontend/.next/static ./.next/static
COPY --from=builder /app/apps/frontend/public ./public

EXPOSE 3000

CMD ["node", "server.js"]