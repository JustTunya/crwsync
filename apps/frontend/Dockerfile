# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/frontend/package*.json ./apps/frontend/
COPY apps/frontend/tsconfig*.json ./apps/frontend/

COPY apps/frontend ./apps/frontend
COPY packages ./packages

RUN npm ci --frozen-lockfile
WORKDIR /app/apps/frontend
RUN npm run build

# --- RUNNER STAGE ---
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/public ./frontend/public
COPY --from=builder /app/apps/frontend/.next ./.next
COPY apps/frontend/package*.json ./

RUN npm ci --omit=dev --only=production

EXPOSE 3000
CMD ["npx", "next", "start"]