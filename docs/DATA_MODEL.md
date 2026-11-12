# Data Model

Chưa chọn database/ORM và chưa có migration/schema trong base này.

## Aggregate MVP dự kiến

- `agents`, `agent_versions`
- `workflows`, `workflow_versions`
- `executions`, `execution_node_logs`
- `model_configs`
- `mcp_servers`, `mcp_tools`

## Aggregate mở rộng

- Tenant/user/role/permission và audit logs
- Prompt/prompt versions
- Knowledge bases/documents
- Node registry

## Ràng buộc thiết kế

- Mọi dữ liệu nghiệp vụ phải có tenant scope phù hợp.
- Workflow definition và Agent phải versioned, không sửa lịch sử đã chạy.
- Credential/API key không lưu plaintext hoặc nhúng trong workflow JSON.
- Execution/node log liên kết bằng execution ID và giữ đủ dữ liệu để trace.
- Hành động có side effect cần idempotency key và trạng thái approval khi áp dụng.
