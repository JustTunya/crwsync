# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/tsconfig*.json ./apps/backend/

COPY apps/backend ./apps/backend
COPY packages ./packages

RUN npm ci --frozen-lockfile
WORKDIR /app/apps/backend
RUN npm run build

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/backend/dist ./dist
COPY apps/backend/package*.json ./apps/backend/

RUN npm ci --omit=dev --only=production

CMD ["node", "dist/main.js"]