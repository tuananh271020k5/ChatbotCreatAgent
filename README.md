# AI Agent Builder Platform

Base monorepo cho nền tảng **AI Agent Builder** (build-time) và **Workflow Engine**
(runtime), được dựng theo `AI_Agent_Builder_Implementation_Guide.docx`.

## Phạm vi hiện tại

Repository này mới chỉ chứa khung kỹ thuật:

- `apps/api`: ứng dụng NestJS tối thiểu, chưa có API nghiệp vụ.
- `apps/web`: ứng dụng Next.js tối thiểu, chưa có Visual Workflow Builder.
- `packages/contracts`: vị trí dành cho contract dùng chung, hiện chưa định nghĩa domain.
- `docs`: ranh giới module và quyết định kiến trúc nền tảng.

Chưa có Model Gateway, LLM call, MCP client, RAG, Workflow Engine, authentication,
database, Redis hay logic triển khai Agent.

## Yêu cầu môi trường

- Node.js `>= 20.9`
- npm `>= 10`

## Khởi động base

```bash
npm install
copy .env.example .env
npm run dev:api
```

Mở terminal khác:

```bash
npm run dev:web
```

- Web: `http://localhost:3000`
- API base: `http://localhost:3001/api` (chưa khai báo endpoint)
