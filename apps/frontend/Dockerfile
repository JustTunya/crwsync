# --- DEPENDENCIES STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/tsconfig*.json ./apps/frontend/
COPY packages ./packages/

RUN npm ci --workspace=@crwsync/frontend --workspace=@crwsync/types

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /node_modules ./node_modules
COPY . .

RUN npm run build --workspace=@crwsync/types --workspace=@crwsync/frontend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /apps/frontend/.next ./.next
COPY --from=builder /apps/frontend/next.config.ts ./next.config.ts
COPY --from=builder /apps/frontend/package.json ./package.json
COPY --from=builder /node_modules ./node_modules

EXPOSE 3000

CMD ["node", "apps/frontend/.next/standalone/apps/frontend/server.js"]