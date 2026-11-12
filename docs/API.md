# API Contract

Base hiện tại chưa cung cấp endpoint nghiệp vụ.

## Quy ước dự kiến

- Prefix: `/api`
- Payload: JSON
- Contract dùng chung đặt tại `packages/contracts`
- Mọi request runtime phải mang execution ID và tenant context sau khi authentication được xây.
- Validation, authorization và guardrail được thực hiện ở backend, không tin dữ liệu từ UI.

Endpoint sẽ được bổ sung theo từng phase và phải mô tả request, response, error code, permission,
idempotency và side effect trước khi triển khai.
