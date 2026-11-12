# AI Agent Builder Platform

## Phạm vi dự án

- Monorepo TypeScript dùng npm workspaces.
- Backend nằm trong `apps/api`, frontend nằm trong `apps/web`.
- Các package dùng chung nằm trong `packages`.
- Chỉ triển khai tính năng khi người dùng yêu cầu; giữ thay đổi nhỏ, có thể kiểm chứng và không đụng vào phần không liên quan.

## Quy trình phân tích mã nguồn

Khi repository có thư mục `.codegraph/` và công việc cần hiểu hoặc tìm mã nguồn:

1. Dùng MCP `codegraph_explore` trước, hoặc chạy `codegraph explore "<câu hỏi hoặc symbol>"` nếu MCP không khả dụng.
2. Dùng kết quả để xác định symbol, luồng gọi, caller/callee, test liên quan và phạm vi ảnh hưởng trước khi sửa.
3. Chỉ dùng `rg`, tìm file hoặc đọc trực tiếp những phần còn thiếu khi CodeGraph không khả dụng hoặc kết quả chưa đủ.
4. Không đọc lại nguyên file nếu CodeGraph đã trả về đúng đoạn mã cần thiết.
5. Sau khi sửa, chạy kiểm tra nhỏ nhất phù hợp rồi mở rộng sang `npm run typecheck`, `npm test` hoặc `npm run build` tùy mức độ ảnh hưởng.

Không bắt buộc dùng CodeGraph cho thay đổi thuần tài liệu/cấu hình không cần hiểu mã nguồn.

## Quy ước kỹ thuật

- Giữ TypeScript ở chế độ chặt chẽ; không dùng `any` nếu có thể mô hình hóa kiểu dữ liệu.
- Tách rõ ranh giới backend, frontend và package dùng chung; không import ngược qua các ranh giới kiến trúc.
- Không đưa secret vào mã nguồn. Chỉ commit file mẫu như `.env.example`.
- Không chỉnh sửa hoặc xóa thay đổi sẵn có của người dùng nếu không thuộc yêu cầu hiện tại.
- Nội dung commit phải viết bằng tiếng Việt và mỗi commit chỉ nên có một mục đích rõ ràng.
- Không tự commit hoặc push nếu người dùng chưa yêu cầu.
- Thư mục `docs/` là tài liệu cục bộ, đang bị Git bỏ qua và không được dùng như đầu vào bắt buộc của bản build.

## Cấu hình dùng chung cho AI

- `AGENTS.md` là nguồn chuẩn cho chỉ dẫn cấp dự án. Claude nạp file này qua `CLAUDE.md`; Codex và Antigravity đọc trực tiếp.
- `.claude/skills/`, `.claude/rules/` và `.claude/agents/` là nguồn chuẩn cho skill, rule và agent tùy chỉnh.
- Chạy `npm run ai:sync` sau khi thay đổi nguồn chuẩn.
- `.agents/skills/`, `.agents/rules/` và `.codex/agents/` là đầu ra sinh tự động; không chỉnh sửa thủ công.
- Chạy `npm run ai:check` để phát hiện cấu hình sinh tự động bị lệch trước khi commit.
