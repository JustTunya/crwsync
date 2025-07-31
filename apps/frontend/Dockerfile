# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

# 1) install dependencies for the whole monorepo (including workspaces)
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend ./apps/frontend/
COPY packages ./packages/

# npm install will pull in all workspaces and hoist them under /app/node_modules
RUN npm install

# 2) build the frontend
WORKDIR /app/apps/frontend
COPY apps/frontend/next.config.ts ./
RUN npm run build

# 3) prune out devDependencies to slim down node_modules
WORKDIR /app
RUN npm prune --production


# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# 4) Copy runtime bits
COPY --from=builder /app/apps/frontend/.next       ./.next
COPY --from=builder /app/apps/frontend/public      ./public

# 5) Copy just the frontend’s package.json & next.config
COPY --from=builder /app/apps/frontend/package.json   ./package.json
COPY --from=builder /app/apps/frontend/next.config.ts ./next.config.ts

# 6) Bring in only the production node_modules
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npx", "next", "start"]
