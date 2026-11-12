# Architecture

## Mục tiêu

Giữ ranh giới rõ ràng giữa hai khối cốt lõi:

- **Build-time — AI Agent Builder:** thu thập yêu cầu, làm rõ, lập kế hoạch, khám phá
  node/tool, sinh và validate workflow, preview/test rồi chờ người dùng phê duyệt.
- **Runtime — Workflow Engine:** tải workflow đã được duyệt, kiểm tra quyền, thực thi node,
  checkpoint, retry có giới hạn và ghi lịch sử.

LLM chỉ được đề xuất cấu trúc. Backend là nguồn xác thực; runtime không chạy workflow chưa
validate và không cho Agent tự cấp quyền.

## Cấu trúc monorepo

```text
apps/
  api/                  NestJS API và runtime process
  web/                  Next.js UI và Visual Workflow Builder
packages/
  contracts/            Contract trung lập dùng chung giữa API và Web
docs/                    Tài liệu kiến trúc và kế hoạch
```

## Ranh giới module backend dự kiến

```text
apps/api/src/
  modules/
    agents/             Agent aggregate và version
    agent-builder/      Quy trình build-time
    models/             Model gateway, router và provider adapters
    prompts/            Prompt template và version
    rag/                Ingestion và retrieval
    mcp/                MCP client, server/tool registry
    permissions/        Authentication, RBAC/ABAC và policy checks
    guardrails/         Input/tool/output guardrails
    cache/              Cache policy và adapters
    workflow/           Definition, validation và runtime engine
    observability/      Trace, metrics, audit và evaluation hooks
  shared/               Hạ tầng dùng chung, không chứa domain logic
```

Các thư mục trên là ranh giới sở hữu, chưa phải module NestJS đang hoạt động. Chỉ tạo module
khi bắt đầu phase tương ứng để tránh dependency và abstraction sớm.

## Quy tắc phụ thuộc

1. UI chỉ thao tác workflow JSON; API chịu trách nhiệm validate và authorize.
2. Builder phụ thuộc contract/registry, không phụ thuộc trực tiếp provider cụ thể.
3. Workflow runtime dùng interface của model, MCP, permission và observability.
4. Provider adapters phụ thuộc ra ngoài; domain/runtime không import SDK provider trực tiếp.
5. Shared contract không chứa secret hoặc credential.
6. Build-time và runtime có thể cùng process ở MVP nhưng không trộn trách nhiệm trong code.

## Chưa quyết định

Database ORM, queue, vector database, policy engine, LLM SDK, MCP SDK và observability backend
sẽ được chọn ở phase triển khai sau khi chốt yêu cầu vận hành. Base không cài sẵn các thư viện
này.
