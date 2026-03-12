# Platform Engine Template

A complete template for integrating a new e-commerce platform into the ERP system.

## Architecture

```
platform-engine/
├── base-engine.ts     # Abstract PlatformEngine + PlatformRegistry
├── oauth-client.ts    # OAuth2 client (Authorization Code + Client Credentials)
├── api-client.ts      # HTTP client with retry + circuit breaker
├── field-mapper.ts    # Field mapping (platform fields ↔ internal fields)
├── sync-worker.ts     # BullMQ sync worker with reentrancy guard
└── README.md          # This file
```

## How to Add a New Platform

### 1. Create Engine Class

```typescript
// src/modules/{platform}-engine/{platform}-engine.ts
import { PlatformEngine, platformRegistry } from '../platform-engine/base-engine.js';
import { OAuth2Client } from '../platform-engine/oauth-client.js';
import { ApiClient } from '../platform-engine/api-client.js';
import { FieldMapper } from '../platform-engine/field-mapper.js';

class MyPlatformEngine extends PlatformEngine {
  readonly platform = 'my-platform';
  readonly displayName = 'My Platform';

  private readonly oauth: OAuth2Client;
  private readonly api: ApiClient;
  private readonly orderMapper: FieldMapper;

  constructor() {
    super();
    this.oauth = new OAuth2Client({
      clientId: process.env.MY_PLATFORM_CLIENT_ID!,
      clientSecret: process.env.MY_PLATFORM_CLIENT_SECRET!,
      authUrl: 'https://auth.myplatform.com/oauth/authorize',
      tokenUrl: 'https://auth.myplatform.com/oauth/token',
      scopes: ['orders.read', 'orders.write'],
      grantType: 'authorization_code',
    });

    this.api = new ApiClient({
      baseUrl: 'https://api.myplatform.com/v1',
      timeout: 30000,
      maxRetries: 3,
    });

    this.orderMapper = new FieldMapper([
      { source: 'order_id', target: 'platformOrderId' },
      { source: 'customer.name', target: 'buyerUsername' },
      // ... more mappings
    ]);
  }

  // Implement all abstract methods...
}

// Register
platformRegistry.register(new MyPlatformEngine());
```

### 2. Create Sync Worker

```typescript
import { createSyncQueue, createSyncWorker, registerScheduledSync } from '../platform-engine/sync-worker.js';

const orderSyncQueue = createSyncQueue('order-sync', redis);

const orderSyncWorker = createSyncWorker(
  'order-sync',
  redis,
  async (job, storeId, platform, since) => {
    const engine = platformRegistry.get(platform);
    const result = await engine.syncOrders(storeId, since);
    // Upsert to database...
    return result.items.length;
  },
);

// Register scheduled jobs
await registerScheduledSync(orderSyncQueue, activeStores, 2 * 60 * 60 * 1000);
```

### 3. Add Field Mappings

Define platform-specific field mappings in a YAML config or directly in code. See `field-mapper.ts` for examples.

### 4. Add Status Normalization

Map platform-specific order statuses to internal normalized statuses. See `field-mapper.ts` StatusMapping.

## Key Decisions

- **One engine per platform** — keeps platform-specific logic contained
- **PlatformRegistry** — enables dynamic dispatch based on store's platform
- **OAuth2Client** — supports both Authorization Code and Client Credentials flows
- **ApiClient** — handles retries, circuit breaking, and rate limiting
- **FieldMapper** — configuration-driven mapping, easy to maintain
- **SyncWorker** — reentrancy guard prevents concurrent syncs for same store
