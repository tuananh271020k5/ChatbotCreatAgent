# Quy trình đóng góp

## Nguyên tắc nhánh

- `main` chỉ chứa phase đã nghiệm thu; không commit trực tiếp lên `main`.
- Mỗi phase dùng một nhánh `feat/<ten-phase>` viết ASCII, chữ thường và dấu gạch ngang, ví dụ `feat/quy-uoc-chat-luong` hoặc `feat/docker-ung-dung`.
- Các task thuộc cùng phase tiếp tục trên cùng nhánh; không tạo một nhánh cho mỗi task.
- Trước task mới, kiểm tra nhánh bằng `git branch --show-current`. Nếu nhánh phase đã tồn tại thì chuyển sang nhánh đó; chỉ tạo nhánh khi chưa tồn tại.
- Nhánh sửa lỗi dùng `fix/<mo-ta-loi>`, hotfix dùng `hotfix/<mo-ta-loi>`.
- Mã phase/task trong kế hoạch cục bộ không xuất hiện trong tên nhánh hoặc commit.

## Bắt đầu một phase

Chỉ bắt đầu khi phase phụ thuộc đã hợp nhất và worktree sạch:

```powershell
git status --short --branch
git switch main
git pull --ff-only origin main
git branch --list feat/ten-phase
git switch -c feat/ten-phase
```

Nếu nhánh đã tồn tại, không chạy `switch -c`:

```powershell
git switch feat/ten-phase
git pull --ff-only
```

## Một task, một commit nguyên tử

Mỗi commit chỉ giải quyết một mục tiêu review được. Implementation, test liên quan, migration và thay đổi contract/public documentation cần thiết phải đi cùng task; không tạo commit cố ý chứa code chưa chạy được.

Trước khi triển khai, dùng [TASK_TEMPLATE.md](TASK_TEMPLATE.md) để chốt đầu vào, đầu ra, phụ thuộc, xử lý lỗi, bảo mật, kiểm thử và rollback. Đây là checklist làm việc; không bắt buộc tạo một file mới cho từng task.

Trước commit:

```powershell
git branch --show-current
git status --short
git diff
# Chạy quality gate phù hợp với phạm vi task
git add <cac-file-thuoc-task>
git diff --cached
git diff --cached --check
```

Không dùng `git add -A` theo thói quen khi worktree có thay đổi ngoài task.

## Commit tiếng Việt

Dùng dạng `<loại>(<phạm-vi tùy chọn>): <mô tả tiếng Việt>`:

| Loại       | Khi sử dụng                            |
| ---------- | -------------------------------------- |
| `feat`     | Thêm hành vi hoặc capability mới       |
| `fix`      | Sửa lỗi có thể quan sát                |
| `docs`     | Thay đổi tài liệu công khai            |
| `test`     | Thêm hoặc sửa kiểm thử                 |
| `refactor` | Đổi cấu trúc nhưng không đổi hành vi   |
| `chore`    | Bảo trì repository hoặc công cụ        |
| `build`    | Build, dependency hoặc container image |
| `ci`       | Pipeline CI/CD                         |
| `perf`     | Tối ưu hiệu năng có đo kiểm            |

Ví dụ:

```powershell
git commit -m "docs: chốt kiến trúc Docker ưu tiên"
git commit -m "feat(agent): thêm API tạo Agent"
git commit -m "fix(workflow): ngăn thực thi lặp vô hạn"
git commit -m "test(api): bổ sung kiểm thử phiên hết hạn"
```

Không thêm mã như `P00-T03` vào commit. Mô tả dùng động từ rõ ràng, không dùng các câu chung chung như “cập nhật code” hoặc “sửa lỗi”.

## Push và kết thúc phase

Sau mỗi commit đã qua kiểm tra, push để remote có checkpoint:

```powershell
git push -u origin feat/ten-phase  # lần đầu
git push                           # các lần sau
```

Trước khi push, xác nhận lại nhánh hiện tại. Khi phase đạt cổng nghiệm thu, hợp nhất vào `main` bằng pull request hoặc merge giữ lịch sử commit; không squash mặc định và không force-push để sửa lịch sử đã chia sẻ.
