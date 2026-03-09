# 🏛️ CRWSYNC System Architecture

This document provides a comprehensive overview of the CRWSYNC enterprise architecture. The system is designed as a highly scalable, real-time collaborative workspace platform using a modern monorepo approach.

## 🚁 High-Level Overview

CRWSYNC is an event-driven, real-time application composed of distinct frontend applications communicating with a modular, microservice-ready backend. It heavily utilizes WebSockets for live updates across Chat and Kanban features, with intelligent automation powered by Google Antigravity.

### Core Stack

* **Monorepo Management**: Turborepo & pnpm.
* **Frontends**: Next.js (App Router), React, Tailwind CSS, Zustand, Shadcn UI.
* **Backend API**: NestJS, TypeScript, Passport (JWT Auth).
* **Database**: PostgreSQL with Prisma ORM.
* **Caching & Real-time**: Redis (Session Store & Socket.io Adapter).
* **AI/Agentic Layer**: Google Antigravity.
* **Infrastructure**: Docker, GitHub Actions (CI/CD).

---

## 🏗️ System Components

### 1. Frontend Applications (`apps/frontend/`)

Divided into two separate Next.js applications to optimize bundle sizes and SEO requirements.

* **`web` (Landing & Auth)**:
  * Public-facing marketing pages.
  * Authentication flows (Signup, Login, Forgot Password, Email Verification).
* **`dash` (Main Application)**:
  * The core workspace application hidden behind an auth wall.
  * Highly interactive components: Real-time chat (`ChatRoom.tsx`), drag-and-drop Kanban boards (`KanbanCol.tsx`), and dynamic sidebars.
  * Connects to backend WebSockets using custom React hooks (`use-chat-socket.ts`).

### 2. Backend Services (`apps/backend/`)

A modular NestJS application serving as the source of truth.

* **REST API Modules**: Handles CRUD for Workspaces, Boards, Users, and Sessions. Protected by robust guards (`jwt-auth.guard.ts`, `ws-member.guard.ts`, `ws-roles.guard.ts`).
* **WebSocket Gateways**:
  * `ChatGateway`: Manages real-time message broadcasting, typing indicators, and emoji reactions.
  * `StatusGateway`: Manages user presence (Online, Offline, Busy).
* **Workers/Processors**: Features like the Email Processor (`email.processor.ts`) run background jobs decoupled from the main request-response cycle.

### 3. Shared Packages (`packages/`)

Internal libraries ensuring consistency across the monorepo:

* **`@crwsync/types`**: Shared TypeScript interfaces containing DTOs, Enums, and database types utilized by both Next.js and NestJS.
* **`@crwsync/styles`**: Global CSS (`globals.css`) and Tailwind configurations shared across frontends.
* **`@crwsync/templates`**: Handlebars (`.hbs`) templates used by the backend for transaction emails.

---

## 🔄 Data Flow & Real-Time Sync

CRWSYNC requires sub-millisecond latency for collaborative features. This is achieved via our Redis Pub/Sub topology.

Workflow Example: Sending a Chat Message

1. **Client A** sends a socket event (`sendMessage`) containing the text.
2. **NestJS Node 1** receives the socket event. It validates the user session and workspace permissions via Prisma.
3. The message is persisted to **PostgreSQL**.
4. Node 1 publishes the event to the **Redis** cluster using `RedisIoAdapter`.
5. **NestJS Node 2** (where Client B is connected) receives the pub/sub event and pushes the message to Client B via WebSocket.
6. Simultaneously, **Google Antigravity** parses the message for automated insights (see `AGENTS.md`).

---

## 🗄️ Data Model Overview

The database is managed via Prisma (`apps/backend/prisma/schema.prisma`). Core entities include:

* **User**: Central identity. Ties to Sessions.
* **Workspace**: Top-level organizational unit.
* **WorkspaceMember**: Handles RBAC (Role-Based Access Control) via Enums (OWNER, ADMIN, MEMBER).
* **Board & Kanban Modules**: Tasks, Columns, and rich-text descriptions.
* **Chat**: Rooms, Messages, Mentions (`20260303090237_add_chat_mentions`), and Threading (Self-relations).

---

## 🚀 Deployment & Infrastructure

The application is fully containerized.

1. **Docker**: Standardized `Dockerfile` implementations for `apps/backend`, `apps/frontend/dash`, and `apps/frontend/web`.
2. **CI/CD pipeline**: Configured via `.github/workflows/deploy.yml`. Merges to the `main` branch trigger Turborepo to intelligently build only the packages that have changed, drastically reducing build times.
3. **Session Management**: JWTs are managed with secure HTTP-only cookies (`auth.cookie.ts`) to prevent XSS. Redis stores actively rotated sessions (`rotate-session.dto.ts`) allowing remote sign-outs across devices.
