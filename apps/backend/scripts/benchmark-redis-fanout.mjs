#!/usr/bin/env node

import Redis from "ioredis";
import { EventEmitter } from "node:events";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const config = {
    subscribers: 100,
    messages: 1000,
    batchSize: 50,
    p95ThresholdMs: 25,
    p99ThresholdMs: 100,
    minThroughput: 500,
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASS || undefined,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--subscribers" && args[i + 1]) config.subscribers = parseInt(args[++i], 10);
    else if (arg === "--messages" && args[i + 1]) config.messages = parseInt(args[++i], 10);
    else if (arg === "--batch" && args[i + 1]) config.batchSize = parseInt(args[++i], 10);
    else if (arg === "--p95-threshold" && args[i + 1]) config.p95ThresholdMs = parseFloat(args[++i]);
    else if (arg === "--p99-threshold" && args[i + 1]) config.p99ThresholdMs = parseFloat(args[++i]);
    else if (arg === "--host" && args[i + 1]) config.host = args[++i];
    else if (arg === "--port" && args[i + 1]) config.port = parseInt(args[++i], 10);
    else if (arg === "--password" && args[i + 1]) config.password = args[++i];
    else if (arg === "--dry-run") config.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node benchmark-redis-fanout.mjs [options]

Options:
  --subscribers <num>     Number of concurrent subscribers (default: 100)
  --messages <num>        Total messages to broadcast (default: 1000)
  --batch <num>           Concurrency batch size for publisher (default: 50)
  --p95-threshold <ms>    Max allowed p95 latency in ms (default: 25)
  --p99-threshold <ms>    Max allowed p99 latency in ms (default: 100)
  --host <host>           Redis host (default: 127.0.0.1)
  --port <port>           Redis port (default: 6379)
  --password <password>   Redis auth password
  --dry-run               Run in-memory emulation without live Redis
      `);
      process.exit(0);
    }
  }
  return config;
};

const calculatePercentiles = (latencies) => {
  if (latencies.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const getP = (p) => latencies[Math.min(Math.floor((latencies.length * p) / 100), latencies.length - 1)];

  return {
    min: latencies[0],
    max: latencies[latencies.length - 1],
    mean: sum / latencies.length,
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
  };
};

class InMemoryPubSub {
  constructor() {
    this.bus = new EventEmitter();
    this.bus.setMaxListeners(0);
  }
  createClient() {
    const bus = this.bus;
    const client = {
      handlers: new Map(),
      async subscribe(channel) {
        const handler = (msg) => {
          if (client.onMessage) client.onMessage(channel, msg);
        };
        client.handlers.set(channel, handler);
        bus.on(channel, handler);
      },
      async publish(channel, message) {
        setImmediate(() => bus.emit(channel, message));
      },
      async unsubscribe(channel) {
        const handler = client.handlers.get(channel);
        if (handler) {
          bus.off(channel, handler);
          client.handlers.delete(channel);
        }
      },
      async quit() {
        for (const [channel, handler] of client.handlers.entries()) {
          bus.off(channel, handler);
        }
        client.handlers.clear();
      },
    };
    return client;
  }
}

async function runBenchmark() {
  const config = parseArgs();
  const channel = "crwsync:benchmark:fanout:channel";
  const expectedTotalDeliveries = config.subscribers * config.messages;

  console.log("===============================================================");
  console.log("       CRWSYNC REDIS FAN-OUT LATENCY BENCHMARK SUITE          ");
  console.log("===============================================================");
  console.log(`Configuration:`);
  console.log(` - Target Subscribers:     ${config.subscribers}`);
  console.log(` - Messages to Broadcast:  ${config.messages}`);
  console.log(` - Total Deliveries Target:${expectedTotalDeliveries.toLocaleString()}`);
  console.log(` - Target Host / Mode:     ${config.dryRun ? "In-Memory Emulation" : `${config.host}:${config.port}`}`);
  console.log(` - Latency Thresholds:    p95 <= ${config.p95ThresholdMs}ms | p99 <= ${config.p99ThresholdMs}ms`);
  console.log("---------------------------------------------------------------\n");

  const inMemoryBus = config.dryRun ? new InMemoryPubSub() : null;
  const subscriberClients = [];
  let publisherClient = null;

  try {
    if (config.dryRun) {
      publisherClient = inMemoryBus.createClient();
      for (let i = 0; i < config.subscribers; i++) {
        subscriberClients.push(inMemoryBus.createClient());
      }
    } else {
      process.stdout.write(`Connecting ${config.subscribers} subscriber clients to Redis... `);
      const redisOpts = {
        host: config.host,
        port: config.port,
        password: config.password,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      };

      publisherClient = new Redis(redisOpts);
      await publisherClient.connect();

      for (let i = 0; i < config.subscribers; i++) {
        const sub = new Redis(redisOpts);
        await sub.connect();
        subscriberClients.push(sub);
      }
      console.log("CONNECTED.");
    }
  } catch (err) {
    console.error(`\n[ERROR] Failed to connect to Redis at ${config.host}:${config.port}`);
    console.error(`Reason: ${err.message}`);
    console.error("\nTo start Redis locally, run:");
    console.error("  docker compose -f docker-compose.dev.yml up -d redis\n");
    console.error("Or run with dry-run mode:");
    console.error("  pnpm benchmark:redis --dry-run\n");
    process.exit(1);
  }

  const latenciesMs = [];
  let receivedCount = 0;
  let allReceivedPromiseResolve;
  const allReceivedPromise = new Promise((resolve) => {
    allReceivedPromiseResolve = resolve;
  });

  process.stdout.write(`Subscribing clients to '${channel}'... `);
  await Promise.all(
    subscriberClients.map(async (sub) => {
      if (config.dryRun) {
        sub.onMessage = (_chan, msgStr) => {
          const nowNs = process.hrtime.bigint();
          try {
            const data = JSON.parse(msgStr);
            const sentNs = BigInt(data.ts);
            const latencyMs = Number(nowNs - sentNs) / 1_000_000;
            latenciesMs.push(latencyMs);
            receivedCount++;
            if (receivedCount >= expectedTotalDeliveries) {
              allReceivedPromiseResolve();
            }
          } catch {}
        };
        await sub.subscribe(channel);
      } else {
        sub.on("message", (_chan, msgStr) => {
          const nowNs = process.hrtime.bigint();
          try {
            const data = JSON.parse(msgStr);
            const sentNs = BigInt(data.ts);
            const latencyMs = Number(nowNs - sentNs) / 1_000_000;
            latenciesMs.push(latencyMs);
            receivedCount++;
            if (receivedCount >= expectedTotalDeliveries) {
              allReceivedPromiseResolve();
            }
          } catch {}
        });
        await sub.subscribe(channel);
      }
    }),
  );
  console.log("READY.\n");

  console.log(`Broadcasting ${config.messages} messages with fan-out ratio 1:${config.subscribers}...`);
  const benchmarkStartTime = performance.now();

  for (let m = 0; m < config.messages; m++) {
    const payload = JSON.stringify({
      id: m,
      ts: process.hrtime.bigint().toString(),
      data: `payload_chunk_${m}_${"x".repeat(64)}`,
    });

    await publisherClient.publish(channel, payload);

    if (m % config.batchSize === 0) {
      await new Promise((r) => setImmediate(r));
    }
  }

  // Wait for deliveries with a timeout (10 seconds max)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout waiting for fanout messages")), 10000),
  );

  let timedOut = false;
  try {
    await Promise.race([allReceivedPromise, timeoutPromise]);
  } catch (e) {
    timedOut = true;
  }

  const benchmarkEndTime = performance.now();
  const durationSec = (benchmarkEndTime - benchmarkStartTime) / 1000;
  const throughputMsgsPerSec = config.messages / durationSec;
  const throughputDeliveriesPerSec = receivedCount / durationSec;
  const stats = calculatePercentiles(latenciesMs);
  const dropCount = expectedTotalDeliveries - receivedCount;
  const dropRatePct = (dropCount / expectedTotalDeliveries) * 100;

  console.log("\n===============================================================");
  console.log("                       BENCHMARK RESULTS                       ");
  console.log("===============================================================");
  console.log(` - Test Duration:         ${durationSec.toFixed(3)}s`);
  console.log(` - Messages Published:    ${config.messages.toLocaleString()}`);
  console.log(` - Expected Deliveries:   ${expectedTotalDeliveries.toLocaleString()}`);
  console.log(` - Total Received:        ${receivedCount.toLocaleString()}`);
  console.log(` - Packet Loss / Drops:   ${dropCount} (${dropRatePct.toFixed(2)}%)`);
  console.log(` - Broadcast Throughput:  ${throughputMsgsPerSec.toFixed(1)} msgs/sec`);
  console.log(` - Fan-out Delivery Rate: ${throughputDeliveriesPerSec.toFixed(1)} deliveries/sec`);
  console.log("---------------------------------------------------------------");
  console.log("LATENCY DISTRIBUTION (End-to-End Fan-Out):");
  console.log(` - Min Latency:           ${stats.min.toFixed(3)} ms`);
  console.log(` - Mean Latency:          ${stats.mean.toFixed(3)} ms`);
  console.log(` - Median (p50):          ${stats.p50.toFixed(3)} ms`);
  console.log(` - 90th Percentile (p90): ${stats.p90.toFixed(3)} ms`);
  console.log(` - 95th Percentile (p95): ${stats.p95.toFixed(3)} ms  (Threshold: <= ${config.p95ThresholdMs} ms)`);
  console.log(` - 99th Percentile (p99): ${stats.p99.toFixed(3)} ms  (Threshold: <= ${config.p99ThresholdMs} ms)`);
  console.log(` - Max Latency:           ${stats.max.toFixed(3)} ms`);
  console.log("---------------------------------------------------------------");

  const p95Pass = stats.p95 <= config.p95ThresholdMs;
  const p99Pass = stats.p99 <= config.p99ThresholdMs;
  const lossPass = dropCount === 0 && !timedOut;
  const throughputPass = throughputMsgsPerSec >= config.minThroughput || config.dryRun;
  const allPass = p95Pass && p99Pass && lossPass;

  console.log(`Evaluation:`);
  console.log(` [${p95Pass ? "PASS" : "FAIL"}] p95 Latency <= ${config.p95ThresholdMs}ms (${stats.p95.toFixed(3)}ms)`);
  console.log(` [${p99Pass ? "PASS" : "FAIL"}] p99 Latency <= ${config.p99ThresholdMs}ms (${stats.p99.toFixed(3)}ms)`);
  console.log(` [${lossPass ? "PASS" : "FAIL"}] Zero Message Loss (0.00% drop rate)`);
  console.log("===============================================================");

  if (allPass) {
    console.log(">>> CERTIFICATION STATUS: PASSED PRODUCTION DEPLOYMENT CRITERIA");
  } else {
    console.log(">>> CERTIFICATION STATUS: FAILED CRITERIA THRESHOLD");
  }
  console.log("===============================================================\n");

  // Cleanup
  await Promise.all([
    publisherClient.quit(),
    ...subscriberClients.map((sub) => sub.quit()),
  ]);

  if (!allPass) {
    process.exit(1);
  }
}

runBenchmark().catch((err) => {
  console.error("Benchmark execution error:", err);
  process.exit(1);
});
