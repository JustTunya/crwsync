# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./

COPY apps/backend/package.json apps/backend/tsconfig*.json ./apps/backend/
COPY apps/backend ./apps/backend/
COPY packages ./packages/

RUN npm install

RUN npm run build --workspace=@crwsync/types --if-present

WORKDIR /app/apps/backend
RUN npm run build

WORKDIR /app
RUN npm prune --production


# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/backend/dist ./dist

COPY --from=builder /app/apps/backend/package.json ./package.json

COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main.js"]