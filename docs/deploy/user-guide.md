# FairShare – Hướng dẫn cài đặt và sử dụng

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (WP5 – Kiểm thử & Triển khai) | **Cập nhật:** 14/11/2026
**Áp dụng cho:** `master` @ `d2eab98`
**Phạm vi:** Phần A là hướng dẫn cài đặt (Deployment Guide), cho người dựng hệ thống. Phần B là hướng dẫn sử dụng (User Guide), cho sinh viên, trưởng nhóm và giảng viên.

> **Về Trello (CR-02):** kế hoạch ban đầu thu thập dữ liệu từ Trello qua API/Webhook. Theo **CR-02**, nhóm đã thay bằng **Task Board nội bộ** (Kanban trong FairShare). Mọi sự kiện đóng góp giờ được ghi trực tiếp từ board nội bộ, FairShare không còn kết nối Trello.

---

## PHẦN A – CÀI ĐẶT (DEPLOYMENT GUIDE)

### A1. Thành phần hệ thống

| Container | Image / công nghệ | Cổng | Vai trò |
|---|---|---|---|
| `fairshare-db` | MariaDB 10.11 | 3306 (chỉ mở ra ngoài ở bản dev) | Lưu dữ liệu. Schema tạo tự động bằng Flyway khi backend khởi động |
| `fairshare-backend` | Java 21, Spring Boot 3 (build nhiều tầng bằng Maven) | 8080 | REST API `/api/...`, xác thực JWT, tính điểm đóng góp, xuất PDF |
| `fairshare-frontend` | React 18 + Vite, phục vụ bằng Nginx | 80 (dev) / 8081 (staging) | Giao diện web. Nginx chuyển tiếp `/api` sang backend |

Ba container chạy chung mạng Docker `fairshare-network`.

### A2. Yêu cầu

| Hạng mục | Yêu cầu |
|---|---|
| Docker | Docker Engine 24+ và Docker Compose v2.24+. Trên Windows: **Docker Desktop** (dùng WSL 2) |
| Shell | Bash. Trên Windows dùng **Git Bash** (có sẵn khi cài Git) hoặc WSL để chạy `scripts/*.sh` |
| Python 3 | Chỉ cần khi chạy test tích hợp/regression (`scripts/*.py`) |
| RAM | Tối thiểu 4 GB trống cho 3 container |
| Cổng trống | 8080 và 80 (dev), hoặc 8080 và 8081 (staging) |

### A3. Cách 1 – Chạy nhanh để dùng thử (dev)

```bash
git clone https://github.com/rtmiue20/fairshare.git
cd fairshare
cp .env.example .env        # rồi mở .env, điền DB_PASSWORD và DB_ROOT_PASSWORD
docker compose up -d --build
docker compose ps           # chờ cả 3 container ở trạng thái Up / healthy
```

Mở trình duyệt: **http://localhost** (cổng `FRONTEND_PORT`, mặc định 80).

> ⚠️ Bản dev chưa truyền `JWT_SECRET` (lỗi DEF-18, đang xử lý), nên backend dùng secret mặc định. **Không dùng cách này cho demo công khai.** Khi cần đưa cho người ngoài dùng, chạy theo Cách 2.

### A4. Cách 2 – Staging / UAT / demo (khuyến nghị)

Chi tiết đầy đủ ở `docs/deploy/staging.md`. Tóm tắt:

```bash
git pull origin master
./scripts/staging-up.sh       # Windows: chạy trong Git Bash
```

Script làm lần lượt các bước:
1. Nếu chưa có `.env.staging`: tạo từ `.env.staging.example`, sinh ngẫu nhiên `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET` (64 ký tự hex).
2. Build image, chạy 3 container với project name `fairshare-staging`. Dữ liệu staging tách hẳn khỏi bản dev.
3. Chờ healthcheck, rồi chạy `scripts/staging-smoke.sh` (11 kiểm tra). Kết quả mong đợi: `SMOKE TEST: PASS`.

Mở trình duyệt: **http://localhost:8081** (hoặc `http://<địa chỉ máy staging>:8081` khi chạy trên máy chung).

| Việc | Lệnh |
|---|---|
| Xem trạng thái | `docker compose -p fairshare-staging ps` |
| Xem log backend | `docker compose -p fairshare-staging logs -f backend` |
| Cập nhật bản mới | `git pull && ./scripts/staging-up.sh` |
| Tắt, giữ dữ liệu | `./scripts/staging-up.sh down` |
| Xóa sạch dữ liệu | `./scripts/staging-up.sh reset` |
| Sao lưu DB | xem `docs/deploy/staging.md` mục 4 |

### A5. Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DB_NAME`, `DB_USER` | Có (đã có giá trị mặc định) | Tên CSDL và tài khoản ứng dụng |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | **Có** | Mật khẩu MariaDB. Sau khi volume DB đã được tạo thì **không đổi** nữa |
| `JWT_SECRET` | **Có** (staging) | Chuỗi ngẫu nhiên ≥ 32 byte để ký token đăng nhập |
| `JWT_EXPIRATION_MS` | Không | Thời hạn token, mặc định 86 400 000 ms (24 giờ) |
| `BACKEND_PORT`, `FRONTEND_PORT` | Không | Cổng xuất ra máy host |

Không commit `.env` và `.env.staging` lên Git (cả hai đã có trong `.gitignore`).

### A6. Tài khoản dùng thử và dữ liệu mẫu

- Hệ thống không có tài khoản tạo sẵn. Người dùng tự đăng ký ở `/register`.
- Dữ liệu mẫu lớn của M3 (6 thành viên, 500 sự kiện, 5 sprint): `fairshare-backend/src/main/resources/seed/large_dataset_500_tasks.sql`. Seed phải nạp **trước** khi có ai đăng ký, vì seed dùng `users.id` 1–6. Lệnh nạp xem `docs/qa/test-report-sprint5.md` mục 7.
- Tài khoản demo cho buổi bảo vệ: `<TODO: điền sau khi dựng bản demo – email Leader, email thành viên; mật khẩu gửi riêng trong nhóm, không ghi vào repo>`.

### A7. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `docker: command not found` (Windows) | Chưa cài hoặc chưa mở Docker Desktop | Cài Docker Desktop, mở ứng dụng, chờ biểu tượng cá voi chuyển sang "running" |
| `bash: ./scripts/staging-up.sh: /bin/bash^M` | File bị đổi xuống dòng kiểu Windows (CRLF) | `git config core.autocrlf input`, rồi clone lại hoặc chạy `dos2unix scripts/*.sh` |
| Backend `unhealthy`, log có `Access denied for user` | Đổi `DB_PASSWORD` sau khi volume đã tạo | `./scripts/staging-up.sh reset` (mất dữ liệu staging) |
| Flyway báo `checksum mismatch` | Migration cũ bị sửa | Không sửa migration đã chạy; tạo file `V<n+1>__...` mới |
| `/api/...` trả 502 | Backend chưa sẵn sàng | Xem log backend, chờ healthcheck (tối đa khoảng 3 phút) |
| `Bind for 0.0.0.0:8081 failed` | Cổng đã bị chiếm | Đổi `FRONTEND_PORT` trong file env |
| `PKIX path building failed` khi build | Mạng có proxy chặn SSL | Build jar trên máy (`./mvnw package -DskipTests`) rồi build image, hoặc đổi mạng |

---

## PHẦN B – SỬ DỤNG (USER GUIDE)

### B1. Vai trò

| Vai trò | Làm được |
|---|---|
| **Trưởng nhóm (Leader)** | Tạo dự án, mời thành viên, quản lý sprint, tạo cột trên board, mở/đóng đợt chấm chéo, xuất báo cáo PDF |
| **Thành viên (Member)** | Đồng thuận chia sẻ dữ liệu, làm việc trên board (thẻ được giao), chấm chéo, khai báo đóng góp ngoài board, xem bảng đóng góp |
| **Giảng viên** | Nhận báo cáo PDF do trưởng nhóm xuất (không cần tài khoản) |

Menu chính (thanh điều hướng trên cùng): **Bảng đóng góp** (`/dashboard`) · **Nhóm đồ án** (`/teams`) · **Kanban Board** (`/board`) · **Chấm chéo** (`/peer-review`) · **Cảnh báo** (`/alerts`) · **Hồ sơ & Consent** (`/profile`).

> Ảnh minh họa: mỗi mục dưới đây có chỗ `<TODO: ảnh ...>`. Ảnh sẽ chụp trên bản demo (có ngày giờ trên màn hình) và lưu vào `docs/qa/evidence/user-guide/`.

### B2. Đăng ký và đăng nhập

1. Mở trang chủ, chọn **Đăng ký** (`/register`). Nhập họ tên, email, mật khẩu. Email phải đúng định dạng; nếu nhập sai, form báo lỗi ngay dưới từng ô.
2. Đăng nhập tại `/login`. Phiên đăng nhập giữ 24 giờ. Tải lại trang (F5) không bị đăng xuất.

`<TODO: ảnh màn hình đăng nhập>`

### B3. Tạo dự án hoặc tham gia nhóm

**Trưởng nhóm tạo dự án:**
1. Vào **Nhóm đồ án** → bấm **+ Tạo dự án**.
2. Nhập **Tên đề tài**, **Môn học / Lớp học phần**, **Mô tả** → **Tiếp tục**.
3. Hệ thống tự cấu hình bảng **Kanban 4 cột** và sinh **Mã mời** (6–8 ký tự). Người tạo trở thành **Nhóm trưởng (Leader)**.

**Thành viên tham gia:**
1. Vào **Nhóm đồ án** → **+ Tạo dự án** → chọn tham gia bằng mã, nhập **Mã mời tham gia nhóm (Invite Code)** do trưởng nhóm gửi.
2. Hoặc trưởng nhóm mời trực tiếp từ trang chi tiết nhóm: **+ Mời thành viên**. Mã mời cũng hiện ở mục **Mã tham gia**.

`<TODO: ảnh hộp thoại Tạo dự án mới>`

### B4. Đồng thuận chia sẻ dữ liệu (Consent – Nghị định 13/2023/NĐ-CP)

1. Khi vào nhóm, thành viên đọc **Chính sách Consent NĐ 13** và xác nhận đồng thuận.
2. Thay đổi bất cứ lúc nào tại **Hồ sơ & Consent** (`/profile`) hoặc mục **Cài đặt Consent** trong trang nhóm. Các tùy chọn:
   - **Hiển thị tỷ lệ đóng góp trong nhóm**
   - **Tham gia chấm chéo ẩn danh (Peer Review)**
   - Ghi nhận tiến độ hoàn thành task theo sprint
   - Cho phép đọc hash commit và thống kê đóng góp mã nguồn
3. **Rút lại đồng thuận:** dùng mục **Quyền rút lại Consent**. Dữ liệu đã chốt ở sprint trước được giữ nguyên.

Người không đồng thuận vẫn ghi nhận được công sức qua **Khai báo đóng góp** (mục B8), có thành viên khác xác nhận.

`<TODO: ảnh trang Hồ sơ & Consent>`

### B5. Quản lý sprint (Trưởng nhóm)

Trong trang chi tiết nhóm, mục **Lộ trình Sprints theo Đồ án Môn học**: tạo sprint (tên, ngày bắt đầu, ngày kết thúc) và theo dõi **Sprint hiện tại**. Điểm đóng góp, chấm chéo và báo cáo đều tính theo sprint.

`<TODO: ảnh lộ trình sprint>`

### B6. Task Board nội bộ (Kanban) – thay cho Trello

Vào **Kanban Board** (`/board`), hoặc từ trang nhóm chọn board của nhóm (`/teams/{id}/board`).

| Việc | Cách làm | Ai làm được |
|---|---|---|
| Tạo cột | **+ Thêm cột đầu tiên** / **Thêm cột**, nhập **Tên cột** | Chỉ Leader |
| Tạo thẻ (công việc) | **+ Thêm công việc** → nhập **Tiêu đề công việc**, **Mô tả**, **Người phụ trách (Assignee)**, **Story Points**, độ khó (1 Dễ … 4 Rất khó), **Hạn hoàn thành (Due date)**, **Cột bắt đầu** → **Tạo thẻ & Ghi Event** | Thành viên trong nhóm |
| Chuyển trạng thái | Kéo thả thẻ sang cột khác. Kéo vào cột **Done** = hoàn thành | Người phụ trách thẻ, hoặc Leader |
| Xem/sửa chi tiết | Bấm vào thẻ → **Chi tiết công việc** → **Lưu thay đổi** | Như trên |
| Gắn minh chứng | Trong chi tiết thẻ: **Tệp đính kèm & Minh chứng** (tải ảnh lên hoặc **Thêm link**) | Như trên |
| Checklist, bình luận | **Việc cần làm (Checklist)**, **Nhận xét và hoạt động** | Thành viên |

**Cách hệ thống ghi nhận đóng góp:** mỗi thao tác (tạo thẻ, giao việc, chuyển cột, hoàn thành) sinh một **sự kiện hoạt động** không sửa được. Hệ thống dùng các sự kiện này để tính điểm. Thẻ hoàn thành đúng hạn được tính cao hơn thẻ trễ hạn. Hệ thống luôn dùng tên cột thật trên board, nên không thể "giả" hoàn thành bằng cách gửi dữ liệu sửa tay.

**Lưu ý phân quyền:** người ngoài nhóm không xem hay sửa được board. Thành viên chỉ kéo được thẻ mình phụ trách.

`<TODO: ảnh board 4 cột có thẻ>` `<TODO: ảnh chi tiết thẻ>`

### B7. Bảng đóng góp (Dashboard)

Vào **Bảng đóng góp** (`/dashboard`):
1. Chọn sprint cần xem.
2. Xem biểu đồ tỷ lệ đóng góp (%) của từng thành viên. Tổng các tỷ lệ luôn bằng 100%.
3. Bấm vào một thành viên để xem **bằng chứng gốc** (truy vết): thẻ nào, sự kiện gì, lúc nào.
4. Nút **Khai báo ngoài Board** mở trang khai báo thủ công (mục B8).

FairShare là **công cụ hỗ trợ ra quyết định**. Tỷ lệ đóng góp là căn cứ tham khảo, không tự quyết định điểm của ai.

`<TODO: ảnh dashboard>`

### B8. Khai báo đóng góp ngoài board

Dùng cho công việc không nằm trên board (ví dụ họp với khách hàng, khảo sát, viết báo cáo):
1. Vào `/contributions/manual` → **+ Khai báo đóng góp**: chọn sprint, mô tả, số SP đề xuất, link minh chứng.
2. Khai báo ở trạng thái **Chờ duyệt (Pending)**. Một **thành viên khác** trong nhóm xét và bấm **Duyệt** hoặc **Từ chối**. Không ai tự duyệt khai báo của chính mình.
3. Chỉ khai báo **Đã duyệt (Approved)** mới được cộng vào điểm.

`<TODO: ảnh trang khai báo đóng góp>`

### B9. Chấm chéo ẩn danh (Peer Review 360°)

**Trưởng nhóm:**
1. Vào **Chấm chéo** → **Khởi tạo đợt chấm chéo mới**: chọn sprint, đặt tên → **Tạo đợt chấm mới**. Đợt mới ở trạng thái **Bản nháp (DRAFT)**.
2. Bấm **Mở đợt chấm** để thành viên bắt đầu chấm. Hết hạn thì bấm **Đóng đợt chấm**; khi đó đợt chuyển sang trạng thái kết thúc (CLOSED).

**Thành viên:**
1. Chọn đợt đang mở. Mục **Đồng đội cần đánh giá** liệt kê các thành viên khác.
2. Chấm từng tiêu chí theo thang 1–5 (chất lượng, đúng hạn, tinh thần hợp tác…) và viết nhận xét nếu muốn → **Gửi đánh giá ẩn danh**.
3. Mỗi người chỉ chấm mỗi đồng đội một lần mỗi đợt.

**Bảo vệ danh tính:** điểm của một người **chỉ hiện khi có ít nhất 3 người khác nhau đã chấm** (**Đạt chuẩn ẩn danh (≥ 3 phiếu)**). Dưới ngưỡng này, màn hình chỉ báo **Bảo vệ danh tính (Dưới ngưỡng)**, không hiện điểm. Không ai, kể cả trưởng nhóm, xem được ai chấm ai.

`<TODO: ảnh phiếu chấm>` `<TODO: ảnh kết quả đạt ngưỡng và dưới ngưỡng>`

### B10. Cảnh báo sớm

Vào **Cảnh báo** (`/alerts`) để xem cảnh báo theo quy tắc, ví dụ thành viên không có hoạt động trong sprint hoặc có nhiều thẻ trễ hạn. Trưởng nhóm có thể gửi nhắc nhở cho thành viên.

`<TODO: ảnh danh sách cảnh báo>`

### B11. Xuất báo cáo PDF cho giảng viên (Trưởng nhóm)

- Cách 1: ở **Bảng đóng góp**, bấm **📄 Xuất báo cáo PDF**. Trình duyệt tải về file `fairshare-report-team-<mã nhóm>-sprint-<mã sprint>.pdf`.
- Cách 2: vào `/report` → **Chọn Sprint xuất báo cáo** → **Xem trước / In** → lưu PDF từ hộp thoại in của trình duyệt.

Báo cáo gồm: tỷ lệ đóng góp từng người, điểm chấm chéo (chỉ khi đạt ngưỡng ≥ 3 người chấm), bằng chứng chính, chỗ ký của trưởng nhóm và giảng viên. Chỉ thành viên trong nhóm xuất được báo cáo của nhóm mình.

`<TODO: ảnh trang xuất báo cáo>` `<TODO: ảnh trang đầu file PDF>`

### B12. Câu hỏi thường gặp

| Câu hỏi | Trả lời |
|---|---|
| Tôi làm nhiều nhưng tỷ lệ thấp? | Kiểm tra thẻ đã được giao cho bạn và đã kéo vào **Done** chưa. Việc ngoài board thì dùng **Khai báo đóng góp** |
| Vì sao tôi chưa thấy điểm chấm chéo của mình? | Chưa đủ 3 người chấm. Đây là cơ chế bảo vệ danh tính |
| Tôi không kéo được thẻ? | Thành viên chỉ kéo được thẻ mình phụ trách. Nhờ trưởng nhóm giao lại thẻ |
| FairShare có đọc Trello của nhóm không? | Không. Theo CR-02, FairShare dùng Task Board nội bộ, không kết nối Trello |
