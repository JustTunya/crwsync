# --- BUILDER STAGE ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
RUN npm ci

COPY packages ./packages
COPY apps/backend ./apps/backend

RUN npm run build --workspace=@crwsync/types \
 && npm run build --workspace=@crwsync/backend

RUN npm prune --omit=dev

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "dist/main.js"]