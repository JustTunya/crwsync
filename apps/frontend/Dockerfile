# --- DEPENDENCIES STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/tsconfig.json apps/frontend/tsconfig.base.json ./apps/frontend/
COPY packages ./packages/

RUN npm ci --workspace=@crwsync/types --workspace=@crwsync/frontend

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# bring in your frontend-only env for build-time NEXT_PUBLIC_*
COPY apps/frontend/.env.production .env.production

RUN npm run build --workspace=@crwsync/types && npm run build --workspace=@crwsync/frontend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# runtime env for server‐side vars
COPY apps/frontend/.env.production .env.production

EXPOSE 3000
CMD ["npm", "start"]
