# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY apps/frontend apps/frontend/
COPY packages packages/

WORKDIR /app/apps/frontend
RUN npm run build

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./static
COPY --from=builder /app/apps/frontend/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
