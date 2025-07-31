# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# 1. Copy root manifests for workspace resolution
COPY package.json package-lock.json ./

# 2. Copy frontend code and shared packages
COPY apps/frontend       ./apps/frontend/
COPY packages            ./packages/

# 3. Install all dependencies (including @crwsync/types)
RUN npm ci --frozen-lockfile

# 4. Build the frontend workspace
WORKDIR /app/apps/frontend
RUN npm run build

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

# Set environment and working directory
ENV NODE_ENV=production
WORKDIR /app

# 5. Copy build output and public assets
COPY --from=builder /app/apps/frontend/.next   ./.next
COPY --from=builder /app/apps/frontend/public ./public

# 6. Copy production manifest
COPY apps/frontend/package.json      ./package.json
COPY package-lock.json               ./package-lock.json

# 7. Install production dependencies only
RUN npm ci --omit=dev --only=production

# 8. Expose port and start Next.js server
EXPOSE 3000
CMD ["npx", "next", "start"]
