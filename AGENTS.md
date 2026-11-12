# AI Agent Builder Platform

## Phạm vi dự án

- Monorepo TypeScript dùng npm workspaces.
- Backend NestJS nằm trong `backend`, frontend Next.js nằm trong `frontend`.
- Các package dùng chung nằm trong `packages`.
- Hạ tầng Docker và cấu hình triển khai nằm trong `deployment`.
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

## Quy trình task và nhánh

- Trước task mới, kiểm tra nhánh hiện tại và các nhánh đã có. Nhắc người dùng chuyển sang nhánh phase đã tồn tại; chỉ nhắc tạo nhánh khi phase chưa có nhánh.
- Tên nhánh và commit không chứa mã kế hoạch như `P00` hoặc `T01`; các mã này chỉ dùng trong kế hoạch cục bộ.
- Khi người dùng nhắn `tiếp`, hiểu rằng họ đã commit/push task trước và muốn làm task kế tiếp. Luôn xác minh Git thực tế; nếu worktree chưa sạch, commit chưa tồn tại hoặc sai nhánh thì báo rõ trước khi làm.
- Mỗi task tương ứng một commit nguyên tử. Sau khi hoàn thành, đưa lệnh stage đúng file, commit tiếng Việt và push; không tự chạy nếu người dùng chưa yêu cầu.
- Trước khi triển khai task, dùng `TASK_TEMPLATE.md` như checklist để xác định input, output, dependencies, lỗi, bảo mật, test và rollback; không tạo file task riêng nếu không mang lại giá trị lâu dài.

## Cấu hình dùng chung cho AI

- `AGENTS.md` là nguồn chuẩn cho chỉ dẫn cấp dự án. Claude nạp file này qua `CLAUDE.md`; Codex và Antigravity đọc trực tiếp.
- `.claude/skills/`, `.claude/rules/` và `.claude/agents/` là nguồn chuẩn cho skill, rule và agent tùy chỉnh.
- Chạy `npm run ai:sync` sau khi thay đổi nguồn chuẩn.
- `.agents/skills/`, `.agents/rules/` và `.codex/agents/` là đầu ra sinh tự động; không chỉnh sửa thủ công.
- Chạy `npm run ai:check` để phát hiện cấu hình sinh tự động bị lệch trước khi commit.

## Bàn giao công việc giữa các AI

- `.ai-local/CURRENT_TASK.md` là checkpoint cục bộ để Codex, Claude và Antigravity tiếp tục cùng một công việc; file này không được commit.
- Khi người dùng yêu cầu bàn giao, chuyển AI hoặc tiếp tục công việc đang dở, dùng skill `handoff` để ghi hoặc đọc checkpoint.
- Trước khi tiếp tục, đối chiếu branch, commit nền, `git status` và thay đổi thực tế. Code và Git luôn có độ ưu tiên cao hơn checkpoint nếu thông tin lệch nhau.
- Chỉ cập nhật checkpoint khi người dùng yêu cầu hoặc sau một mốc công việc có ý nghĩa; không làm gián đoạn việc code để cập nhật sau từng thao tác nhỏ.
- Không ghi secret, token, credential hoặc log dài vào checkpoint.
