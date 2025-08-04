# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend ./apps/frontend/
COPY packages/ ./packages/

RUN npm ci

WORKDIR /app/apps/frontend
RUN npm run build

WORKDIR /app
RUN npm prune --production

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public

COPY --from=builder /app/apps/frontend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
