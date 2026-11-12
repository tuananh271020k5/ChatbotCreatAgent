# AI Agent Builder Platform

Base monorepo cho nền tảng **AI Agent Builder** (build-time) và **Workflow Engine**
(runtime), được dựng theo `AI_Agent_Builder_Implementation_Guide.docx`.

## Phạm vi hiện tại

Repository này mới chỉ chứa khung kỹ thuật:

- `backend`: ứng dụng NestJS tối thiểu, chưa có API nghiệp vụ.
- `frontend`: ứng dụng Next.js tối thiểu, chưa có Visual Workflow Builder.
- `packages/contracts`: vị trí dành cho contract dùng chung, hiện chưa định nghĩa domain.
- `database/init`: nơi dành cho script bootstrap PostgreSQL khi thực sự cần.
- `deployment`: Dockerfile và Docker Compose cho môi trường development/production.

Chưa có Model Gateway, LLM call, MCP client, RAG, Workflow Engine, authentication,
database, Redis hay logic triển khai Agent.

## Yêu cầu môi trường

- Node.js `>= 20.9`
- npm `>= 10`

## Khởi động base

```bash
npm install
copy .env.example .env
npm run dev:backend
```

Mở terminal khác:

```bash
npm run dev:frontend
```

- Web: `http://localhost:3000`
- API base: `http://localhost:3001/api` (chưa khai báo endpoint)

## Khởi động bằng Docker

```bash
copy .env.example .env
npm run docker:dev
```

Chạy cấu hình gần production ở chế độ nền:

```bash
npm run docker:up
```

Dừng stack:

```bash
npm run docker:down
```
