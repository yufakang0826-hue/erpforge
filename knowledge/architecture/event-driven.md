# Event-Driven Architecture — BullMQ Patterns

> Defines background job processing patterns using BullMQ for platform sync, notifications, report generation, and more.

---

## 1. BullMQ Worker Pattern

### 1.1 Architecture Overview

```
┌──────────────┐     ┌────────────┐     ┌──────────────────┐
│  Application │────→│   Redis    │←────│    Workers        │
│  (Producer)  │     │   Queue    │     │  (Consumers)      │
└──────────────┘     └────────────┘     └──────────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ↓                   ↓                   ↓
                     OrderSync           InventorySync       ReportGen
                     Worker              Worker              Worker
```

### 1.2 Queue Definition

```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Define queues
export const orderSyncQueue = new Queue('order-sync', { connection });
export const inventorySyncQueue = new Queue('inventory-sync', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const reportQueue = new Queue('report-generation', { connection });
```

### 1.3 Worker Template

```typescript
import { Worker, Job } from 'bullmq';

const orderSyncWorker = new Worker(
  'order-sync',
  async (job: Job<OrderSyncJobData>) => {
    const { storeId, since, platform } = job.data;

    // 1. Reentrancy check
    const isRunning = await checkRunningJob(storeId, 'order-sync');
    if (isRunning) {
      job.log('Skipped: another sync job is running for this store');
      return { skipped: true };
    }

    // 2. Mark as running
    await markJobRunning(storeId, 'order-sync', job.id);

    try {
      // 3. Get platform engine
      const engine = platformRegistry.get(platform);

      // 4. Sync orders
      const result = await engine.syncOrders(storeId, since);

      // 5. Upsert to database
      await upsertOrders(result.items);

      // 6. Update sync timestamp
      await updateLastSyncTime(storeId, 'orders', new Date());

      job.log(`Synced ${result.items.length} orders`);
      return { synced: result.items.length };

    } finally {
      // 7. Clear running state
      await clearJobRunning(storeId, 'order-sync');
    }
  },
  {
    connection,
    concurrency: 5,            // Process 5 jobs simultaneously
    limiter: {
      max: 10,
      duration: 60_000,        // Max 10 jobs per minute
    },
  }
);

// Error handling
orderSyncWorker.on('failed', (job, err) => {
  logger.error(`Order sync failed for store ${job?.data.storeId}`, err);
});

orderSyncWorker.on('completed', (job, result) => {
  logger.info(`Order sync completed for store ${job.data.storeId}`, result);
});
```

---

## 2. Common Workers

### 2.1 Worker Catalog

| Worker | Queue | Purpose | Schedule |
|--------|-------|---------|----------|
| `OrderSync` | `order-sync` | Pull orders from platform | Every 2h per store |
| `ReturnSync` | `return-sync` | Pull return/refund data | Every 4h per store |
| `TransactionSync` | `transaction-sync` | Pull financial transactions | Every 6h per store |
| `PayoutSync` | `payout-sync` | Pull payout records | Every 12h per store |
| `InventorySync` | `inventory-sync` | Push/pull inventory levels | Every 30min |
| `TrackingUpload` | `tracking-upload` | Upload tracking to platforms | On shipment creation |
| `TrackingSync` | `tracking-sync` | Pull tracking updates | Every 4h |
| `NotificationDispatch` | `notification` | Send emails, Slack, webhooks | On event |
| `ReportGeneration` | `report-generation` | Generate CSV/PDF reports | On demand |
| `ExchangeRateSync` | `exchange-rate` | Fetch daily exchange rates | Daily at UTC 08:00 |

### 2.2 Scheduled Jobs (Cron)

```typescript
// sync-scheduler.ts
async function registerScheduledJobs() {
  // Get all active stores
  const stores = await getActiveStores();

  for (const store of stores) {
    // Order sync: every 2 hours
    await orderSyncQueue.add(
      `order-sync:${store.id}`,
      { storeId: store.id, platform: store.platform },
      {
        repeat: { every: 2 * 60 * 60 * 1000 }, // 2h
        jobId: `order-sync:${store.id}`,         // prevent duplicates
      }
    );

    // Transaction sync: every 6 hours
    await transactionSyncQueue.add(
      `tx-sync:${store.id}`,
      { storeId: store.id, platform: store.platform },
      {
        repeat: { every: 6 * 60 * 60 * 1000 },
        jobId: `tx-sync:${store.id}`,
      }
    );
  }

  // Exchange rate sync: daily at 08:00 UTC
  await exchangeRateQueue.add(
    'daily-rate-sync',
    {},
    {
      repeat: { cron: '0 8 * * *', tz: 'UTC' },
      jobId: 'daily-rate-sync',
    }
  );
}
```

---

## 3. Retry Strategy

### 3.1 Default Retry Configuration

```typescript
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5_000, // Start at 5s, then 10s, then 20s
  },
  removeOnComplete: {
    count: 1000,   // Keep last 1000 completed jobs
    age: 86_400,   // Remove after 24h
  },
  removeOnFail: {
    count: 5000,   // Keep last 5000 failed jobs
    age: 604_800,  // Remove after 7 days
  },
};
```

### 3.2 Retry by Error Type

```typescript
async function processJob(job: Job) {
  try {
    await doWork(job.data);
  } catch (error) {
    if (error instanceof AuthExpiredError) {
      // Don't retry — needs manual re-auth
      throw new UnrecoverableError('Auth expired, re-authentication required');
    }
    if (error instanceof RateLimitError) {
      // Custom retry delay based on rate limit header
      const retryAfter = error.retryAfterMs ?? 60_000;
      await job.moveToDelayed(Date.now() + retryAfter);
      return; // Will be retried after delay
    }
    // Default: throw to trigger standard retry with backoff
    throw error;
  }
}
```

---

## 4. Dead Letter Queue (DLQ)

### 4.1 Pattern

Jobs that fail all retry attempts go to a dead letter queue for manual investigation:

```typescript
// On the worker
orderSyncWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= job.opts.attempts!) {
    // Exhausted all retries → move to DLQ
    await dlqQueue.add('failed-order-sync', {
      originalJobId: job.id,
      originalQueue: 'order-sync',
      jobData: job.data,
      error: err.message,
      failedAt: new Date().toISOString(),
    });

    // Notify operator
    await notificationQueue.add('alert', {
      type: 'job_failed_permanently',
      message: `Order sync for store ${job.data.storeId} failed after ${job.attemptsMade} attempts`,
      error: err.message,
    });
  }
});
```

### 4.2 DLQ Dashboard

Expose DLQ status via API for admin dashboard:

```typescript
router.get('/admin/dlq', async (req, res) => {
  const jobs = await dlqQueue.getJobs(['waiting', 'delayed', 'active']);
  res.json(jobs.map(j => ({
    id: j.id,
    originalQueue: j.data.originalQueue,
    error: j.data.error,
    failedAt: j.data.failedAt,
    data: j.data.jobData,
  })));
});

// Retry a DLQ job
router.post('/admin/dlq/:jobId/retry', async (req, res) => {
  const dlqJob = await dlqQueue.getJob(req.params.jobId);
  if (!dlqJob) return res.status(404).json({ error: 'Job not found' });

  // Re-add to original queue
  const originalQueue = getQueue(dlqJob.data.originalQueue);
  await originalQueue.add(dlqJob.data.originalQueue, dlqJob.data.jobData);
  await dlqJob.remove();

  res.json({ ok: true });
});
```

---

## 5. Circuit Breaker

### 5.1 Pattern

For external API calls (platform APIs, carrier APIs), use a circuit breaker to prevent cascading failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,     // failures before opening
    private readonly timeout: number = 60_000,  // ms to wait before half-open
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### 5.2 Usage with Platform APIs

```typescript
// One circuit breaker per platform per store
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(storeId: string): CircuitBreaker {
  if (!circuitBreakers.has(storeId)) {
    circuitBreakers.set(storeId, new CircuitBreaker(5, 60_000));
  }
  return circuitBreakers.get(storeId)!;
}

// In sync worker
async function syncOrders(storeId: string, platform: string) {
  const breaker = getCircuitBreaker(storeId);
  const engine = platformRegistry.get(platform);

  return breaker.execute(async () => {
    return engine.syncOrders(storeId, lastSyncDate);
  });
}
```

---

## 6. Job Status Tracking

### 6.1 Job Record Schema

```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  store_id UUID NOT NULL,
  job_type VARCHAR(50) NOT NULL,       -- order_sync | transaction_sync | ...
  queue_job_id VARCHAR(100),           -- BullMQ job ID
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending → running → completed | failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);
```

### 6.2 Reentrancy Prevention

```typescript
async function checkRunningJob(storeId: string, jobType: string): Promise<boolean> {
  const running = await db.select()
    .from(syncJobs)
    .where(and(
      eq(syncJobs.storeId, storeId),
      eq(syncJobs.jobType, jobType),
      eq(syncJobs.status, 'running'),
    ))
    .limit(1);
  return running.length > 0;
}
```

---

## 7. Event-Driven Patterns

### 7.1 Event Types

| Event | Trigger | Subscribers |
|-------|---------|-------------|
| `order.synced` | New orders pulled from platform | Accounting (create journal entry), Notification |
| `order.shipped` | Tracking uploaded to platform | Accounting (record COGS), Notification |
| `order.refunded` | Refund issued | Accounting (reversal entry), Notification |
| `transaction.synced` | New transactions pulled | Accounting (payment received entry) |
| `inventory.low` | Stock below threshold | Notification, Procurement |
| `tracking.anomaly` | Shipping anomaly detected | Notification |

### 7.2 Event Bus Pattern

```typescript
// Simple in-process event bus using BullMQ
class EventBus {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('events', { connection });
  }

  async emit(event: string, data: unknown): Promise<void> {
    await this.queue.add(event, { event, data, emittedAt: new Date() });
  }
}

// Event worker subscribes to all events
const eventWorker = new Worker('events', async (job) => {
  const { event, data } = job.data;
  switch (event) {
    case 'order.synced':
      await handleOrderSynced(data);
      break;
    case 'order.shipped':
      await handleOrderShipped(data);
      break;
    // ... more handlers
  }
}, { connection });
```
