# --- DEPENDENCY STAGE ---
FROM node:20-alpine AS deps
WORKDIR /app

ENV NODE_ENV=development

RUN corepack enable

# Copy only manifests + configs needed for a deterministic install
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/nest-cli.json apps/backend/tsconfig.json ./apps/backend/
COPY packages/types/package.json ./packages/types/package.json

# Copy Prisma schema/config early so Prisma Client generation can succeed during build
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@crwsync/types --workspace=@crwsync/backend

# Now copy the full sources
COPY packages ./packages
COPY apps/backend ./apps/backend


# --- BUILDER STAGE ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app ./

# IMPORTANT: generate Prisma Client *before* compiling TypeScript/Nest
RUN --mount=type=cache,target=/root/.npm \
    ./node_modules/.bin/prisma generate --schema=apps/backend/prisma/schema.prisma

RUN --mount=type=cache,target=/root/.npm \
    npm run build --workspace=@crwsync/types --workspace=@crwsync/backend


# --- RUNNER STAGE ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only backend production deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json

# Prisma schema/config is required at runtime for prisma generate and migrations tooling (if used)
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=@crwsync/backend

# Generate Prisma client in the runtime image as well (keeps runtime self-contained)
RUN ./node_modules/.bin/prisma generate --schema=apps/backend/prisma/schema.prisma

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/types/dist ./node_modules/@crwsync/types
COPY --from=builder /app/packages/types/package.json ./node_modules/@crwsync/types/package.json

# Entrypoint
COPY apps/backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8080

CMD ["/usr/local/bin/entrypoint.sh"]