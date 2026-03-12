# Changelog

All notable changes to ERPForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.1.0] - 2026-03-12

### Changed
- 控制层瘦身：HARD-GATE → Gate, Iron Law → Key Principle, 移除 EXTREMELY-IMPORTANT
- Anti-rationalization 重心从"管 AI"转向"保 ERP 交付"（12 条真实案例）
- 工作流编排改为参考指南，提供 Full/Lite/Minimal 三种模式
- 整体基调从"框架强制"转为"工具箱按需取用"

### Added
- Mini ERP 示例项目（examples/mini-erp/）— 1678 行可运行代码
  - 3 个业务模块：Product（CRUD + 软删除）、Order（7 状态机）、Inventory（两阶段预扣）
  - 多租户隔离（X-Tenant-ID + 全查询 tenantId 过滤）
  - 金额精度（numeric(12,2)，不用 float）
  - 24 个端到端测试（test.sh），全部通过
- README 增加 Examples 和 À La Carte 章节
- 会计模型功能货币可配置（不再硬编码 CNY）

### Fixed
- 文档路径与实际文件结构对齐
- 安装脚本 URL 指向正确的 GitHub 仓库
- 脚手架工具增加 .env.example 占位符替换

## [1.0.0] - 2026-03-12

### Added
- 8 composable skills for ERP development lifecycle
- 14 domain knowledge files (orders, accounting, products, logistics, pricing, 4 platforms, architecture)
- 5 code template groups (backend module, platform engine, list page, detail page, dashboard widget)
- 3 quality protocols (quality gates, cross-cutting checks, workflow orchestration)
- Claude Code plugin with auto-activation via SessionStart hook
- Installation scripts for Claude Code, Cursor, and Codex
- Scaffolding tool (scripts/scaffold.sh) for quick module generation
- Getting Started tutorial with hands-on warehouse module walkthrough
