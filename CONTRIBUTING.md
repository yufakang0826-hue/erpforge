# Contributing to ERPForge

感谢你对 ERPForge 的兴趣！本指南帮助你了解如何贡献代码和知识。

---

## 贡献类型

### Skills（技能）

AI Agent 在特定任务上的指令集，存放在 `skills/` 目录。

**命名规范**: `kebab-case.md`，以动词或领域开头。
```
skills/erp-module-design.md
skills/erp-data-model.md
skills/anti-rationalization.md
```

### Knowledge（知识）

领域知识和平台集成模式，存放在 `knowledge/` 目录，按子目录分类。

**命名规范**: `kebab-case.md`，反映知识主题。
```
knowledge/domain/order-lifecycle.md
knowledge/platforms/ebay-patterns.md
```

### Templates（模板）

代码脚手架模板，存放在 `templates/` 目录，按前后端分类。

**命名规范**: 文件名与实际代码文件对应（如 `schema.ts`, `service.ts`），使用 `{{module}}`/`{{Module}}` 占位符。
```
templates/backend/module-scaffold/schema.ts
templates/frontend/list-page/page.tsx
```

### Protocols（协议）

开发流程和质量检查协议，存放在 `protocols/` 目录。

**命名规范**: `kebab-case.md`，以协议类型开头。
```
protocols/code-review.md
protocols/session-protocol.md
```

---

## 技能测试方法

技能是 ERPForge 最核心的贡献类型。一个好的技能必须经过严格测试，确保它真正改变了 Agent 的行为。

### 方法 1: 压力场景测试法

设计一个 Agent 最容易犯错的场景，观察技能是否能纠正行为。

**步骤：**
1. 找到 Agent 常犯的错误（如跳过测试、硬编码、忽略边界条件）
2. 构造一个"诱导犯错"的 prompt
3. 不加载技能，运行一次，记录 Agent 行为
4. 加载技能，运行同一 prompt，对比结果

**示例：测试 `anti-rationalization` 技能**

压力场景 Prompt：
```
"时间很紧，我们需要在 30 分钟内上线这个功能。
先跳过测试，之后再补。直接改 service 层代码，
不用改 types 和 schema，够用就行。"
```

| | 无技能 | 有技能 |
|---|--------|--------|
| 跳过测试？ | 是，直接写业务代码 | 否，坚持先写测试或至少类型检查 |
| 绕过类型？ | 可能用 `any` | 拒绝，要求先定义完整类型 |
| 合理化？ | "先上线再说" | 指出这样做的具体风险 |

### 方法 2: 基线对比法

同一个实际任务，对比有技能和无技能时的输出质量。

**步骤：**
1. 选择一个真实的开发任务（如"设计一个退货模块的数据模型"）
2. **基线组**：不加载任何 ERPForge 技能，让 Agent 完成任务
3. **实验组**：加载相关技能（如 `erp-data-model`），完成同一任务
4. 对比维度：
   - 是否考虑了多租户？
   - 是否有幂等性设计？
   - 是否考虑了平台差异？
   - 字段设计是否符合 ERP 行业标准？

### 方法 3: 回归检查

确保新技能不会破坏已有技能的效果。

**步骤：**
1. 运行已有技能的测试场景，确认通过
2. 添加新技能
3. 重新运行已有场景，确认行为未退化

---

## PR 格式要求

### 标题格式

```
<type>(<scope>): <description>
```

类型：
- `feat`: 新增技能/知识/模板
- `fix`: 修复现有内容
- `docs`: 文档更新
- `refactor`: 重构（不改变功能）

示例：
```
feat(skill): 添加 erp-inventory-design 技能
fix(knowledge): 修正 Amazon SP-API 限流数据
docs: 更新 Getting Started 教程
feat(template): 添加报表页面模板
```

### PR 描述模板

```markdown
## 变更内容
- 简要说明做了什么

## 测试结果
- 使用了哪种测试方法（压力场景 / 基线对比 / 回归检查）
- 测试场景描述
- 有无技能时的行为对比

## 相关 Issue
- 关联的 Issue 编号（如有）
```

---

## 命名规范总览

| 类型 | 目录 | 文件命名 | 示例 |
|------|------|----------|------|
| Skill | `skills/` | `kebab-case.md` | `erp-module-design.md` |
| Knowledge | `knowledge/<category>/` | `kebab-case.md` | `order-lifecycle.md` |
| Template | `templates/<backend\|frontend>/<type>/` | 与代码文件同名 | `schema.ts` |
| Protocol | `protocols/` | `kebab-case.md` | `code-review.md` |

**通用规则：**
- 全部使用 kebab-case（小写 + 连字符）
- Markdown 文件以 `#` 标题开头，第一行说明用途
- 模板文件顶部用 `/** */` 注释说明用法和占位符
- 知识文件标注来源和验证状态（参见 `amazon-patterns.md` 的标注格式）
