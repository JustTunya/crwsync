# 🤖 Agentic Framework & Operations (CRWSYNC)

This document outlines the architecture, responsibilities, and operational guidelines for the intelligent agents operating within the CRWSYNC ecosystem. Our agentic workflows are powered exclusively by **Google Antigravity**, enabling zero-overhead deployment, infinite horizontal scaling, and seamless contextual grounding across the workspace.

## 🌌 The Google Antigravity Advantage

CRWSYNC leverages Google Antigravity to orchestrate our multi-agent system. Antigravity allows our NestJS backend to offload complex reasoning, natural language processing, and background automation tasks without explicitly managing heavy ML infrastructure.

**Key benefits in our stack:**

- **Zero-Gravity Execution**: Agents spin up instantly in response to webhooks or Redis events.
- **Contextual Buoyancy**: Agents maintain persistent memory across Chat and Kanban modules without continuous database polling.
- **Seamless Pub/Sub**: Natively integrates with our `RedisIoAdapter` to stream agent responses directly into our WebSocket gateways (`chat.gateway.ts`, `status.gateway.ts`).

---

## 🎭 Agent Topology

Our platform utilizes a hierarchical multi-agent topology to separate concerns and ensure data privacy across Workspaces.

### 1. The Workspace Orchestrator (Root Agent)

The Orchestrator acts as the primary router for all user-initiated AI requests.

- **Trigger**: Invoked via `@crwsync` mentions in Chat or specific prompts in Kanban Rich Text Editors.
- **Responsibilities**:
  - Intent classification (e.g., "Is the user asking for a summary, or creating a task?").
  - Delegation to specialized Sub-Agents.
  - Privilege escalation checks (ensuring agents only access data permitted by `ws-roles.guard.ts`).

### 2. Kanban Optimization Agent (TaskMaster)

Focused purely on board and task management.

- **Trigger**: Webhooks on Board CRUD operations, or delegated commands from the Orchestrator.
- **Responsibilities**:
  - **Auto-Tagging**: Analyzing task descriptions in `KanbanTask.tsx` to automatically assign labels.
  - **Backlog Grooming**: Identifying stale tasks and suggesting reassignment.
  - **Workload Balancing**: Recommending sprint allocations based on user availability (`use-availability.tsx`).

### 3. Collaborative Chat Agent (InsightBot)

Operates within `ChatRoom.tsx` to enhance real-time communication.

- **Trigger**: Real-time evaluation of the WebSocket message stream (via Redis Pub/Sub).
- **Responsibilities**:
  - **Action Item Extraction**: Identifying promises or requests in chat and converting them directly into Kanban tasks.
  - **Thread Summarization**: Providing TL;DRs for long chat threads when a user catches up.
  - **Toxicity / Moderation**: Ensuring workspace safety in real-time.

---

## 🛠️ Integration Architecture

### Event Flow Pipeline

1. **Emission**: A user triggers an action (e.g., posts a message in `MessageInput.tsx`).
2. **Gateway**: The NestJS `ChatGateway` receives the payload and writes it to the PostgreSQL DB via Prisma.
3. **Dispatch**: A background service publishes an event to Redis (`cache-keys.ts`).
4. **Antigravity Lift**: Google Antigravity runtime intercepts the Redis event.
5. **Execution**: The relevant Agent processes the prompt against the workspace context.
6. **Delivery**: The Agent pushes the finalized insight back via WebSocket, arriving as a `MessageBubble.tsx` with an AI indicator.

### Security & Boundaries

- **Tenant Isolation**: Every Antigravity session is initialized with a secure context containing only the `workspaceId` and permitted `boardIds`.
- **Statelessness**: Agents do not store PII. All long-term semantic memory is managed within the core PostgreSQL instance via vector embeddings, ensuring absolute compliance with enterprise data policies.
