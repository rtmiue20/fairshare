# Báo cáo kiểm thử cuối (Final Test Report) – FairShare

**Người thực hiện:** M5 – Khiếu Hoàng Nam Anh (PM QA & Deployment, WP5) · **Ngày chạy:** 24/11/2026, 21:45–22:00 (GMT+7)
**Bản được kiểm thử:** `master` @ `677a9be` (merge PR #113, 23/11 21:58), gồm mọi thay đổi đến PR #110–#113
**Môi trường:** staging dựng sạch bằng `docker-compose.yml` + `docker-compose.staging.yml` (Nginx → Spring Boot profile `prod` → MariaDB 10.11), Docker 29.9.3, Java 21, Maven 3.9, Node 22. Jar và bundle frontend build trên máy chạy rồi đóng image từ cùng mã nguồn (Docker Hub giới hạn lượt kéo nên không build trong container). Dữ liệu: seed M3 `large_dataset_500_tasks.sql` (nhóm 6 người, 500 sự kiện), `uat-seed.py`, `demo-seed.py`.
**Thẻ Trello:** "[S7] Báo cáo kiểm thử cuối (Final Test Report)" · **Minh chứng:** `docs/qa/evidence/*-2026-11-24.*`

## 1. Kết luận

| Hạng mục | Kết quả 24/11 | Đánh giá |
|---|---|---|
| Unit test backend (JUnit 5, Mockito, Testcontainers) | **243/243**, 0 skip | Đạt |
| Unit test frontend (Vitest, Testing Library) | **21 file, 99/99** | Đạt |
| Lint, build frontend | `eslint` 0 lỗi; `npm run build` đạt | Đạt |
| Smoke test staging | **PASS** (3 container healthy) | Đạt |
| Tích hợp (board → `ActivityEvent` → điểm; chấm chéo → ẩn danh) | **23/23** | Đạt |
| Hồi quy Sprint 5 | **26/30** (PDF-01..04 hỏng do dữ liệu DEF-40) | Đạt chức năng; PDF đo lại trên nhóm sạch |
| Retest Sprint 6 (`retest-sprint6.py`) | **2/9** | Không đạt: DEF-19, 40, 41, 42 còn mở |
| Pilot UAT (`uat-pilot.py`) | **22/24** | Đạt về chống gian lận (2 ca chỉ lệch mã trạng thái) |
| Retest Sprint 7 (`retest-sprint7.py`, mới) | **5/13** trên `master`; **7/13** sau bản sửa của M5 | Không đạt: DEF-58, 59, 60, 65 còn mở |
| **G4** – xuất PDF < 10 s, nhóm 6 người | Chậm nhất **0,110 s** (seed 500 sự kiện), **0,237 s** (nhóm demo sạch, 11 lần) | **Đạt** |
| **G3** – ẩn danh khi < 3 người chấm | IT-PR-03..09, UAT-PR-01, 02 đạt; **DEF-65** lộ phiếu qua API khác | Đạt ở luồng kết quả; **còn lỗ hổng DEF-65** |
| **G2** – truy vết bằng chứng | IT-BRD-06, 07 đạt; evidence 200 cho 5/5 thành viên nhóm demo | Đạt |
| Defect Log | 68 lỗi: **42 Closed**, 18 Open, 6 Fixed – chờ retest, 1 In Progress, 1 Rejected | Còn **3 High Open** + 1 High In Progress |

**Kết luận của QA:** chức năng chính (board, đo đóng góp, chấm chéo ẩn danh, PDF) chạy đúng và đạt G2, G4. Còn 4 lỗi High chưa đóng (DEF-40, 41, 65 Open; DEF-66 In Progress); **M0 đã chấp nhận rủi ro cho cả 4 lỗi ngày 24/11 lúc 22:21**, kèm điều kiện né khi demo (`defect-log.md`, mục "Quyết định chấp nhận rủi ro"). Với quyết định này, bản đạt tiêu chí release. Bản sửa hạ tầng DEF-55..57 của M5 nằm trên nhánh `nam-anh`, cần merge trước khi gắn tag.

## 2. Tiến trình qua các sprint

| Ngày | Bản kiểm | Unit BE | Unit FE | Tích hợp | Hồi quy | Pilot UAT | Lỗi Open / tổng |
|---|---|---|---|---|---|---|---|
| 02/11 (Sprint 3) | `3b1086f` | 19/26 (7 chờ auth) | 17/17 | – | – | – | 7 / 7 |
| 09/11 | `c32a069` | – | – | 11/22 | – | – | – |
| 10/11 (Sprint 5) | `0ed8f05` | 124 (7 skip) | 65/65 | 18/23 | 13/30 | – | – / 26 |
| 15/11 | `d2eab98` | 195 (4 lỗi DEF-27) | 74/74 (14/11) | 23/23 | 30/30 | 14/24 | – / 39 |
| 16/11 | `f18a705` | 233/233 | 86/86 | 23/23 | 30/30 | 20/24 | 8 / 42 |
| 19/11 (trước release) | `adb33ad` | 236/236 | 89/89 | 23/23 | 26/30 | 20/24 | 20 / 54 |
| 20/11 | `709e660` | 238/238 | 96/96 | 23/23 | 26/30 | 20/24 | 29 / 67 |
| **24/11 (cuối)** | **`677a9be`** | **243/243** | **99/99** | **23/23** | **26/30** | **22/24** | **18 / 68** |

Số test backend tăng từ 26 lên 243, frontend từ 17 lên 99. Từ 16/11, unit test backend chạy thật Testcontainers (0 skip). Hồi quy giảm từ 30/30 xuống 26/30 từ 19/11 là do migration V24/V25 (DEF-40) chèn dữ liệu demo vào nhóm id 1, không phải lỗi chức năng PDF.

## 3. Chi tiết theo bộ test (24/11)

### 3.1. Unit test

| Bộ | Lệnh | Kết quả | Minh chứng |
|---|---|---|---|
| Backend | `cd fairshare-backend && mvn -B test` | 243 test, 0 lỗi, 0 skip, 48 lớp test | `backend-unit-docker-2026-11-24.txt` |
| Frontend | `cd frontend && npx vitest run` | 21 file, 99/99 | `frontend-unit-2026-11-24.txt` |
| Lint, build | `npm run lint`, `npm run build` | 0 lỗi; build đạt (cảnh báo kích thước chunk) | `frontend-lint-build-2026-11-24.txt` |

### 3.2. Tích hợp và hồi quy

| Bộ | Theo nhóm | Kết quả | Minh chứng |
|---|---|---|---|
| `integration-sprint4.py` | Board → `ActivityEvent` → điểm (11), chấm chéo → ẩn danh (12) | **23/23** (chạy lại sau bản sửa Nginx: 23/23) | `integration-2026-11-24.txt`, `integration-after-fix-2026-11-24.txt` |
| `regression-sprint5.py` | SCR 8/8, DASH 5/5, PERM 6/6, TRL 3/3, PDF 4/8 | **26/30** | `regression-2026-11-24.txt` |

PDF-01..04 FAIL vì nhóm id 1 không còn sprint 4 (V24/V25 thay dữ liệu seed), nên lần xuất sprint 4 trả lỗi 0,1 KB và PDF thiếu tên. PDF-05..08 (tiếng Việt, người ngoài 403, sprint không tồn tại 404, ghép sai nhóm 404) đều đạt.

### 3.3. Hiệu năng PDF (G4)

| Dữ liệu | Số lần | Chậm nhất | p50 | Kích thước | Minh chứng |
|---|---|---|---|---|---|
| Seed 500 sự kiện, sprint 1–3 (132–135 sự kiện/sprint) | 11 lần/sprint | 0,110 s | 0,045–0,074 s | 71–72 KB | `regression-2026-11-24.txt` |
| Nhóm demo sạch (5 người, có 3 phiếu chấm) | 11 | 0,237 s | 0,086 s | 70,8 KB | `pdf-clean-team-2026-11-24.txt`, `report-clean-team-2026-11-24.pdf` |

Cả hai đều nhỏ hơn ngưỡng 10 s khoảng 40 lần trở lên. PDF có đủ tên tiếng Việt có dấu, điểm chấm chéo 4.3/5 và 4.7/5.

### 3.4. Bảo mật, phân quyền, chống gian lận

| Bộ | Kết quả | Lỗi còn mở | Minh chứng |
|---|---|---|---|
| `uat-pilot.py` UAT-SEC-01..08 | 6/8 (2 ca chỉ lệch mã: 201 ghi đúng người, 400 chặn tự duyệt) | – (DEF-31, 32 đã đóng) | `uat-pilot-2026-11-24.txt` |
| `retest-sprint6.py` | 2/9 | DEF-19 (400 thay 403), 40 (tài khoản demo), 41 (kéo thẻ tự nâng điểm), 42 | `retest-2026-11-24.txt`, `retest-result-sprint6-2026-11-24.json` |
| `retest-sprint7.py` (13 ca, mới 24/11) | 5/13 → 7/13 sau bản sửa M5 | DEF-58, 59, 60, 65 | `retest-sprint7-2026-11-24.txt`, `retest-sprint7-after-fix-2026-11-24.txt`, `retest-sprint7-result-2026-11-24.json` |

## 4. Bản sửa của M5 trong lần kiểm thử này

Ba lỗi hạ tầng do M5 phụ trách được sửa trên nhánh `nam-anh` và kiểm lại ngay trên staging:

| Lỗi | File | Thay đổi | Kiểm lại |
|---|---|---|---|
| DEF-55 (High) | `fairshare-backend/Dockerfile`, `docker-compose.yml` | Tạo `/app/uploads` thuộc user `fairshare`; volume `uploads_data:/app/uploads` | RT7-55: 200; ảnh còn sau khi khởi động lại backend |
| DEF-56 (High) | `frontend/nginx.conf` | `location /uploads/` chuyển sang backend | RT7-56: `image/png` qua `:8081` |
| DEF-57 (Medium) | `frontend/nginx.conf` | `client_max_body_size 20m` (khớp `max-request-size` 20MB) | RT7-57: PNG 2,3 MB → 200 |

Sau bản sửa: smoke PASS, tích hợp 23/23.

## 5. Phạm vi chưa kiểm

| Hạng mục | Lý do | Đề xuất |
|---|---|---|
| Giao diện DEF-39, 46, 48, 49, 51, 52, 54, 61, 62, 63 | Lần chạy này không có trình duyệt nối được tới staging; các lỗi chuyển trạng thái chỉ dựa trên rà mã | M5 kiểm trên trình duyệt trước buổi demo |
| Bản Render (`deploy/render`) | Máy chạy không truy cập được Render; DEF-67 chỉ có trên Render | Kiểm khi có quyền truy cập |
| Tính năng mới PR #112 (AI chatbox TCREI, timeline) | Chỉ có unit test của tác giả (`AiChatServiceTest`); không có ca tích hợp. Chatbox cần khóa API bên ngoài | Ghi vào hạn chế của báo cáo cuối |
| UAT với người dùng thật trên bản cuối | Hết thời gian sprint | Xem `docs/qa/uat-report.md` mục 8 |

## 6. Đối chiếu tiêu chí đạt

Tiêu chí lấy từ chương Kiểm thử & Triển khai, mục 1.4 (`docs/report/M5-chuong-kiem-thu-trien-khai.md`), cộng mục tiêu G4 của Charter.

| Tiêu chí | Kết quả 24/11 | Đạt? |
|---|---|---|
| Unit test 0 fail trên `master` | 243/243, 99/99 | Đạt |
| Mọi lỗi High đóng, hoặc có quyết định chấp nhận rủi ro ghi trong Change Log, trước release | 3 Open (DEF-40, 41, 65) + 1 In Progress (DEF-66); **M0 chấp nhận rủi ro 24/11 22:21** | Đạt (theo quyết định chấp nhận rủi ro) |
| Defect chỉ đóng khi có PR sửa, ca kiểm thử chạy lại đạt, ngày đóng | 6 lỗi đóng 24/11 đều có ca chạy lại (UAT-SEC-03..06, RT7-55..57, RT7-64a, b) | Đạt |
| UAT: ≥ 10 phiếu và không còn lỗi chặn luồng | 10 phiếu; DEF-43 (chặn Audit Trail) đã đóng 20/11 | Đạt (G5 về mức hài lòng chưa đạt, xem `uat-report.md`) |
| G4: xuất PDF < 10 s | 0,237 s | Đạt |

## 7. Cách chạy lại

```bash
./scripts/staging-up.sh reset && ./scripts/staging-up.sh          # dựng staging + smoke
# nạp seed M3 vào CSDL staging, rồi:
python3 scripts/uat-seed.py && python3 scripts/demo-seed.py
TZ=Asia/Ho_Chi_Minh python3 scripts/integration-sprint4.py
python3 scripts/regression-sprint5.py
python3 scripts/retest-sprint6.py
python3 scripts/uat-pilot.py
python3 scripts/retest-sprint7.py
```

Trên Windows dùng `py -X utf8 scripts/<tên>.py`. Script tự tạo tài khoản và nhóm riêng, không đụng dữ liệu UAT/demo.
