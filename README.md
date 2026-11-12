# AI Agent Builder Platform

Base monorepo cho nền tảng **AI Agent Builder** (build-time) và **Workflow Engine**
(runtime), được dựng theo `AI_Agent_Builder_Implementation_Guide.docx`.

## Phạm vi sản phẩm mục tiêu

Nền tảng cho phép một tổ chức thiết kế, kiểm tra, phê duyệt, phát hành và vận hành
AI Agent qua hội thoại hoặc Visual Workflow Builder. LLM có thể đề xuất cấu trúc,
nhưng backend phải validate workflow, quyền và cấu hình trước khi runtime thực thi.

Phạm vi mục tiêu gồm:

- Tạo Agent bằng hội thoại hoặc canvas và quản lý các phiên bản bất biến đã phát hành.
- Cấu hình model, prompt, RAG và MCP/tool qua adapter có kiểm soát.
- Validate workflow, permission và guardrail trước khi chạy và kiểm tra lại tại runtime.
- Thực thi workflow có trạng thái, lịch sử, retry có giới hạn, checkpoint và resume.
- Phê duyệt hành động rủi ro, audit quyết định, theo dõi usage và chất lượng.

Không thuộc phạm vi mặc định:

- Cho LLM tự cấp quyền, tự chạy mã tùy ý hoặc điều khiển Docker daemon.
- Huấn luyện/fine-tune model hoặc tự vận hành hạ tầng GPU ngay trong nền tảng.
- Cam kết Kubernetes, multi-region, HA hoặc zero-downtime ở giai đoạn single-host.
- Tự cung cấp credential, quota hoặc quyền truy cập của dịch vụ bên thứ ba.

Đây là phạm vi sản phẩm đích, không phải tuyên bố các chức năng trên đã được triển khai.

## Vai trò và hành trình nghiệm thu

Các persona dưới đây mô tả trách nhiệm sản phẩm, chưa phải role enum hoặc permission
đã được cài đặt. Một người có thể đảm nhiệm nhiều persona trong cùng tenant.

| Persona              | Trách nhiệm chính                                                                                                    | Hành trình có thể nghiệm thu                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Chủ sở hữu nền tảng  | Thiết lập tenant, provider, chính sách, giới hạn và quan sát vận hành.                                               | Tạo không gian tổ chức cô lập, cấu hình adapter bằng tham chiếu secret, xem usage và audit mà không lộ credential.          |
| Người thiết kế Agent | Mô tả mục tiêu, dựng workflow, chọn model/prompt/tool/RAG, validate và thử nghiệm.                                   | Tạo draft qua chat hoặc canvas, sửa hết lỗi validation, chạy test và gửi đúng phiên bản để duyệt.                           |
| Người duyệt          | Đánh giá workflow version, quyền tool, rủi ro và kết quả test trước khi phát hành hoặc thực hiện hành động nhạy cảm. | Xem đúng snapshot cần duyệt, phê duyệt hoặc từ chối có lý do; quyết định được audit và không âm thầm đổi phiên bản.         |
| Người chạy Agent     | Sử dụng Agent đã được cấp quyền và theo dõi kết quả thực thi.                                                        | Khởi chạy phiên bản đã phát hành, xem trạng thái/kết quả, tiếp tục phiên chờ khi hợp lệ và bị chặn rõ ràng nếu thiếu quyền. |

Hành trình tổng quát: chủ sở hữu chuẩn bị môi trường và chính sách → người thiết kế tạo
và test draft → người duyệt quyết định phiên bản → người chạy thực thi → hệ thống lưu
lịch sử, audit và số liệu vận hành.

## Quyết định kiến trúc nền tảng

Kiến trúc mặc định đã được chấp thuận theo hướng Docker-first modular monolith:

- `backend` là NestJS modular monolith, giữ domain và transaction trong một ranh giới triển khai ở giai đoạn đầu.
- `frontend` là ứng dụng Next.js độc lập và không thực thi validation, permission hoặc workflow runtime thay backend.
- Workflow worker được tách thành process/container khi runtime cần, nhưng tái sử dụng domain package thay vì sao chép logic hoặc tách microservice sớm.
- PostgreSQL là system of record cho cấu hình, version, execution và audit; Redis chỉ phục vụ cache/queue và không phải nguồn phục hồi dữ liệu.
- Model, MCP, identity, object storage và dịch vụ ngoài được truy cập qua interface/adapter; domain không phụ thuộc trực tiếp một provider SDK.
- Dockerfile và Compose tập trung trong `deployment`; local ưu tiên chỉ cần Git và Docker, còn production ban đầu theo mô hình single-host.

Chỉ xem xét tách service hoặc bổ sung Python worker khi có bằng chứng về nhu cầu mở rộng độc lập, cô lập lỗi/bảo mật, workload Python chuyên biệt hoặc bottleneck đã đo được.

## Phạm vi hiện tại

Repository này mới chỉ chứa khung kỹ thuật:

- `backend`: ứng dụng NestJS tối thiểu, chưa có API nghiệp vụ.
- `frontend`: ứng dụng Next.js tối thiểu, chưa có Visual Workflow Builder.
- `packages/contracts`: vị trí dành cho contract dùng chung, hiện chưa định nghĩa domain.
- `database/init`: nơi dành cho script bootstrap PostgreSQL khi thực sự cần.
- `deployment`: Dockerfile và Docker Compose cho môi trường development/production.

Chưa có Model Gateway, LLM call, MCP client, RAG, Workflow Engine, authentication,
database, Redis hay logic triển khai Agent.

## Yêu cầu môi trường

- Node.js `22.23.5` được khuyến nghị qua `.nvmrc`/`.node-version`; dải tương thích tạm thời là `>=22.19.0 <23`.
- npm `10.9.9` là bản chuẩn; dải tương thích tạm thời là `>=10.9.3 <11`.
- Docker Engine/Desktop có Docker Compose plugin nếu chạy bằng container.

Node 22 hết vòng đời hỗ trợ vào ngày 30/04/2027; cần nâng major đã kiểm thử trước mốc này.

## Khởi động base

```bash
npm install
copy .env.example .env
npm run dev:backend
```

Mở terminal khác:

```bash
npm run dev:frontend
```

- Web: `http://localhost:3000`
- API base: `http://localhost:3001/api` (chưa khai báo endpoint)

## Khởi động bằng Docker

```bash
copy .env.example .env
npm run docker:dev
```

Chạy cấu hình gần production ở chế độ nền:

```bash
npm run docker:up
```

Dừng stack:

```bash
npm run docker:down
```

## Đóng góp và quy trình Git

Xem [CONTRIBUTING.md](CONTRIBUTING.md) để chọn nhánh, tạo commit tiếng Việt, kiểm tra
thay đổi và push từng task.
