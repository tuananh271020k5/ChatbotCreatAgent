---
trigger: glob
globs: "**/*.ts, **/*.tsx"
description: "Áp dụng quy tắc typescript cho các file phù hợp."
---

# Quy tắc TypeScript

- Giữ kiểu dữ liệu cụ thể tại ranh giới API, UI và package dùng chung.
- Ưu tiên `unknown` kèm kiểm tra kiểu thay vì `any`.
- Không bỏ qua lỗi TypeScript bằng `@ts-ignore` nếu chưa giải thích và chưa có cách kiểm chứng an toàn.
- Giữ import đúng ranh giới workspace; tránh phụ thuộc vòng.
- Khi thay đổi public type hoặc contract, cập nhật toàn bộ nơi sử dụng và kiểm tra tương thích hai phía.
