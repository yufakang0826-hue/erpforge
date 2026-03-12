# Mini ERP — ERPForge 示例项目

展示如何使用 ERPForge 框架的模式构建跨境电商 ERP 的核心模块。这不是一个生产系统，而是一个教学示例，演示 ERPForge 推荐的架构模式。

## 演示的 ERPForge 模式

| 模式 | 来源 | 本项目中的体现 |
|------|------|--------------|
| 多租户隔离 | knowledge/architecture/multi-tenant.md | X-Tenant-ID header + 所有查询带 tenantId |
| 模块边界 | knowledge/architecture/module-boundaries.md | product/order/inventory 独立模块 |
| 订单状态机 | knowledge/domain/order-lifecycle.md | 7 状态 + 合法转换校验 |
| 库存预扣 | knowledge/domain/order-lifecycle.md | reserve → deduct 两阶段扣减 |
| 金额精度 | skills/anti-rationalization.md (Risk #4) | numeric(12,2) 类型，不用 float |
| 软删除 | templates/backend/module-scaffold | isDeleted + deletedAt |
| Zod 验证 | templates/backend/module-scaffold | 请求体 schema 验证 |

## 快速开始

```bash
# 1. 启动 PostgreSQL
docker compose up -d postgres

# 2. 安装依赖
npm install

# 3. 运行数据库迁移
npm run db:migrate

# 4. 填充测试数据
npm run db:seed

# 5. 启动服务
npm run dev

# 6. 运行测试脚本
bash test.sh
```

## 项目结构

```
mini-erp/
├── src/
│   ├── app.ts              # Express 入口
│   ├── middleware/
│   │   ├── tenant.ts       # 多租户中间件（X-Tenant-ID）
│   │   └── error-handler.ts# 全局错误处理
│   ├── lib/
│   │   └── errors.ts       # 统一错误类（AppError / NotFoundError / BusinessError）
│   ├── db/
│   │   ├── connection.ts   # Drizzle ORM + pg Pool
│   │   ├── schema.ts       # 数据库 schema（products / orders / orderItems / inventory）
│   │   ├── migrate.ts      # 迁移脚本
│   │   └── seed.ts         # 测试数据（2 个租户，5 个产品）
│   └── modules/
│       ├── product/        # 产品管理（CRUD + 软删除）
│       │   ├── routes.ts
│       │   └── types.ts
│       ├── order/          # 订单管理（状态机 + 库存联动）
│       │   ├── routes.ts
│       │   └── types.ts
│       └── inventory/      # 库存管理（预扣 + 调整）
│           ├── routes.ts
│           └── types.ts
├── docker-compose.yml      # PostgreSQL 16 + 应用容器
├── drizzle.config.ts       # Drizzle Kit 配置
├── test.sh                 # 端到端测试脚本
└── README.md
```

## API 端点

所有业务端点需要 `X-Tenant-ID` header。

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查（无需租户头） |

### 产品管理 `/api/products`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 产品列表（排除已删除） |
| GET | `/api/products/:id` | 产品详情 |
| POST | `/api/products` | 创建产品 |
| PATCH | `/api/products/:id` | 更新产品 |
| DELETE | `/api/products/:id` | 软删除产品 |

### 订单管理 `/api/orders`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/orders` | 订单列表 |
| GET | `/api/orders/:id` | 订单详情（含明细） |
| POST | `/api/orders` | 创建订单（自动预扣库存） |
| PATCH | `/api/orders/:id/status` | 状态转换（校验合法性） |

**订单状态机：**

```
pending_review → approved → processing → shipped → delivered → completed
      ↓              ↓            ↓
   cancelled     cancelled    cancelled
```

### 库存管理 `/api/inventory`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/inventory/:productId` | 查询产品库存 |
| POST | `/api/inventory` | 初始化库存 |
| PATCH | `/api/inventory/:productId/adjust` | 调整库存数量 |

## 多租户隔离

每个请求通过 `X-Tenant-ID` header 识别租户。中间件自动注入 `req.tenantId`，所有数据库查询都带有 `tenantId` 条件，确保租户之间数据完全隔离。

种子数据包含两个租户：
- **租户 A** (`a0000000-0000-0000-0000-000000000001`): 3 个产品 + 库存
- **租户 B** (`b0000000-0000-0000-0000-000000000002`): 2 个产品 + 库存

## 了解更多

- [ERPForge 主项目](../../README.md)
- [ERPForge 快速入门](../../docs/getting-started.md)
- [领域知识 — 订单生命周期](../../knowledge/domain/order-lifecycle.md)
- [架构知识 — 多租户](../../knowledge/architecture/multi-tenant.md)
