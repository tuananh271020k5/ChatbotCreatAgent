# Implementation Plan

Trạng thái hiện tại: **Base structure only**. Tất cả capability bên dưới đều chưa triển khai.

## Phase 0 — Foundation

- [x] Tạo npm workspaces cho API, Web và shared contracts.
- [x] Tạo entry point tối thiểu cho NestJS và Next.js.
- [x] Xác lập ranh giới module và nguyên tắc phụ thuộc.
- [ ] Chọn database/ORM sau khi thống nhất yêu cầu triển khai.
- [ ] Thiết lập CI, lint, unit test runner và migration workflow.

## Phase 1 — MVP Agent

- [ ] Model Gateway interface và provider adapter đầu tiên.
- [ ] Prompt management tối thiểu.
- [ ] Chat API.
- [ ] Tool calling cơ bản qua một MCP server/tool.
- [ ] Runtime permission check tối thiểu.

## Phase 2 — Workflow Engine

- [ ] Workflow schema và versioning.
- [ ] Node Registry, validator, executor và edge resolver.
- [ ] Sequential/conditional execution, error handling và history.

## Phase 3 — RAG & Security

- [ ] Document ingestion, chunking, embedding và vector retrieval.
- [ ] Tenant/access filtering.
- [ ] Input/tool/output guardrails và human approval.

## Phase 4 — Optimization

- [ ] Redis cache, model router, fallback, rate limiting và queue.
- [ ] Tracing, monitoring và evaluation.

## Phase 5 — AI Agent Builder

- [ ] Requirement extraction và clarification.
- [ ] Planning, node discovery, generation và validation.
- [ ] Visual builder, test execution, approval và deploy.

Mỗi checkbox chỉ được bắt đầu sau khi có task riêng nêu rõ input/output, dependencies, lỗi,
bảo mật và test.
