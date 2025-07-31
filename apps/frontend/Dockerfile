# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/frontend ./apps/frontend
COPY packages ./packages

RUN npm install --frozen-lockfile
RUN npm run build --workspace=frontend

# --- RUNNER STAGE ---
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/frontend/public ./public
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/package.json ./

EXPOSE 3000

CMD ["node_modules/.bin/next", "start"]
