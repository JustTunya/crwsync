<div align="center">
  <img src="apps/frontend/web/public/logo@orange.svg" alt="CRWSync Logo" width="250" />
  <br /><br />
</div>

[![Deploy Status](https://img.shields.io/github/actions/workflow/status/justtunya/crwsync/deploy.yml?logo=github&label=Deploy)](https://github.com/justtunya/crwsync/actions)
[![License](https://img.shields.io/badge/License-Proprietary-0284c7)](https://github.com/justtunya/crwsync/blob/main/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/justtunya/crwsync?label=Last%20Commit)](https://github.com/justtunya/crwsync/commits/main)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/justtunya/crwsync?label=Commit%20Activity)](https://github.com/justtunya/crwsync/commits/main)
[![Repo Size](https://img.shields.io/github/repo-size/justtunya/crwsync?label=Repo%20Size)](https://github.com/justtunya/crwsync)

![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=Turborepo&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?logo=socket.io&badgeColor=010101)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)

> **crwsync** is a highly scalable, real-time collaborative workspace platform. Engineered to streamline enterprise project management, it provides mission-critical synchronization of tasks, files, and team communication across distributed environments.

---

## 📑 Table of Contents

1. [Key Features](#-key-features)
2. [System Architecture](#-system-architecture)
3. [Prerequisites](#-prerequisites)
4. [Environment Configuration](#-environment-configuration)
5. [Local Development](#-local-development)
6. [Docker & Production Deployment](#-docker--production-deployment)
7. [Security & Compliance](#-security--compliance)
8. [License & Copyright](#-license--copyright)

---

## ✨ Key Features

* ⚡ **Real-Time Sync:** Collaborative editing and instant state updates powered by Socket.io and Redis Pub/Sub.
* 📂 **Modular Workspace:** Enterprise-grade task management within a decoupled monorepo.
* 🔄 **Resilient Queues:** Distributed background job processing via BullMQ to handle high-load operations.
* 🛡️ **Advanced Security:** Session-based authentication using short-lived JWTs and HTTP-only cookies.
* 📊 **Optimistic UI:** Seamless user experience with TanStack Query and Zustand state management.

---

## 🏗 System Architecture

**crwsync** is built as a robust, enterprise-grade monorepo managed by **Turborepo** and **pnpm**. The architecture is decoupled into specialized micro-applications, containerized via Docker, and orchestrated using Docker Swarm/Compose for high availability and strict resource management.

### 🌐 Core Services

* **Backend API (`@crwsync/backend`)**
  * **Framework:** NestJS (v11) for strict, modular, and testable server-side logic.
  * **Persistence:** PostgreSQL managed via Prisma ORM (v7) with `@prisma/adapter-pg`.
  * **Real-Time Engine:** Socket.IO integrated with Redis Adapter for horizontal WebSocket scaling.
  * **Job Queues:** BullMQ for distributed, asynchronous background task processing.
  * **Identity & Access:** Passport.js (JWT/Local), bcrypt hashing, and strict HttpOnly/Secure cookies.
  * **Communications:** Nodemailer and Handlebars for dynamic, localized email delivery.

* **Dashboard Client (`@crwsync/dash`)**
  * **Framework:** Next.js (v16) & React (v19) with Server Components.
  * **UI/UX:** Tailwind CSS (v4) and Radix UI primitives for accessible, design-system-compliant interfaces.
  * **State & Data:** Zustand (v5) for global state; TanStack React Query (v5) for caching and optimistic updates.

* **Web Portal (`@crwsync/web`)**
  * Public-facing landing and marketing portal, running concurrently with the dashboard to ensure separation of concerns between public traffic and authenticated workloads.

---

### ⚙️ Infrastructure

* **Caching & Pub/Sub:** Alpine-based Redis 7 with persistent volume claims and strict authentication.
* **Domain & Routing:** In production, the applications share a root domain via subdomains (crwsync.com for the Web Portal and dash.crwsync.com for the Dashboard), orchestrated by a reverse proxy to handle SSL termination and cross-subdomain cookie persistence.
* **Orchestration:** Built-in stack.yml definitions featuring parallel rollback configurations, CPU/Memory reservations (e.g., strict 1.0 CPU / 1GB RAM limits per core service).

---

## 🔨 Prerequisites

Ensure your local development environment meets the following baseline requirements:

* **Node.js**: `v20.x LTS` or higher.
* **Package Manager**: `pnpm` (strictly `v10.29.3`).
* **Containerization**: `Docker Engine` (v24+) and `Docker Compose` for local infrastructure replication.

---

## 🔐 Environment Configuration

Before starting the application, you must configure your environment variables.

> Create a `.env` file in the `apps/frontend/web` directory and populate it with the following variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_DASH_URL=http://localhost:3000
```

> Create a `.env` file in the `apps/frontend/dash` directory and populate it with the following variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

> Create a `.env` file in the `apps/backend` directory and populate it with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/crwsync?schema=public

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_KEY_PREFIX=crwsync:

# Prisma Configuration
PRISMA_LOG_QUERY=true

# Mail Configuration (Example using Zoho Mail)
MAIL_HOST=smtp.zoho.eu
MAIL_PORT=587
MAIL_USER=YOUR_EMAIL
MAIL_PASS=YOUR_PASSWORD

# Authentication
JWT_ACCESS_TOKEN_SECRET=YOUR_SECRET
JWT_REFRESH_TOKEN_SECRET=YOUR_SECRET

# Session Management
PURGE_SESSIONS_DAYS=30

# Cookies
COOKIE_SECRET=YOUR_SECRET
ACCESS_COOKIE_DOMAIN=localhost
REFRESH_COOKIE_DOMAIN=localhost

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
APP_URL=http://localhost:8080
```

---

## 💻 Local Development

1. **Install Dependencies**
   Leverage pnpm's strict workspace resolution:

   ```bash
   pnpm install
   ```

2. **Initialize Infrastructure**
   Set up your local database and caching layers using Docker:
    Make sure you have [Docker](https://www.docker.com/products/docker-desktop/) installed, then run the following command in the root of the project:

    ```bash
    docker-compose -f docker-compose.dev.yml up -d
    ```

    *(This will create containers for PostgreSQL on port `5432` and Redis on port `6379`. To stop the services later, run `docker-compose -f docker-compose.dev.yml down`).*

3. **Database Migrations & Typing**
   Generate the Prisma client and apply pending migrations to your local database:

   ```bash
   pnpm --filter @crwsync/backend run prisma:generate
   pnpm --filter @crwsync/backend run prisma:migrate:dev
   ```

4. **Start the Development Servers**
   Boot the monorepo using Turborepo's parallel execution pipeline:

   ```bash
   pnpm run dev
   ```

   * *Web Portal:* `http://localhost:3000`
   * *Dashboard:* `http://localhost:3001`
   * *API Gateway:* `http://localhost:8080`

## 🐳 Docker & Production Deployment

The application is bundled with a production-ready `stack.yml` file engineered for Docker Swarm. It features automatic restarts, update delays, and strict resource isolation.

**Building for Production**

To compile all applications and packages locally:

```bash
pnpm run build
```

**Swarm Deployment**

To deploy the stack on a Swarm manager:

```bash
docker stack deploy -c stack.yml crwsync
```

*Note: Deployment to production environments is typically handled automatically via our CI/CD pipelines upon merging to the main branch.*

---

## 🔐 Security & Compliance

* **Data Rest:** Passwords are one-way hashed using `bcrypt` with a minimum of 10 rounds.
* **Data Transit:** All internal service communication should be deployed behind a reverse proxy (e.g., Nginx, Traefik) terminating TLS 1.3.
* **Session Management:** Utilizes short-lived JWTs coupled with strictly scoped, HTTP-only, secure cookies to mitigate XSS and CSRF attack vectors.

---

## 📄 License & Copyright

**Proprietary and Confidential**

* **Author**: Tunya Lénárd-Sándor (GitHub: [@JustTunya](https://github.com/JustTunya))
* **License**: Proprietary Evaluation License

This repository and its source code are provided strictly for **viewing and portfolio evaluation purposes**.
All rights are reserved. No permission is granted to use, copy, modify, distribute, or deploy this software, in whole or in part, via any medium, without explicit written permission from the author.
For full details, please refer to the [LICENSE](LICENSE) file located in the root of this repository.
