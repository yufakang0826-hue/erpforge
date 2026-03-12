/**
 * Sync Worker Template — BullMQ Background Job
 *
 * Template for a platform data sync worker that:
 * - Pulls data from a platform API
 * - Transforms and normalizes the data
 * - Upserts to the local database
 * - Handles deduplication and conflict resolution
 * - Prevents job reentrancy (one sync per store at a time)
 */
import { Worker, Queue, type Job } from 'bullmq';
import type Redis from 'ioredis';
import { platformRegistry } from './base-engine.js';

// ─── Types ────────────────────────────────────────────────

export interface SyncJobData {
  storeId: string;
  tenantId: string;
  platform: string;
  since?: string; // ISO date string
  fullSync?: boolean;
}

export interface SyncJobResult {
  synced: number;
  skipped: boolean;
  errors: number;
  duration: number;
}

// ─── Queue Definition ─────────────────────────────────────

export function createSyncQueue(name: string, connection: Redis): Queue<SyncJobData> {
  return new Queue<SyncJobData>(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000,
      },
      removeOnComplete: { count: 1000, age: 86_400 },
      removeOnFail: { count: 5000, age: 604_800 },
    },
  });
}

// ─── Reentrancy Guard ─────────────────────────────────────

/**
 * Simple reentrancy guard using Redis.
 * Prevents multiple sync jobs from running for the same store simultaneously.
 */
class ReentrancyGuard {
  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number = 3600): Promise<boolean> {
    const result = await this.redis.set(`sync:lock:${key}`, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.redis.del(`sync:lock:${key}`);
  }
}

// ─── Worker Factory ───────────────────────────────────────

/**
 * Create a sync worker for a specific sync type.
 *
 * @param queueName - Queue name to consume from
 * @param connection - Redis connection
 * @param syncFn - The actual sync logic to execute
 *
 * @example
 * const orderSyncWorker = createSyncWorker(
 *   'order-sync',
 *   redisConnection,
 *   async (job, engine, storeId, since) => {
 *     const result = await engine.syncOrders(storeId, since);
 *     await upsertOrders(job.data.tenantId, result.items);
 *     return result.items.length;
 *   },
 * );
 */
export function createSyncWorker(
  queueName: string,
  connection: Redis,
  syncFn: (
    job: Job<SyncJobData>,
    storeId: string,
    platform: string,
    since: Date,
  ) => Promise<number>,
): Worker<SyncJobData, SyncJobResult> {
  const guard = new ReentrancyGuard(connection);

  return new Worker<SyncJobData, SyncJobResult>(
    queueName,
    async (job) => {
      const { storeId, platform, since, fullSync } = job.data;
      const startTime = Date.now();
      const lockKey = `${queueName}:${storeId}`;

      // 1. Reentrancy check
      const acquired = await guard.acquire(lockKey);
      if (!acquired) {
        job.log(`Skipped: another ${queueName} job is running for store ${storeId}`);
        return { synced: 0, skipped: true, errors: 0, duration: 0 };
      }

      try {
        // 2. Determine sync start date
        const sinceDate = fullSync
          ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days back for full sync
          : since
            ? new Date(since)
            : new Date(Date.now() - 3 * 60 * 60 * 1000); // Default: 3 hours back

        job.log(`Starting ${queueName} for store ${storeId} since ${sinceDate.toISOString()}`);

        // 3. Execute sync
        const synced = await syncFn(job, storeId, platform, sinceDate);

        const duration = Date.now() - startTime;
        job.log(`Completed: synced ${synced} items in ${duration}ms`);

        return { synced, skipped: false, errors: 0, duration };

      } catch (error) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);
        job.log(`Failed after ${duration}ms: ${message}`);
        throw error; // Let BullMQ handle retry

      } finally {
        // 4. Always release lock
        await guard.release(lockKey);
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );
}

// ─── Scheduler Registration ───────────────────────────────

/**
 * Register scheduled sync jobs for all active stores.
 *
 * @example
 * await registerScheduledSync(orderSyncQueue, stores, 2 * 60 * 60 * 1000); // every 2h
 */
export async function registerScheduledSync(
  queue: Queue<SyncJobData>,
  stores: Array<{ id: string; tenantId: string; platform: string }>,
  intervalMs: number,
): Promise<void> {
  for (const store of stores) {
    await queue.add(
      `${queue.name}:${store.id}`,
      {
        storeId: store.id,
        tenantId: store.tenantId,
        platform: store.platform,
      },
      {
        repeat: { every: intervalMs },
        jobId: `${queue.name}:${store.id}`, // Prevent duplicate repeatable jobs
      },
    );
  }
}
