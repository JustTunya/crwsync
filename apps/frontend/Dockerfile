# 1) Install only frontend deps
FROM node:20-alpine AS deps

WORKDIR /app

COPY apps/frontend/package.json apps/frontend/package-lock.json ./

RUN npm ci

FROM deps AS builder

WORKDIR /app

COPY apps/frontend ./

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=deps    /app/package.json ./package.json

EXPOSE 3000
CMD ["npx","next","start","--hostname","0.0.0.0","-p","3000"]
