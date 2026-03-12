# ERPForge

> 面向跨境电商 ERP 系统构建的 AI 技能框架。

ERPForge 是一套可组合的技能框架，让 AI 编码助手（Claude Code、Cursor、Codex）变成经验丰富的 ERP 架构师。它不是代码生成器——而是一个方法论层，教会 AI 如何思考和构建生产级的跨境电商系统。

## 为什么需要 ERPForge？

构建跨境电商 ERP 是最复杂的软件工程挑战之一：

- **订单复杂度** — 10+ 状态的状态机、拆单/合单、部分退款、多仓发货，以及各平台特有的订单流程
- **多平台混战** — eBay、Amazon、Walmart、Mercado Libre 各有不同的 API、认证机制、频率限制、Webhook 格式和刊登要求
- **财务精确性** — 复式记账、多币种支持、自动生成凭证、成本分摊、跨国合规
- **多租户 SaaS** — 共享 Schema + RLS 的数据隔离、租户级配置、零跨租户数据泄漏
- **物流迷宫** — 跨国承运商路由、报关申报、运费优化、多来源实时追踪

大多数团队通过惨痛的方式学到这些教训——生产事故、数据损坏、代价高昂的重写。

**ERPForge 将这些实战经验封装为 AI 自动遵循的可组合技能。** 每个技能编码了来自生产 ERP 系统的真实模式。每个知识文件记录了真实的平台坑点。每个模板固化了真实的架构决策。

## 功能特性

### 技能（方法论）

8 个可组合技能，覆盖 ERP 开发全生命周期：

| 技能 | 用途 |
|------|------|
| `erp-module-design` | 在写代码之前，设计好模块边界、状态机和数据模型 |
| `fullstack-module-build` | 按照已批准的设计方案，用一致的前后端模式实现 |
| `platform-integration` | 使用平台引擎模式对接电商平台 API |
| `systematic-debugging` | 系统性排查 bug——复现、隔离、修复、验证 |
| `verification-before-completion` | 声明任务完成之前的 5 项验证 |
| `quality-polish` | 将功能完成的模块打磨到企业级品质标准 |
| `test-driven-development` | 先写测试、实现通过、信心重构 |
| `anti-rationalization` | 抵御偷工减料的防线——被所有其他技能引用 |

### 领域知识

14 个知识文件，分 3 类，覆盖 ERP 系统中最难的领域：

**领域知识（5 个文件）**

| 知识文件 | 覆盖内容 |
|---------|---------|
| `order-lifecycle.md` | 跨平台订单状态机、发货模式、取消/退款流程 |
| `accounting-model.md` | 复式记账、多币种凭证（以人民币为记账本位币） |
| `product-catalog.md` | SPU/SKU 层级、跨平台属性、刊登生命周期 |
| `logistics-model.md` | 承运商 API（云途、燕文、4PX）、平台发货、运费模型、追踪 |
| `pricing-model.md` | 跨平台定价策略（含 eBay 28 种费用类型）、落地成本、利润率计算 |

**平台知识（5 个文件）**

| 知识文件 | 覆盖内容 |
|---------|---------|
| `ebay-patterns.md` | OAuth、`ebay-api` SDK、字段映射、订单同步、已知坑点 |
| `walmart-patterns.md` | OAuth、Feed API、订单、报告、已知坑点 |
| `mercadolibre-patterns.md` | 跨 12 个站点的 OAuth、核心 API、区域差异 |
| `amazon-patterns.md` | SP-API 双重认证、FBA vs FBM、限流 |
| `platform-abstraction.md` | 多平台架构——最重要的平台知识文件 |

**架构知识（4 个文件）**

| 知识文件 | 覆盖内容 |
|---------|---------|
| `event-driven.md` | BullMQ 后台任务模式（同步、通知、报表） |
| `module-boundaries.md` | 模块结构、通信模式、反模式 |
| `multi-tenant.md` | 共享 Schema + tenant_id + RLS 数据隔离 |
| `tech-stack.md` | 推荐技术选型及理由和替代方案 |

### 代码模板

5 组模板目录，每组包含多个生产级文件：

| 模板目录 | 包含文件 | 生成内容 |
|---------|---------|---------|
| `backend/module-scaffold/` | `schema.ts`, `types.ts`, `service.ts`, `routes.ts`, `index.ts` | 完整 CRUD 模块（Express + Drizzle + Zod），含租户隔离 |
| `backend/platform-engine/` | `base-engine.ts`, `oauth-client.ts`, `api-client.ts`, `field-mapper.ts`, `sync-worker.ts` | 平台集成引擎，含 OAuth、重试、断路器、BullMQ 同步 |
| `frontend/list-page/` | `page.tsx`, `columns.tsx`, `filter-bar.tsx`, `use-data.ts` | 数据表格页面，含筛选、分页、TanStack Query Hooks |
| `frontend/detail-page/` | `page.tsx`, `form-schema.ts` | 详情/编辑页面，含 Zod 表单校验 |
| `frontend/dashboard-widget/` | `kpi-card.tsx`, `chart-card.tsx` | 仪表盘卡片（KPI 和图表） |

### 品质协议

3 个协议文件，定义质量标准：

| 协议文件 | 定义内容 |
|---------|---------|
| `quality-gates.md` | 5 个质量门禁（编译、功能验证、安全、双阶段评审、部署就绪）——每个交付物必须通过 |
| `cross-cutting-checks.md` | 6 个横切关注点检查单（上下文加载、设计对齐、租户隔离、平台兼容、财务精度、知识双写） |
| `workflow-orchestration.md` | 8 种工作流类型，含技能链编排、回退协议和升级矩阵 |

## 快速开始

### Claude Code

```bash
# 一行安装
curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/claude-code.sh | bash
```

或手动安装：

```bash
git clone https://github.com/yufakang0826-hue/erpforge.git ~/.claude/plugins/erpforge
chmod +x ~/.claude/plugins/erpforge/scripts/*.sh
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/cursor.sh | bash
```

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/yufakang0826-hue/erpforge/main/install/codex.sh | bash
```

## 按需取用

ERPForge 是模块化的——用你需要的，跳过不需要的。

### 只要知识库
把 `knowledge/` 复制到你的项目作为领域参考。不需要技能或插件。

### 只要模板
用 `scripts/scaffold.sh` 生成模块。可以独立使用。

### 单独使用技能
`skills/` 里的每个技能都是独立的指南。读一个文件，应用一个模式。

### 关闭自动激活
```bash
export ERPFORGE_MANUAL=1  # 技能不会自动加载，按需使用
```

## 工作原理

```
你: "添加 Walmart 订单同步"
         |
         v
  [ERPForge 激活]
         |
    1. 检查技能索引
         |---> platform-integration 技能加载
         |---> 读取 knowledge/platforms/walmart-patterns.md
         |---> 使用 templates/backend/platform-engine/
         |
    2. 设计阶段 (erp-module-design)
         |---> 定义模块边界
         |---> 设计状态机
         |---> 提出数据模型
         |
    3. 构建阶段 (fullstack-module-build)
         |---> 用模板搭建后端
         |---> 实现平台引擎
         |---> 构建前端组件
         |
    4. 质量关卡
         |---> verification-before-completion
         |---> quality-polish
         |---> 所有协议检查通过
         |
         v
  生产就绪的 Walmart 集成
```

核心洞察：**技能可以组合**。一个任务通常会按顺序触发多个技能，每个技能都建立在上一个的输出之上。`using-erpforge` 元技能自动编排这一切。

## 脚手架工具

ERPForge 内置 CLI 脚手架工具，快速生成新模块：

```bash
# 生成后端模块
./scripts/scaffold.sh backend my-module

# 生成平台引擎
./scripts/scaffold.sh platform my-platform

# 生成前端列表页
./scripts/scaffold.sh list my-page

# 生成前端详情页
./scripts/scaffold.sh detail my-page

# 生成仪表盘组件
./scripts/scaffold.sh widget my-widget
```

脚手架工具会复制对应模板目录，将占位符替换为你的模块名，搭建好文件结构——给你一个生产级的起点。

## 项目结构

```
erpforge/
├── .claude-plugin/
│   └── plugin.json              # 插件清单
├── hooks/
│   └── hooks.json               # Session 生命周期钩子
├── scripts/
│   ├── session-start.sh         # Session 启动时注入元技能
│   └── scaffold.sh              # 模块脚手架工具
├── install/
│   ├── claude-code.sh           # Claude Code 安装脚本
│   ├── cursor.sh                # Cursor 安装脚本
│   └── codex.sh                 # Codex 安装脚本
├── skills/
│   ├── using-erpforge.md        # 元技能（编排器）
│   ├── erp-module-design.md
│   ├── fullstack-module-build.md
│   ├── platform-integration.md
│   ├── systematic-debugging.md
│   ├── verification-before-completion.md
│   ├── quality-polish.md
│   ├── test-driven-development.md
│   └── anti-rationalization.md
├── knowledge/
│   ├── README.md
│   ├── domain/
│   │   ├── order-lifecycle.md
│   │   ├── accounting-model.md
│   │   ├── product-catalog.md
│   │   ├── logistics-model.md
│   │   └── pricing-model.md
│   ├── platforms/
│   │   ├── platform-abstraction.md
│   │   ├── ebay-patterns.md
│   │   ├── walmart-patterns.md
│   │   ├── mercadolibre-patterns.md
│   │   └── amazon-patterns.md
│   └── architecture/
│       ├── event-driven.md
│       ├── module-boundaries.md
│       ├── multi-tenant.md
│       └── tech-stack.md
├── templates/
│   ├── README.md
│   ├── backend/
│   │   ├── module-scaffold/     # schema.ts, types.ts, service.ts, routes.ts, index.ts
│   │   └── platform-engine/     # base-engine.ts, oauth-client.ts, api-client.ts, field-mapper.ts, sync-worker.ts
│   └── frontend/
│       ├── list-page/           # page.tsx, columns.tsx, filter-bar.tsx, use-data.ts
│       ├── detail-page/         # page.tsx, form-schema.ts
│       └── dashboard-widget/    # kpi-card.tsx, chart-card.tsx
├── protocols/
│   ├── quality-gates.md
│   ├── cross-cutting-checks.md
│   └── workflow-orchestration.md
├── package.json
├── README.md
├── README_CN.md
└── LICENSE
```

## 设计哲学

ERPForge 建立在一个简单的观察之上：**AI 助手的表现取决于它遵循的方法论**。

没有指导的 AI 助手会：
- 跳过设计阶段，直接写代码
- 忽视模块边界，创造紧耦合的系统
- 遗漏订单状态机中的边界情况
- 实现天真的多币种支持，在舍入时崩溃
- 在复杂查询中忘记租户隔离
- 没有充分验证就声称任务"完成"

ERPForge 通过提供一个位于用户意图和 AI 执行之间的技能层来解决这个问题。每个技能都是提炼过的方法论——不是死板的模板，而是能够适应具体上下文的灵活决策框架。

框架遵循 **CSO（Context、Skills、Output）** 原则：
1. **Context** — 通过知识文件理解领域
2. **Skills** — 为当前阶段应用正确的方法论
3. **Output** — 生成符合企业级质量标准的代码

## 参与贡献

欢迎贡献！参与方式：

1. **技能** — 添加你在实战中学到的 ERP 开发模式
2. **知识** — 记录平台特有的坑、领域规则或集成模式
3. **模板** — 分享经过生产验证的常见 ERP 组件脚手架
4. **协议** — 提出新的质量关卡或改进现有关卡

### 提交指南

- 技能应该编码**方法论**，而不仅仅是代码模式
- 知识应该记录在生产中发现的**真实坑点**，而不是理论设计
- 模板应该**可以直接使用**——不要充满占位符的样板代码
- 所有内容应该为 AI 助手消费而编写，而不是为人类阅读

### 提交变更

1. Fork 仓库
2. 创建功能分支（`git checkout -b skill/new-skill-name`）
3. 添加内容，包含正确的 YAML frontmatter
4. 提交 Pull Request，清楚描述你的贡献教了什么

## 许可证

MIT License - 详见 [LICENSE](LICENSE)。

---

**ERPForge** — 教会 AI 构建企业级 ERP 系统，一个技能一个技能地来。
