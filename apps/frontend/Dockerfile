# --- DEPS STAGE: install everything & build types ---
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./

COPY packages/types/package.json packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src

COPY apps/frontend/package.json apps/frontend/tsconfig.json ./apps/frontend/

RUN npm ci

RUN npm run build --workspace=@crwsync/types

# --- BUILDER STAGE: build frontend and prune ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types ./packages/types

COPY . .

RUN npm ci --workspace=@crwsync/frontend --production=false

RUN npm run build --workspace=@crwsync/frontend

RUN npm prune --production --workspace=@crwsync/frontend

# --- RUNNER STAGE: runtime only ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "start"]
