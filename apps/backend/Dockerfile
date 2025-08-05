# --- DEPENDENCY STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/nest-cli.json apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/src ./apps/backend/
COPY packages ./packages/

RUN npm ci --workspace=@crwsync/types --workspace=@crwsync/backend

# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=@crwsync/types --workspace=@crwsync/backend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
# runtime .env for Nest
COPY apps/backend/.env .env

EXPOSE 8080
CMD ["node", "dist/main.js"]
