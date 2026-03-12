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

深度知识库，覆盖 ERP 系统中最难的领域：

| 知识领域 | 覆盖内容 |
|---------|---------|
| 订单生命周期 | 状态机、发货模式、取消/退款流程 |
| 会计基础 | 复式记账、科目表、多币种凭证 |
| 产品目录 | SPU/SKU 层级、平台特有属性、刊登生命周期 |
| 物流与发运 | 承运商 API、运费模型、追踪、跨境合规 |
| 定价与成本 | 定价策略、落地成本、利润率计算 |
| 平台：eBay | Trading API、Auth Token、刊登格式、订单同步 |
| 平台：Walmart | Marketplace API、Partner Auth、Feed 式刊登 |
| 平台：Mercado Libre | REST API、OAuth 流程、区域差异 |
| 平台：Amazon | SP-API、角色认证、Catalog 对接 |

### 代码模板

固化了架构决策的生产级脚手架：

| 模板 | 生成内容 |
|------|---------|
| 后端模块 | Express 路由 + Drizzle Schema + 服务层 + 校验 |
| 平台引擎 | 统一接口的平台适配器 + 平台特有实现 |
| 列表页 | React 表格页面，含筛选、分页、批量操作 |
| 详情页 | React 详情/编辑页面，含表单校验和状态管理 |
| 仪表盘组件 | 仪表盘卡片，含图表、KPI 或汇总数据 |

### 品质协议

6 个横切面协议，作为质量关卡：

| 协议 | 保障内容 |
|------|---------|
| API 契约 | REST 规范、错误格式、分页、版本控制 |
| 数据库 Schema | 迁移安全、索引策略、RLS 策略 |
| UI 一致性 | 组件标准、间距、动画、响应式断点 |
| 错误处理 | 错误边界、用户提示、结构化日志 |
| 安全检查单 | 认证、输入校验、注入防护、CORS |
| 工作流编排 | 多步骤协调、Saga 模式、补偿机制 |

## 快速开始

### Claude Code

```bash
# 一行安装
curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/claude-code.sh | bash
```

或手动安装：

```bash
git clone https://github.com/anthropics/erpforge.git ~/.claude/plugins/erpforge
chmod +x ~/.claude/plugins/erpforge/scripts/*.sh
```

### Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/cursor.sh | bash
```

### Codex

```bash
curl -fsSL https://raw.githubusercontent.com/anthropics/erpforge/main/install/codex.sh | bash
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
         |---> 读取 knowledge/platform-walmart.md
         |---> 使用 templates/platform-engine.md
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

## 项目结构

```
erpforge/
├── .claude-plugin/
│   └── plugin.json          # 插件清单
├── hooks/
│   └── hooks.json           # Session 生命周期钩子
├── scripts/
│   └── session-start.sh     # Session 启动时注入元技能
├── install/
│   ├── claude-code.sh       # Claude Code 安装脚本
│   ├── cursor.sh            # Cursor 安装脚本
│   └── codex.sh             # Codex 安装脚本
├── skills/
│   ├── using-erpforge.md    # 元技能（编排器）
│   ├── erp-module-design.md
│   ├── fullstack-module-build.md
│   ├── platform-integration.md
│   ├── systematic-debugging.md
│   ├── verification-before-completion.md
│   ├── quality-polish.md
│   ├── test-driven-development.md
│   └── anti-rationalization.md
├── knowledge/
│   ├── order-lifecycle.md
│   ├── accounting-foundations.md
│   ├── product-catalog.md
│   ├── logistics-shipping.md
│   ├── pricing-costs.md
│   ├── platform-ebay.md
│   ├── platform-walmart.md
│   ├── platform-mercadolibre.md
│   └── platform-amazon.md
├── templates/
│   ├── backend-module.md
│   ├── platform-engine.md
│   ├── list-page.md
│   ├── detail-page.md
│   └── dashboard-widget.md
├── protocols/
│   ├── api-contract.md
│   ├── database-schema.md
│   ├── ui-consistency.md
│   ├── error-handling.md
│   ├── security-checklist.md
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
