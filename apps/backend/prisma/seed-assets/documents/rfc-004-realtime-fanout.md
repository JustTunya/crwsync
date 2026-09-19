# RFC-004: Real-Time Event Fanout & Horizontal WebSocket Scaling

- **Author:** Devon Vance (Senior Backend Engineer)
- **Status:** Approved / In Implementation
- **Target Release:** Sprint 14
- **Stakeholders:** Mara Ellis (Product), Tobias Reyes (Fullstack Lead), Marcus Thorne (QA)

---

## 1. Executive Summary

As Northstar Labs scales past 500 concurrent active workspace sessions, single-process Socket.IO gateways experience CPU saturation during large burst broadcasts (e.g. `@everyone` notifications or board column batch re-orders). 

This RFC outlines the architectural migration from in-memory socket rooms to a Redis Pub/Sub adapter (`@socket.io/redis-adapter`) coupled with BullMQ persistence workers and client-side optimistic reconciliation.

---

## 2. Problem Statement & Bottlenecks

1. **Gateway Node Affinity:** Clients connected to Node A do not receive events emitted by actions handled on Node B.
2. **Event Amplification:** Broadcasting a `board:task:moved` event to 100 members currently blocks the Node.js event loop for ~18ms.
3. **Database Write Pressure:** Chat read receipts and message delivery acks generate 1,200 small write queries/sec during peak hours.

---

## 3. Proposed Architecture

### 3.1 Redis Pub/Sub Cluster Adapter

```
[ Next.js Client ] ── WebSocket ──> [ NestJS Gateway Instance 1 ]
                                            │
                                      Redis Streams / PubSub
                                            │
[ Next.js Client ] ── WebSocket ──> [ NestJS Gateway Instance 2 ]
```

- Each NestJS gateway node attaches to the Redis cluster using `createAdapter(pubClient, subClient)`.
- Room namespaces are partitioned by workspace: `workspace_{workspaceId}` and module `module_{referenceId}`.

### 3.2 Write Batching Strategy for Read Receipts

- Client emits `chat:read` payload containing `{ roomId, messageId, timestamp }`.
- Gateway executes `HSET buffer:read_receipts:{roomId} {userId} {messageId}` with an atomic 2-second debounced flush.
- BullMQ worker performs a bulk `INSERT ... ON CONFLICT DO UPDATE` into PostgreSQL.

---

## 4. Benchmarks & Target SLAs

| Metric | Target | Current Baseline |
| :--- | :--- | :--- |
| Handshake latency (p95) | < 45ms | 110ms |
| Event fanout propagation (p99) | < 25ms | 85ms |
| Max concurrent connections / node | 5,000 | 1,200 |
| Memory footprint per socket | < 12 KB | 38 KB |

---

## 5. Security & Authorization

All WebSocket connections must supply an HttpOnly session cookie validated against the Redis session store on handshake:

```typescript
async validateConnection(client: Socket): Promise<ActiveUser> {
  const token = parseCookie(client.handshake.headers.cookie);
  const session = await this.sessionService.verify(token);
  if (!session) throw new WsException('Unauthorized');
  return session.user;
}
```

---

## 6. Rollout & Fallback Plan

1. Deploy Redis RedisIoAdapter behind feature flag `FF_REDIS_SOCKET_ADAPTER`.
2. Canary deployment on 10% of active workspaces for 48 hours.
3. Automated rollback trigger if WebSocket reconnect rate exceeds 2.5% in a 5-minute window.
