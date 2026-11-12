---
name: analyze-before-edit
description: Phân tích quan hệ mã nguồn và phạm vi ảnh hưởng bằng CodeGraph trước khi sửa code, debug, refactor hoặc tìm nơi triển khai trong repository có thư mục .codegraph.
---

# Phân tích trước khi chỉnh sửa

Áp dụng skill này cho thay đổi mã nguồn không tầm thường. Không cần kích hoạt cho thay đổi thuần tài liệu hoặc cấu hình không đòi hỏi hiểu code.

1. Xác nhận repository root có `.codegraph/`.
2. Dùng MCP `codegraph_explore` với câu hỏi nêu rõ symbol, file hoặc hành vi cần thay đổi.
3. Nếu MCP không khả dụng, chạy `codegraph explore "<câu hỏi>"` tại repository root.
4. Từ kết quả, xác định entry point, caller/callee, kiểu dữ liệu, test liên quan và phạm vi ảnh hưởng.
5. Xem phần source CodeGraph trả về là đã được đọc. Chỉ dùng `rg` hoặc đọc file trực tiếp để bổ sung phần bị thiếu hoặc xác minh trạng thái mới nhất.
6. Đề xuất hoặc thực hiện thay đổi nhỏ nhất giải quyết đúng yêu cầu.
7. Sau khi sửa, chạy kiểm tra tập trung trước, sau đó chạy typecheck, test hoặc build phù hợp với phạm vi ảnh hưởng.

Nếu chỉ mục thiếu hoặc lỗi thời, nói rõ giới hạn rồi dùng công cụ đọc mã nguồn thông thường làm phương án dự phòng.
