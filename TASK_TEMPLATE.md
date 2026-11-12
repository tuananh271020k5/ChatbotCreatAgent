# Mẫu thực hiện một task

Dùng mẫu này như checklist trước khi code. Không bắt buộc lưu một bản sao cho mỗi task; nội dung có thể được giữ trong cuộc hội thoại và checkpoint cục bộ.

## Mẫu trống

### Nhận diện

- **Tên task:**
- **Mục tiêu:** Một kết quả có thể review, không gộp nhiều mục tiêu độc lập.
- **Nhánh:** Nhánh phase hiện có hoặc nhánh mới nếu phase chưa có.
- **Commit nền:** SHA trước khi bắt đầu.
- **Trong phạm vi:**
- **Ngoài phạm vi:**

### Đầu vào và phụ thuộc

- **Đầu vào:** Contract, file, dữ liệu hoặc hành vi đã tồn tại cần sử dụng.
- **Phụ thuộc đã đạt:** Task, migration, service hoặc quyết định kiến trúc bắt buộc có trước.
- **Giả định cần xác minh:** Điều chưa chắc chắn có thể làm thay đổi cách triển khai.

### Đầu ra và nghiệm thu

- **Đầu ra:** File, API, schema, migration, image hoặc hành vi phải tạo ra.
- **Đường thành công:** Kết quả người dùng/hệ thống quan sát được.
- **Điều kiện nghiệm thu:** Bằng chứng cụ thể để kết luận task hoàn thành.

### Lỗi và tính bền vững

- **Input sai:** Cách validate và lỗi trả về; không tạo side effect trước khi validate xong.
- **Dependency lỗi hoặc timeout:** Cách dừng, báo lỗi và giữ trạng thái nhất quán.
- **Retry/idempotency:** Có retry hay không, giới hạn và điều kiện an toàn khi chạy lại.
- **Trạng thái không xác định:** Cách reconcile nếu không biết external side effect đã xảy ra hay chưa.

### Bảo mật và dữ liệu

- **Xác thực/phân quyền/tenant:** Nơi kiểm tra trước khi đọc hoặc ghi dữ liệu.
- **Secret/PII:** Nguồn lấy secret, quy tắc redaction và nơi tuyệt đối không được ghi.
- **Bề mặt tấn công:** Input không tin cậy, outbound request, file, tool hoặc command cần giới hạn.

### Kiểm thử và bằng chứng

- **Test tự động:** Happy path và failure path liên quan.
- **Quality gate:** Lint, format, typecheck, test, build hoặc kiểm tra migration/container phù hợp.
- **Bằng chứng:** Lệnh đã chạy và kết quả thật; không coi placeholder hoặc kiểm tra tĩnh là runtime pass.

### Rollback và bàn giao

- **Rollback source/config:** Cách quay lại mà không xóa thay đổi ngoài task.
- **Rollback schema/data:** Cách bảo toàn dữ liệu; không giả định `git revert` tự phục hồi database/file.
- **Ảnh hưởng còn lại:** Queue job, cache, object, secret hoặc external side effect cần xử lý riêng.
- **File stage:** Chỉ liệt kê file thuộc task.
- **Commit đề xuất:** Loại chuẩn và mô tả tiếng Việt, không chứa mã phase/task.
- **Bước tiếp theo:** Task kế tiếp hoặc blocker còn lại.

## Ví dụ đã điền — thêm healthcheck Redis cho Docker Compose

### Nhận diện

- **Tên task:** Thêm healthcheck Redis cho Docker Compose.
- **Mục tiêu:** Compose chỉ coi Redis sẵn sàng sau khi `redis-cli ping` thành công.
- **Nhánh:** `feat/docker-ung-dung` nếu đã tồn tại; nếu chưa có thì tạo từ `main` đã đồng bộ.
- **Commit nền:** SHA của nhánh trước khi sửa.
- **Trong phạm vi:** Service Redis và dependency condition liên quan trong Compose.
- **Ngoài phạm vi:** Authentication Redis, Redis Cluster, backup và hardening production.

### Đầu vào và phụ thuộc

- **Đầu vào:** `deployment/compose.yaml`, image Redis đã được pin và Docker Compose plugin.
- **Phụ thuộc đã đạt:** Compose parse hợp lệ và service Redis đã tồn tại.
- **Giả định cần xác minh:** Image có `redis-cli`; Docker daemon đang chạy để kiểm tra runtime.

### Đầu ra và nghiệm thu

- **Đầu ra:** Healthcheck có interval, timeout và số lần retry hữu hạn; service phụ thuộc dùng `condition: service_healthy` khi thực sự cần Redis.
- **Đường thành công:** Redis chuyển sang trạng thái `healthy`, sau đó service phụ thuộc mới khởi động.
- **Điều kiện nghiệm thu:** Compose config hợp lệ và container đạt `healthy` trong runtime test.

### Lỗi và tính bền vững

- **Input sai:** YAML hoặc command healthcheck sai phải làm `docker compose config` hoặc runtime check thất bại.
- **Dependency lỗi hoặc timeout:** Redis không healthy sau giới hạn retry; service phụ thuộc không được báo sẵn sàng giả.
- **Retry/idempotency:** Healthcheck chỉ đọc trạng thái, được phép chạy lặp với chu kỳ hữu hạn.
- **Trạng thái không xác định:** Nếu Docker daemon không chạy, ghi rõ runtime chưa kiểm chứng; không suy diễn từ việc parse YAML thành công.

### Bảo mật và dữ liệu

- **Xác thực/phân quyền/tenant:** Không áp dụng cho healthcheck nội bộ ở task này.
- **Secret/PII:** Không hardcode mật khẩu hoặc in connection string vào healthcheck/log.
- **Bề mặt tấn công:** Không thêm command shell nhận dữ liệu từ người dùng và không mở thêm port.

### Kiểm thử và bằng chứng

- **Test tự động:** `docker compose -f deployment/compose.yaml config --quiet`.
- **Runtime test:** Khởi động riêng Redis, chờ health status và xác nhận `redis-cli ping` trả `PONG`.
- **Failure path:** Dùng fixture Compose test hoặc command sai có chủ đích để chứng minh kiểm tra thất bại, không sửa file production thành trạng thái lỗi rồi commit.
- **Quality gate:** Review resolved Compose config và `git diff --check`.

### Rollback và bàn giao

- **Rollback source/config:** Revert riêng thay đổi healthcheck/dependency condition.
- **Rollback schema/data:** Không có migration; không chạy `docker compose down -v`, vì xóa volume không phải rollback task.
- **Ảnh hưởng còn lại:** Container có thể cần recreate sau khi rollback; dữ liệu volume phải được giữ nguyên.
- **File stage:** `deployment/compose.yaml` và test/fixture liên quan nếu có.
- **Commit đề xuất:** `chore(docker): thêm healthcheck Redis`.
- **Bước tiếp theo:** Chỉ thêm healthcheck cho service khác trong task riêng khi service đó tồn tại.
