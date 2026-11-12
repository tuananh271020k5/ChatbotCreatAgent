---
name: handoff
description: Ghi hoặc tiếp nhận checkpoint công việc cục bộ khi người dùng muốn chuyển giữa Codex, Claude và Antigravity, tạm dừng hoặc tiếp tục một nhiệm vụ đang dở.
---

# Bàn giao công việc giữa các AI

Dùng `.ai-local/CURRENT_TASK.md` làm bản tóm tắt bàn giao. Đây là dữ liệu hỗ trợ; mã nguồn và Git luôn là nguồn sự thật.

## Khi bàn giao

1. Xác định mục tiêu hiện tại từ yêu cầu và cuộc hội thoại.
2. Kiểm tra branch, commit nền, `git status`, phần thay đổi liên quan và kết quả kiểm thử đã có. Không cần đọc lại toàn bộ repository.
3. Tạo thư mục `.ai-local/` nếu chưa có rồi cập nhật `CURRENT_TASK.md` với các mục:
   - Thời điểm cập nhật.
   - Mục tiêu và phạm vi.
   - Branch và commit nền.
   - Phần đã hoàn thành.
   - File hoặc symbol đã thay đổi và lý do.
   - Quyết định kỹ thuật cần giữ nguyên.
   - Kiểm tra đã chạy cùng kết quả.
   - Bước tiếp theo cụ thể.
   - Vướng mắc, giả định và ràng buộc của người dùng.
4. Ghi ngắn gọn nhưng đủ để AI khác tiếp tục. Không chép lịch sử hội thoại, source code, log dài, secret hoặc credential.
5. Không commit file bàn giao. Báo cho người dùng checkpoint đã được cập nhật.

## Khi tiếp nhận

1. Đọc `AGENTS.md` và `.ai-local/CURRENT_TASK.md` nếu file tồn tại.
2. Đối chiếu branch, HEAD và worktree hiện tại với checkpoint. Nếu khác, coi checkpoint là thông tin tham khảo và ưu tiên trạng thái Git thực tế.
3. Dùng `git diff` có phạm vi và CodeGraph khi cần hiểu quan hệ code; không quét lại toàn bộ repository nếu checkpoint vẫn đúng.
4. Tiếp tục từ bước tiếp theo đã ghi, trừ khi trạng thái code cho thấy công việc đã hoàn thành hoặc hướng đi không còn hợp lệ.
5. Nêu ngắn gọn bất kỳ sai lệch hoặc thông tin còn thiếu nào trước khi thực hiện thay đổi có rủi ro.

Không cập nhật checkpoint sau mọi thao tác nhỏ. Chỉ cập nhật khi người dùng yêu cầu bàn giao hoặc tại một mốc có ý nghĩa của công việc.
