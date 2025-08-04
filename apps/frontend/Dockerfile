# --- DEPENDENCIES STAGE ---
FROM node:lts-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/

RUN npm ci


# --- BUILDER STAGE ---
FROM node:lts-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build --workspace=apps/frontend


# --- RUNNER STAGE ---
FROM node:lts-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/next.config.js ./next.config.js
COPY --from=builder /app/apps/frontend/package.json ./package.json

COPY --from=deps /app/node_modules ./node_modules

USER appuser

EXPOSE 3000

CMD ["npm", "start", "--workspace=apps/frontend"]