# CHƯƠNG: KIỂM THỬ VÀ TRIỂN KHAI (BẢN NHÁP 1)

**Người viết:** M5 – Khiếu Hoàng Nam Anh (MSSV 31241022203), PM QA & Deployment, WP5
**Bản nháp:** 14/11/2026, số liệu đến `master` @ `d2eab98` | **Nộp cho M0 ghép báo cáo bản 1:** hạn 18/11/2026, 21:00
**Nguồn số liệu:** `docs/qa/` (test case, test report, integration log, defect log, evidence), `docs/deploy/staging.md`, `.github/workflows/`

> Các chỗ `<TODO: …>` là số liệu **chưa có**: kết quả UAT (M2 đóng UAT ngày 17/11), lần retest cuối trên staging, release tag và URL/video demo (18/11). Bản nháp này không tự điền các số liệu đó.

> **Lưu ý CR-02:** Kế hoạch ban đầu thu thập dữ liệu từ Trello qua API/Webhook. Theo Change Request **CR-02**, nhóm đã thay bằng **Task Board nội bộ**. Vì vậy mọi ca kiểm thử từ Sprint 4 trở đi kiểm tra luồng *board nội bộ → sự kiện hoạt động → điểm đóng góp*, không còn kiểm thử tích hợp Trello. Mã tích hợp Trello cũ đã được gỡ (DEF-25, đóng 11/11).

---

## 1. Chiến lược và kế hoạch kiểm thử

### 1.1 Mục tiêu

Kiểm thử nhằm chứng minh hệ thống đạt các mục tiêu chất lượng trong Project Charter, đặc biệt:
- **Ẩn danh trong chấm chéo:** điểm chỉ hiện khi có từ 3 người chấm khác nhau.
- **Chống gian lận và phân quyền:** không giả được trạng thái hoàn thành; người ngoài nhóm không xem hay sửa được dữ liệu nhóm.
- **Đúng luồng ghi nhận đóng góp:** board → sự kiện → `ScoringEngine` → dashboard và PDF.
- **G4 (hiệu năng):** xuất PDF dưới 10 giây cho nhóm 6 người, dữ liệu 4 sprint.
- **G5 (hài lòng):** UAT với ít nhất 10 sinh viên ngoài nhóm (M2 chủ trì, M5 ghi lỗi).

### 1.2 Các mức kiểm thử

| Mức | Phạm vi | Công cụ | Ai viết | Khi nào chạy |
|---|---|---|---|---|
| Unit backend | Service, controller, thuật toán (`ScoringEngine`, `AnonymityAggregator`) | JUnit 5, Mockito, AssertJ | Chủ module + M5 | Mỗi push/PR (CI) |
| Repository / API backend | Truy vấn thật trên MariaDB, hợp đồng API auth | Testcontainers (MariaDB 10.11), MockMvc | M5 | Mỗi push/PR (CI có Docker) |
| Unit frontend | Component, store, hàm gọi API | Vitest, Testing Library | Chủ module + M5 | Mỗi push/PR (CI) |
| Tích hợp | Gọi API thật qua Nginx trên staging, đối chiếu dữ liệu bằng SQL | `scripts/integration-sprint4.py` | M5 | Sau mỗi đợt merge lớn |
| Hồi quy | Luồng điểm đóng góp, dashboard, phân quyền board, gỡ Trello, PDF | `scripts/regression-sprint5.py` (30 ca) | M5 | Trước Sprint Review, trước release |
| Smoke | Container healthy, Flyway, Nginx proxy, đăng ký/đăng nhập | `scripts/staging-smoke.sh` (11 kiểm tra) | M5 | Mỗi lần dựng staging |
| Hiệu năng | Thời gian xuất PDF | Đo phía client qua Nginx và log server | M5 | Sprint 5 |
| Chấp nhận (UAT) | Kịch bản người dùng thật | Kịch bản `docs/M2-UAT-Scenarios.md`, phiếu phản hồi | M2 (chủ trì), M5 | Sprint 6 (14–17/11) |

### 1.3 Môi trường

| Môi trường | Thành phần | Dùng cho |
|---|---|---|
| Local / CI | Java 21, Maven 3.9, Node 20/22, MariaDB qua Testcontainers | Unit test, build |
| Staging | Docker Compose `fairshare-staging`: Nginx → Spring Boot (profile `prod`) → MariaDB 10.11 | Tích hợp, hồi quy, hiệu năng, UAT, demo |

### 1.4 Tiêu chí đạt

- Unit test: 0 fail trên `master`. CI xanh trước khi merge.
- Mọi lỗi **High** phải đóng, hoặc có quyết định chấp nhận rủi ro ghi trong Change Log, trước release.
- Mỗi defect chỉ được đóng khi có: PR sửa, ca kiểm thử chạy lại đạt, và ngày đóng.
- UAT đạt khi có ≥ 10 phiếu và không còn lỗi chặn luồng.

`<TODO: dẫn link Test Plan bản đầy đủ (Sprint 2) nếu nhóm lưu ngoài repo>`

---

## 2. Tự động hóa và CI/CD

| Workflow | Kích hoạt | Nội dung |
|---|---|---|
| `backend-ci.yml` | Push mọi nhánh, PR | `mvn -B verify`: unit + Testcontainers. Tải lên báo cáo Surefire, in bảng tóm tắt pass/fail |
| `frontend-ci.yml` | Push mọi nhánh, PR | `npm ci` → ESLint → Vitest (xuất JUnit XML) → `tsc` + `vite build` |
| `docker-ci.yml` | PR vào `master`, push `master`, chạy tay | Build 3 image, `compose up`, chờ DB healthy, kiểm tra Flyway, backend và Nginx |

Kèm theo là các script chạy tay trên Windows (`scripts/ci-*.ps1`) và script tóm tắt kết quả (`summarize-backend.py`, `summarize-frontend.py`). Nhờ đó các thành viên chạy được cùng bộ kiểm tra trên máy mình trước khi mở PR.

**Tác dụng với rủi ro R11 (tích hợp muộn, lỗi phát hiện trễ):** CI chạy trên mọi nhánh, nên lỗi build hoặc test của một module lộ ra ngay khi push, trước khi merge. Ví dụ ngày 14/11: unit test phát hiện 4 lỗi do một commit mới (DEF-27) ngay trong ngày commit.

---

## 3. Kết quả kiểm thử

### 3.1 Diễn biến unit test

| Ngày | Mã nguồn | Backend | Frontend | Ghi chú |
|---|---|---|---|---|
| 02/11 (Sprint 3) | `master` @ `3b1086f` | 26 test: 19 pass, 7 pending | 17/17 pass | Auth backend chưa hiện thực |
| 10/11 (Sprint 5) | `master` @ `0ed8f05` | 124 test: 0 lỗi, 7 skip | 65/65 pass (15 file) | 7 skip: nhóm `AuthContract` còn `@Disabled` (DEF-01) |
| **14/11 (Sprint 6)** | `master` @ `d2eab98` | **178 test: 165 pass, 4 lỗi, 9 skip** | **74/74 pass (17 file)** | 4 lỗi mới (DEF-27). 9 skip là test Testcontainers, vì máy chạy không có Docker |

Số test backend tăng từ 26 lên 178 sau ba sprint. Phần lớn là test phân quyền, chấm chéo và đóng góp mà các chủ module bổ sung sau mỗi lần sửa lỗi.

Minh chứng: `docs/qa/evidence/backend-unit-2026-11-14.txt`, `frontend-unit-2026-11-14.txt` và các file cùng loại ngày 10/11.

### 3.2 Test case Sprint 3 (auth, user, frontend)

36 test case: 11 auth API, 5 repository user, 15 frontend, 5 khác. Chi tiết trong `docs/qa/test-cases-sprint3.md`, kết quả trong `docs/qa/test-report-sprint3.md`.

### 3.3 Kiểm thử tích hợp (Sprint 4–5)

| Lần chạy | Mã nguồn | Kết quả | Thay đổi chính |
|---|---|---|---|
| 09/11 | `c32a069` | 11/22 pass | Lần đầu. Phát hiện DEF-08..18 (lộ điểm khi < 3 người chấm, đếm lượt thay vì đếm người, người ngoài nhóm chấm được…) |
| 10/11 | `0ed8f05` | **18/23 pass** | Sau khi M4 sửa (PR #57): luồng chấm chéo 11/12, **đạt yêu cầu ẩn danh** |
| 11/11 | `8b51f18` | 21/23 pass | Đóng DEF-11 (giả mạo hoàn thành card), DEF-24 (phân quyền board) |

### 3.4 Kiểm thử hồi quy Sprint 5 (30 ca)

| Nhóm ca | 10/11 trên `master` | 11/11 trên `master` |
|---|---|---|
| Board → sự kiện → `ScoringEngine` | **8/8** | 8/8 |
| Dashboard | 2/5 (DEF-22) | `<TODO: tách số từ regression-result>` |
| Phân quyền board | 2/6 (DEF-24) | **6/6** |
| Gỡ Trello legacy (CR-02) | 0/3 (DEF-25) | 2/3 (TRL-03 lỗi do DEF-20) |
| PDF | 1/8 (DEF-20) | `<TODO>` |
| **Tổng** | **13/30** | **20/30** (25/30 khi vá tạm DEF-20) |

`<TODO: lần chạy hồi quy cuối trước release 18/11 – cần môi trường Docker>`

### 3.5 Hiệu năng xuất PDF (mục tiêu G4 < 10 giây)

Đo trên dữ liệu mẫu M3 (6 thành viên, 100 sự kiện mỗi sprint), mỗi sprint 1 lần lạnh và 10 lần liên tiếp:

| Sprint | p50 (s) | p95 (s) | Chậm nhất (s) | So với G4 |
|---|---|---|---|---|
| 1 | 0,059 | 0,078 | 0,078 | Đạt |
| 2 | 0,043 | 0,059 | 0,059 | Đạt |
| 3 | 0,024 | 0,044 | 0,044 | Đạt |
| 4 | 0,033 | 0,040 | 0,040 | Đạt |

Phía server (51 lần): trung vị 27 ms, chậm nhất 204 ms. Lần đo lại ngày 11/11: chậm nhất 0,109 s. Như vậy **G4 đạt**, nhanh hơn mục tiêu hơn 90 lần.
Lưu ý: các số đo này lấy trên bản vá DEF-20. `master` đã có bản sửa (14/11), cần đo lại chính thức: `<TODO: số đo trên master trước release>`.

### 3.6 Kiểm thử chấp nhận người dùng (UAT)

`<TODO (M2 cung cấp 17/11): số phiếu, mức hài lòng G5, số lỗi UAT theo mức độ, lỗi nào đã đóng>`

---

## 4. Quản lý lỗi (Defect Log)

### 4.1 Quy trình

`Open` → `In Progress` → `Fixed` (dev đã sửa) → `Closed` (M5 chạy lại ca kiểm thử đạt). Mỗi lỗi có mức độ (High/Medium/Low), người xử lý theo lát cắt dọc, bằng chứng và đề xuất sửa. M5 cập nhật `docs/qa/defect-log.md` sau mỗi lần chạy tích hợp hoặc hồi quy.

### 4.2 Số liệu (14/11/2026)

| Mức độ | Open | In Progress | Fixed – chờ retest | Closed | Tổng |
|---|---|---|---|---|---|
| High | 0 | 1 | 3 | 6 | 10 |
| Medium | 1 | 1 | 3 | 4 | 9 |
| Low | 2 | 0 | 3 | 4 | 9 |
| **Tổng** | **3** | **2** | **9** | **14** | **28** |

Theo nguồn phát hiện: Sprint 3 (DEF-01..07), tích hợp Sprint 4 (DEF-08..19), hồi quy Sprint 5 (DEF-20..26), rà soát Sprint 6 (DEF-27..28).

### 4.3 Các lỗi đáng chú ý

| Lỗi | Vì sao quan trọng | Xử lý |
|---|---|---|
| DEF-08, 09 | Lộ điểm chấm chéo khi dưới 3 người chấm; đếm số lượt thay vì số người, nên một người chấm 3 lần cũng vượt ngưỡng. Vi phạm cam kết ẩn danh cốt lõi | M4 sửa `AnonymityAggregator` (PR #57). Đóng 10/11 |
| DEF-11 | Client tự gửi tên cột "Done", giả được việc hoàn thành card (rủi ro R05 – gian lận) | M1 dùng tên cột thật. Đóng 11/11 |
| DEF-20 | Xuất PDF luôn lỗi 500 (transaction chỉ đọc gọi routine có ghi). Unit test dùng mock nên không phát hiện, chỉ test tích hợp mới bắt được | M0 sửa. Chờ retest |
| DEF-27 | Commit mới làm hỏng 4 unit test, CI backend đỏ ngay trước release | Đã giao M0, hạn trước 18/11 |

### 4.4 Bài học từ quản lý lỗi

- Test dùng mock cho kết quả "xanh" nhưng không phản ánh lỗi thật với CSDL (DEF-20). Vì vậy nhóm cần thêm tầng tích hợp gọi API thật.
- Ghi "Closed" khi chưa chạy lại test dẫn tới đóng sai (DEF-07 từng bị ghi Closed khi còn 1/5 test giả). Quy tắc mới: chỉ M5 đóng lỗi, và phải có ca kiểm thử chạy lại.

---

## 5. Triển khai

### 5.1 Đóng gói bằng Docker

| Thành phần | Dockerfile | Ghi chú |
|---|---|---|
| Backend | Build nhiều tầng: `maven:3.9-eclipse-temurin-21-alpine` build jar → `eclipse-temurin:21-jre-alpine` | Image chỉ chứa JRE 21 và jar |
| Frontend | Build nhiều tầng: `node:20-alpine` build Vite → `nginx:alpine` | Nginx phục vụ file tĩnh và chuyển tiếp `/api` sang backend |
| CSDL | MariaDB 10.11 | Schema do Flyway quản lý (20 migration, V1–V20) |

`docker-compose.yml` dựng 3 service trên mạng `fairshare-network`. Bản staging (`docker-compose.staging.yml`) bổ sung: bắt buộc `JWT_SECRET`, ẩn cổng DB, healthcheck, giới hạn dung lượng log.

### 5.2 Môi trường staging

Dựng bằng một lệnh `./scripts/staging-up.sh`: tự sinh mật khẩu, build, chạy, chờ healthy, rồi chạy smoke test 11 kiểm tra. Staging dùng cho tích hợp (09–11/11), Sprint Review 12/11 và UAT. Hướng dẫn: `docs/deploy/staging.md`, `docs/deploy/user-guide.md`.

**Tác dụng với rủi ro R13 (mất dữ liệu/môi trường):** dựng lại được bằng một lệnh; có lệnh sao lưu DB; mật khẩu không nằm trong Git; dữ liệu staging tách khỏi dữ liệu dev (project name riêng).

### 5.3 Phát hành (release)

| Hạng mục | Kết quả |
|---|---|
| Release tag | `<TODO: tag, commit, ngày – 18/11>` |
| URL demo | `<TODO>` |
| Tài khoản demo | `<TODO: chỉ ghi vai trò, không ghi mật khẩu>` |
| Video demo dự phòng | `<TODO: link>` |
| Smoke test trên bản release | `<TODO>` |

---

## 6. Hạn chế và hướng cải thiện

- **Môi trường staging phụ thuộc máy cá nhân của M5.** Nhóm chưa chốt máy chung hoặc VPS, nên khi máy M5 không có Docker thì không chạy lại được tích hợp (tình huống ngày 14/11). Đề xuất: chốt một máy chung, hoặc chạy `docker-ci.yml` kèm script tích hợp trên GitHub Actions.
- **Một số lỗi chỉ được xác nhận bằng đọc code** (9 lỗi "Fixed – chờ retest" ngày 14/11). Cần chạy lại trên staging trước khi đóng.
- **Chưa có test end-to-end giao diện** (ví dụ Playwright). Luồng UI hiện chỉ kiểm thử qua UAT thủ công.
- Kế hoạch kiểm thử ban đầu có tích hợp Trello. Sau CR-02, toàn bộ phần này được thay bằng kiểm thử board nội bộ.
