# Testing Strategy

Base chỉ chạy build và typecheck; chưa có test nghiệp vụ.

## Test pyramid dự kiến

1. Unit test cho validator, router, policy, data mapping và node handlers.
2. Contract test cho provider/MCP/database adapters.
3. Integration test cho workflow execution, checkpoint và permission boundary.
4. End-to-end test cho Builder → Preview → Test → Approval → Runtime.
5. Security/evaluation suite cho prompt injection, tool misuse, tenant leakage và regression.

Mỗi phase phải thêm test cùng capability, không đợi đến cuối dự án.
