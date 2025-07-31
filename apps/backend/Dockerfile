# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/backend ./apps/backend
COPY packages ./packages

RUN npm install --frozen-lockfile
RUN npm run build --workspace=backend

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist/apps/backend ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./

CMD ["node", "dist/main.js"]