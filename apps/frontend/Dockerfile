# --- BUILDER STAGE ---
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app/apps/frontend

# Copy package manifest and lockfile (if present)
COPY apps/frontend/package*.json ./
COPY apps/frontend/tsconfig*.json ./

# Copy source code and shared packages
COPY apps/frontend ./
COPY packages ../packages/

# Install dependencies and build
RUN npm install
RUN npm run build

# --- RUNNER STAGE ---
FROM node:20-alpine AS runner

# Set environment and working directory
ENV NODE_ENV=production
WORKDIR /app

# Copy build output and public assets
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public

# Copy production manifest
COPY apps/frontend/package*.json ./package.json

# Install production dependencies
RUN npm install --omit=dev

# Expose port and start Next.js
EXPOSE 3000
CMD ["npx", "next", "start"]
