FROM node:lts-alpine AS base

# --- INSTALL DEPENDENCIES ---
FROM base AS dependencies

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/tsconfig*.json ./apps/frontend/

RUN npm ci

# --- BUILDER STAGE ---
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- RUNNER STAGE ---
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/next.config.ts ./apps/frontend/next.config.ts
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/package.json

COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]