# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend ./apps/frontend/
COPY packages ./packages/

RUN npm install

WORKDIR /app/apps/frontend
COPY apps/frontend/next.config.ts ./
RUN npm run build

WORKDIR /app
RUN npm prune --production

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public

COPY --from=builder /app/apps/frontend/package.json ./package.json
COPY --from=builder /app/apps/frontend/next.config.ts ./next.config.ts

COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npx", "next", "start"]
