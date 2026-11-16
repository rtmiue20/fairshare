# Defect Log – FairShare

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (PM QA & Deployment) | **Thẻ Trello:** "[M5] Ghi defect: Phân loại lỗi, giao người xử lý"
**Cập nhật:** 16/11/2026 23:30 (GMT+7). Retest trên staging dựng từ `master` @ `f18a705` (reset sạch): smoke **PASS**, tích hợp **23/23**, hồi quy **30/30**, pilot UAT **20/24**, retest Sprint 6 **2/9** (script mới `scripts/retest-sprint6.py`), unit test backend **233/233** (Docker, 0 skip), frontend **86/86**.
**Nguồn:** báo cáo kiểm thử Sprint 3 (`docs/qa/test-report-sprint3.md`), Integration Log Sprint 4 (`docs/qa/integration-log-sprint4.md`, lần chạy 09/11 và 10/11), báo cáo kiểm thử Sprint 5 (`docs/qa/test-report-sprint5.md`), unit test BE/FE ngày 10/11.

## Quy ước

| Mức độ | Ý nghĩa | Hạn xử lý mục tiêu |
|---|---|---|
| **High** | Sai yêu cầu cốt lõi (ẩn danh, chống gian lận, phân quyền) hoặc chặn luồng chính | Trước Sprint Review gần nhất |
| **Medium** | Chức năng chạy nhưng sai, hoặc người dùng thấy lỗi | Trong sprint kế tiếp |
| **Low** | Ảnh hưởng nhỏ, có cách tránh | Khi còn thời gian |

**Trạng thái:** `Open` → `In Progress` → `Fixed` (dev đã sửa, có thể ghi "Fixed – chờ retest") → `Closed` (M5 kiểm thử lại đạt) · `Retest` = đã sửa trong code, chờ M5 bật lại test tự động.
**Người xử lý** theo lát cắt dọc: M0 Report · M1 Auth/User/Common/Board · M2 Team/Sprint · M3 Đóng góp/Dashboard · M4 Chấm chéo · M5 QA/Deployment.

## Tổng quan (16/11/2026, sau retest trên `master` @ `f18a705`)

| Mức độ | Open | In Progress | Fixed – chờ retest | Closed | Rejected | Tổng |
|---|---|---|---|---|---|---|
| High | 3 (DEF-31, 40, 41) | 0 | 0 | 12 | 0 | 15 |
| Medium | 1 (DEF-32) | 0 | 0 | 10 | 0 | 11 |
| Low | 4 (DEF-19, 28, 39, 42) | 0 | 0 | 11 | 1 (DEF-29) | 16 |
| **Tổng** | **8** | **0** | **0** | **33** | **1** | **42** |

**Thay đổi 16/11 (retest trên staging, `master` @ `f18a705`, 23:00–23:30 GMT+7)**
- **Khôi phục file này.** Các merge vào `master` ngày 15–16/11 (commit `7798e33`, `59ef7d7`, `34bde2f`) sửa trên một bản cũ của `defect-log.md`, làm mất phần cập nhật 15/11 của M5 (DEF-18, 20, 21 bị đưa về Open, bảng Tổng quan về số 26 lỗi). Bản này dựng lại từ bản 15/11 của M5 (`7f36c32`) và ghi thêm kết quả 16/11. **Quy ước:** dev ghi `Fixed – chờ retest`, chỉ M5 chuyển `Closed` sau khi chạy lại ca test.
- Dựng staging bằng `./scripts/staging-up.sh` (reset sạch, Flyway chạy đến V23), smoke **PASS**. Minh chứng: `evidence/staging-smoke-2026-11-16.txt`, `staging-up-2026-11-16.txt`.
- Tích hợp `integration-sprint4.py` **23/23**; hồi quy `regression-sprint5.py` **30/30** (PDF chậm nhất 0,064 s, G4 đạt). Minh chứng: `evidence/integration-2026-11-16.txt`, `regression-2026-11-16.txt`.
- Pilot UAT `uat-pilot.py` **20/24** (15/11: 14/24). 4 ca còn FAIL (UAT-SEC-03..06) đều thuộc DEF-31, 32. Minh chứng: `uat/uat-pilot-2026-11-16.txt`, `uat/uat-pilot-result.json`.
- Retest Sprint 6 `retest-sprint6.py` **2/9** (script mới cho các lỗi chưa có ca tự động). Minh chứng: `evidence/retest-2026-11-16.txt`, `retest-result-2026-11-16.json`.
- Unit test: backend `mvn test` trong Docker **233 test, 0 lỗi, 0 skip**; frontend Vitest **20 file, 86/86** (Node 20 như CI). Minh chứng: `evidence/backend-unit-docker-2026-11-16.txt`, `frontend-unit-2026-11-16.txt`.
- **Đóng 8 lỗi:** DEF-27 (unit test), DEF-33, 34, 35, 36, 37 (pilot UAT), DEF-38 (RT-38a, b). Giữ **Open**: DEF-19, 28, 31, 32, 39 (chưa có bản sửa trên `master`).
- **Lỗi mới:** **DEF-40 (High, M0)**: migration V23 chèn tài khoản demo có mật khẩu công khai và ghi đè dữ liệu nhóm id 1 ở mọi CSDL. **DEF-41 (High, M1 + M3)**: người phụ trách kéo thẻ của mình qua lại giữa các cột để tự nâng tỷ lệ đóng góp (50% → 91,67%). DEF-42 (Low, M1): đổi tiêu đề thẻ thì vượt qua được bản sửa DEF-38.
- **Script WP5:** `regression-sprint5.py` sửa TRL-02 (route `integration` nay dùng cho trang `MultidimensionalVectorPage`, không còn liên quan Trello, nên chỉ tìm tham chiếu `ConnectTrelloPage`/API Trello) và đọc `pdftotext` bằng UTF-8 trên Windows. `.gitignore` thêm `/uploads/` (một phần DEF-28).
- Sau khi chạy test, môi trường UAT đã reset và tạo lại bằng `uat-seed.py` (nhóm A nay là **id 2**, vì V23 chiếm id 1). Minh chứng: `uat/uat-seed-2026-11-16.txt`.

### Theo người xử lý (16/11, các lỗi chưa đóng)

| Người | Cần làm | Ưu tiên |
|---|---|---|
| M0 – Nguyễn Văn Minh Triều | **DEF-40 (High)**: gỡ dữ liệu demo khỏi migration (V23). DEF-28: `git rm --cached` 2 ảnh trong `uploads/`. DEF-39: bỏ số liệu/việc mẫu cứng | **DEF-40 trước khi gắn tag release và dựng bản demo 18/11** |
| M1 – Nguyễn Phúc Vương | **DEF-41 (High)** (cùng M3): `CARD_MOVED` không mang SP. DEF-42: so trùng REVIEW_CARD theo `cardId` | **DEF-41 trước release** |
| M2 – Hà Ngọc Thiện | *Không còn lỗi mở* (DEF-33, 35, 36, 37 đã đóng 16/11) | Chủ trì UAT |
| M3 – Ngô Trọng Phúc | **DEF-31 (High)**: lấy người dùng từ token, chặn tự duyệt, kiểm tra thành viên. DEF-32. DEF-41 (cùng M1): không cho `CARD_MOVED` điểm một phần | **DEF-31 ngay** |
| M4 – Triệu Nguyễn Huỳnh Khang | DEF-19 (vẫn 400) | Thấp |
| M5 – Khiếu Hoàng Nam Anh | Retest DEF-31, 32, 40, 41 khi có bản sửa (`retest-sprint6.py`, `uat-pilot.py`) | – |

**Thay đổi 15/11 (chiều): video demo, ảnh user guide**
- Quay video demo dự phòng (`scripts/record-demo.ps1`, 102 giây) và chụp 14 ảnh màn hình cho user guide (`scripts/capture-screens.ps1`). Khi quay, phát hiện **DEF-38 (High)**: kéo thẻ vào/ra cột Review nhiều lần tự cộng điểm cho người kéo. Phát hiện **DEF-39 (Low)**: giao diện hiện số liệu/việc mẫu cứng.
- Sau khi quay, môi trường UAT đã reset và tạo lại sạch bằng `scripts/uat-seed.py`.

**Thay đổi 15/11 (pilot UAT, `scripts/uat-pilot.py`):**
- M5 chạy thử 24 ca trước khi mời người thử thật: 5 kịch bản UAT-M2-01..05, các luồng chính trên dữ liệu mẫu, và phân quyền/chống gian lận ở các API người thử chạm tới. Kết quả **14/24 PASS**; 10 ca FAIL ứng với **7 lỗi mới DEF-31..37**, trong đó **2 lỗi High** (DEF-31 khai báo đóng góp giả danh/tự duyệt, DEF-33 người ngoài tự thêm mình làm Leader). Minh chứng: `docs/qa/uat/uat-pilot-result.json`, `uat-pilot-2026-11-15.txt`.
- **Khuyến nghị cho M2:** trong lúc DEF-31, 33, 38 chưa sửa, chưa cho người thử dùng *Khai báo đóng góp*, *Mời thành viên* và việc kéo thẻ qua lại cột Review, vì chúng làm sai dữ liệu đóng góp của đợt UAT.
- **Đóng DEF-18** (M5) và **DEF-01**: chạy `mvn test` trong container Maven trên máy có Docker → **195 test, 0 skip, 4 lỗi (đều là DEF-27)**; `AuthApiTest` và các test Testcontainers chạy thật và đạt. Minh chứng: `docs/qa/evidence/backend-unit-docker-2026-11-15.txt`. **Rút DEF-29** (ghi nhầm, xem dòng DEF-29).
- Môi trường UAT đã reset sạch sau pilot và tạo lại bằng `scripts/uat-seed.py`: 12 tài khoản `uat01..uat12@fairshare.test`, nhóm A có dữ liệu mẫu (`docs/qa/uat/uat-accounts.md`).

### Theo người xử lý (15/11, các lỗi chưa đóng)

| Người | Cần làm | Ưu tiên |
|---|---|---|
| M0 – Nguyễn Văn Minh Triều | **DEF-27** (CI backend đỏ), **DEF-28** (`uploads/` trong repo), DEF-39 (số liệu mẫu cứng trên giao diện) | DEF-27 trước release 18/11 |
| M1 – Nguyễn Phúc Vương | **DEF-38 (High)** (cùng M3): chặn cộng điểm `REVIEW_CARD` lặp. **DEF-34**: kiểm tra thành viên ở `GET /api/boards/team/{teamId}` | **DEF-38 trước release** |
| M2 – Hà Ngọc Thiện | **DEF-33 (High)**: chỉ Leader được mời, không nhận `role` từ client. DEF-35, 36, 37 | **DEF-33 ngay**, trước khi mở UAT diện rộng |
| M3 – Ngô Trọng Phúc | **DEF-31 (High)**: lấy người dùng từ token, chặn tự duyệt, kiểm tra thành viên. DEF-32. DEF-38 (cùng M1) | **DEF-31 ngay** |
| M4 – Triệu Nguyễn Huỳnh Khang | DEF-19 | Thấp |
| M5 – Khiếu Hoàng Nam Anh | Retest DEF-27, 31..37 khi có bản sửa | – |

**Thay đổi 15/11 (retest trên staging):**
- Dựng staging bằng `./scripts/staging-up.sh` trên máy Windows (Docker Desktop 29.9.3), smoke test **10/10 PASS**. Minh chứng: `docs/qa/evidence/staging-smoke-2026-11-15.txt`.
- Tích hợp `integration-sprint4.py`: **23/23 PASS** (lần đầu đạt trọn; 11/11 là 21/23). Minh chứng: `docs/qa/integration-result-sprint4.json`, `evidence/integration-2026-11-15.txt`.
- Hồi quy `regression-sprint5.py`: **30/30** (26 ca tự động PASS; PDF-02..05 kiểm bằng trích text từ 2 file PDF thật vì máy Windows không có `pdftotext`/`pypdf`, đều đạt). Minh chứng: `docs/qa/regression-result-sprint5.json`, `evidence/regression-2026-11-15.txt`, `evidence/report-team1-sprint4-2026-11-15.pdf`, `evidence/report-vietnamese-2026-11-15.pdf`.
- **G4:** xuất PDF chậm nhất **0,078 s** (11 lần × 4 sprint, 6 thành viên, 500 sự kiện), HTTP 200, file khoảng 70 KB.
- **Đóng 9 lỗi:** DEF-07, 12, 16, 17, 20, 21, 22, 23, 26.
- **Lỗi mới:** DEF-29 (Low, M3), DEF-30 (Low, M5, đã đóng: script staging trên Windows).
- **Cập nhật script test theo thay đổi sản phẩm:** (1) từ 11/11, tạo nhóm thì backend tự tạo "Sprint 1" và gắn sự kiện board vào sprint đó, nên script dùng lại sprint này thay vì tạo sprint mới (nếu không, IT-BRD-01..07 fail giả); (2) API báo cáo đã chặn người ngoài nhóm (403), nên script xuất PDF của nhóm seed bằng tài khoản Leader seed (nếu không, PDF-01/07/08 fail giả).

**Thay đổi 14/11 (rà soát mã nguồn, chưa chạy lại trên staging):**
- 24 commit mới vào `master` (PR #65–#75) đã sửa trong code phần lớn lỗi còn mở. Các lỗi này chuyển sang **Fixed – chờ retest**. M5 chỉ chuyển sang `Closed` khi chạy lại `integration-sprint4.py` và `regression-sprint5.py` trên staging đạt.
- **Lỗi mới DEF-27 (Medium):** `mvn test` trên `master` hiện **lỗi 4/178 test** (`ManualContributionServiceTest`), CI backend sẽ đỏ. Lỗi xuất hiện từ commit `a2be40b` (14/11 22:52).
- **Lỗi mới DEF-28 (Low):** file người dùng tải lên (`uploads/1794667251651_0ea1b4a0.jpg`) bị commit vào repo.
- Unit test 14/11: backend **178 test, 165 pass, 4 lỗi, 9 skip** (Testcontainers skip vì máy không có Docker); frontend **17 file, 74/74 pass**. Minh chứng: `docs/qa/evidence/backend-unit-2026-11-14.txt`, `frontend-unit-2026-11-14.txt`.

### Theo người xử lý (14/11, các lỗi chưa đóng)

| Người | Cần làm | Ưu tiên |
|---|---|---|
| M0 – Nguyễn Văn Minh Triều | **DEF-27**: sửa `ManualContributionServiceTest` (thiếu mock `UserRepository`) để CI xanh lại. **DEF-28**: xóa `uploads/` khỏi repo, thêm vào `.gitignore`. DEF-20, 21, 26: chờ M5 retest | **DEF-27 trước khi gắn tag release 18/11** |
| M1 – Nguyễn Phúc Vương | DEF-07, DEF-23: chờ M5 retest | – |
| M3 – Ngô Trọng Phúc | ~~DEF-22: `contribution.api.ts` gọi endpoint không có~~ (15/11: nhận định sai, đã rút). DEF-16, 17: chờ M5 retest | **In Progress** (14/11: hết gán cứng teamId, còn gọi endpoint không tồn tại) |
| M4 – Triệu Nguyễn Huỳnh Khang | **DEF-19** vẫn trả 400 (`PeerReviewService` dòng 200–202 dùng `BusinessException`). DEF-12: chờ M5 retest | DEF-19 |
| M5 – Khiếu Hoàng Nam Anh | **DEF-18** (`JWT_SECRET` trong `docker-compose.yml`, `.env.example`). Cài Docker để retest 9 lỗi Fixed – chờ retest. DEF-01 đã bỏ `@Disabled`, chỉ cần chạy `mvn test` trên máy có Docker | Retest trước 18/11 |

### Kết quả rà soát mã nguồn 14/11 (`master` @ `d2eab98`)

| Mã | Bằng chứng trong code | Trạng thái mới |
|---|---|---|
| DEF-01 | `AuthApiTest` không còn `@Disabled`, chạy theo điều kiện `@EnabledIf("isDockerAvailable")` | Fixed – chờ retest (cần Docker) |
| DEF-07 | `AuthTest` dùng `assertThat(...)` thật, không còn `assertTrue(true)` | Fixed – chờ retest |
| DEF-12 | `GET /review-rounds/{roundId}/results/{revieweeId}` truyền `requesterId` vào `getAggregatedResults` | Fixed – chờ retest IT-PR-11 |
| DEF-16, DEF-17 | Migration `V19__fix_evidence_traceability_and_scoring_routine.sql` sửa `sp_get_evidence_traceability` (dùng `ae.source` thật) và routine tính điểm | Fixed – chờ retest IT-BRD-07, SCR-05/08 |
| DEF-20 | `PdfReportService`: `@Transactional` (đã bỏ `readOnly = true`) | Fixed – chờ retest PDF-01..04, TRL-03 |
| DEF-21 | Nhúng `Arial.ttf`, `Arial-Bold.ttf` với `BaseFont.IDENTITY_H, EMBEDDED` | Fixed – chờ retest PDF-05 |
| DEF-22 | Đã bỏ gán cứng `teamId = 1` (có test Vitest DEF-22). ~~Còn gọi `/api/teams/{teamId}/contributions` không tồn tại~~ (15/11: nhận định sai, endpoint có ở `TeamController`) | In Progress → Closed 15/11 |
| DEF-23 | `GlobalExceptionHandler` có handler `NoResourceFoundException` | Fixed – chờ retest DASH-02/05 |
| DEF-26 | `PdfReportService` dòng 133: sprint không thuộc team → `ResourceNotFoundException` | Fixed – chờ retest PDF-08 |
| DEF-18 | `docker-compose.yml`, `.env.example` vẫn chưa có `JWT_SECRET` | In Progress (M5) |
| DEF-19 | Vẫn `BusinessException` → 400 | Open |

**Thay đổi 11/11:** gộp `master` (PR #62 của M1) vào nhánh QA, build lại và chạy lại toàn bộ. Đóng DEF-03, 11, 24, 25; DEF-12 sửa một phần (còn chấm chéo). Các lỗi còn lại của master không đổi: DEF-20 (PDF 500), 21, 22, 23, 26. Tích hợp 21/23, regression 20/30 trên `master`, 25/30 khi vá DEF-20.

**Thay đổi 10/11:** buổi sáng đóng 6 lỗi nhờ PR #57 của M4 (DEF-08, 09, 10, 13, 14, 15) và thêm DEF-19. Buổi tối chạy regression Sprint 5, thêm DEF-20..26; trong đó **DEF-20 (xuất PDF luôn lỗi 500) chặn DoD và buổi demo 12/11**.

### Theo người xử lý (các lỗi chưa đóng)

| Người | Lỗi đang mở | Ưu tiên |
|---|---|---|
| M0 – Nguyễn Văn Minh Triều | DEF-20 (High), DEF-21, DEF-26 (Medium) | **DEF-20 trước code freeze 11/11 17:00** |
| M1 – Nguyễn Phúc Vương | DEF-23 (Low), DEF-07 phần `AuthTest` (Low) | DEF-07 |
| M3 – Ngô Trọng Phúc | DEF-22 (High), DEF-17 (Medium), DEF-16 (Low) | DEF-22 |
| M4 – Triệu Nguyễn Huỳnh Khang | DEF-12 phần kết quả chấm chéo (High, IT-PR-11), DEF-19 (Low) | DEF-12 |
| M5 – Khiếu Hoàng Nam Anh | DEF-01 bật lại test (Retest), DEF-18 (Medium); chạy lại regression sau mỗi bản sửa | DEF-01 |

## Danh sách lỗi

### A. Chuyển từ Sprint 3 (DEF-01..07)

| Mã | Mức độ | Mô tả ngắn | Bằng chứng kiểm lại 10/11 | Người xử lý | Trạng thái |
|---|---|---|---|---|---|
| DEF-01 | High | Module auth backend chưa hiện thực, mọi request bị 401 | Auth chạy đúng trên staging (smoke test 11/11). Nhưng `AuthApiTest.AuthContract` **vẫn `@Disabled`** → 7 test skip trong `mvn test` | M5 bật lại test | **Closed** (15/11 – `mvn test` trong Docker có Testcontainers: `AuthApiTest` chạy, không skip, đạt; 195 test, 0 skip) |
| DEF-02 | High | `AuthResponse` thiếu `user`, chưa bọc `ApiResponse` | Staging trả `{success, data:{accessToken, user}}` | M1 | **Closed** (09/11) |
| DEF-03 | Medium | Đăng nhập sai → 401 → interceptor reload cứng `/login`, mất thông báo lỗi | 11/11: `client.ts` đã bỏ qua chuyển hướng khi 401 đến từ `/auth/login`, `/auth/register` (PR master, commit 20e895e). Kiểm tra bằng đọc code; chưa có test Vitest | M1 (Frontend) | **Closed** (11/11) |
| DEF-04 | Low | Nhãn form không gắn `htmlFor`/`id` | Đã có `htmlFor` ở Login/Register | M1 (Frontend) | **Closed** (09/11) |
| DEF-05 | Low | `authStore` chỉ lưu token, F5 mất `user` | `authStore.ts` lưu và đọc lại `fairshare_user` | M1 (Frontend) | **Closed** (09/11) |
| DEF-06 | Low | DTO auth thiếu `@Email`/`@NotBlank` | Đăng ký sai định dạng → HTTP 400 kèm lỗi từng trường | M1 | **Closed** (09/11) |
| DEF-07 | Low | Test giả `assertTrue(true)` làm số test pass ảo | 11/11: `TrelloClientTest` đã xóa (commit 97e7885). Còn **1/5**: `AuthTest.testAuth` vẫn là `assertTrue(true)`. Master ghi Closed nhưng chưa đúng | M1 (`AuthTest`), M5 (xóa `TrelloClientTest` theo CR-02) | **Closed** (15/11 – AuthTest chạy thật, pass (unit 14/11)) |

### B. Phát hiện trong Sprint 4

| Mã | Mức độ | Mô tả | Bằng chứng | Đề xuất / cách đã sửa | Người xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| DEF-08 | High | Lộ điểm chấm chéo khi dưới 3 lượt | 09/11 IT-PR-04 Fail (avg = 4.0 với 1 lượt) → 10/11 **Pass** (avg = 0, không nhận xét) | `AnonymityAggregator` trả avg = 0 khi chưa đủ ngưỡng (PR #57) | M4 | **Closed** (10/11) |
| DEF-09 | High | Đếm số lượt thay vì số người chấm | 09/11 IT-PR-08 Fail → 10/11 **Pass** (lần 2, 3 bị từ chối 400; safe = false) | Đếm `DISTINCT reviewer`, chặn chấm trùng tiêu chí (PR #57) | M4 | **Closed** (10/11) |
| DEF-10 | High | Người ngoài nhóm chấm được thành viên | 09/11 IT-PR-07 Fail (đã lưu DB) → 10/11 **Pass** (400, 0 dòng) | Kiểm tra cả 2 người thuộc team, đợt ở trạng thái OPEN (PR #57) | M4 | **Closed** (10/11) |
| DEF-11 | **High** | **Giả mạo hoàn thành card (rủi ro R05).** `moveCard` dùng `toColumnName` do client gửi | 11/11 IT-BRD-09 **Pass**: `moveCard` dùng tên cột thật, bỏ qua `toColumnName` do client gửi (commit fc4bd60) | Bỏ `fromColumnName`/`toColumnName` khỏi `MoveCardRequest`, luôn dùng tên cột thật | M1 | **Closed** (11/11) |
| DEF-12 | **High** | **Thiếu phân quyền theo nhóm.** Mọi tài khoản đăng nhập đọc được dữ liệu nhóm khác | 11/11: IT-BRD-10, IT-BRD-11 **Pass** (403 với người ngoài nhóm, commit 83a4b26), PDF-06 Pass. **IT-PR-11 vẫn Fail**: `/review-rounds/{id}/results/{uid}` trả 200 cho người ngoài nhóm. Phần PDF đã có kiểm tra thành viên Leader | Hàm chung `assertTeamMember(teamId, user)` → 403, áp dụng ở contribution, activity, peerreview (kể cả `GET /review-rounds/team/{id}`) | M1 (hàm chung) + M3, M4, M0 (PDF) | **Closed** (15/11 – IT-PR-11 PASS) |
| DEF-13 | Medium | API chấm chéo trả 500 dù đã lưu (trả entity JPA LAZY) | 09/11 IT-PR-01/02 Fail → 10/11 **Pass** | Trả `ReviewRoundDto`, số lượng đã lưu (PR #57) | M4 | **Closed** (10/11) |
| DEF-14 | Medium | Thiếu API mở/đóng đợt chấm chéo | 10/11 IT-PR-00 **Pass** | Thêm `POST /review-rounds/sprint/{id}`, `/open`, `/close`, trạng thái DRAFT/OPEN/CLOSED (PR #57, V17) | M4 | **Closed** (10/11) |
| DEF-15 | Low | Điểm ngoài thang 1–5 trả 500 | 09/11 IT-PR-06 Fail → 10/11 **Pass** (400) | `@Min(1) @Max(5)`, `@Valid` (PR #57) | M4 | **Closed** (10/11) |
| DEF-16 | Low | Truy vết bằng chứng ghi `source_type = 'TRELLO'` (trái CR-02) và `status = 'DONE'` cho mọi sự kiện | 10/11 IT-BRD-07 **vẫn Fail**; V18 không sửa routine `sp_get_evidence_traceability` (V12) | Migration mới dùng `ae.source`, `ae.event_type` thật | M3 | **Closed** (15/11 – IT-BRD-06/07 PASS, sourceType=BOARD) |
| DEF-17 | Medium | **Cần M3 xác nhận:** người chỉ *tạo* card vẫn được tính đóng góp, cao hơn người hoàn thành card trễ | 10/11 vẫn như cũ sau scoring v1.1 (PR #61): D chỉ tạo card 5 SP → 27.78%; C hoàn thành 2 SP trễ → 22.22% | Đối chiếu công thức CR-03; nếu không đúng ý đồ, chỉ tính SP từ `CARD_COMPLETED`. **Cập nhật 10/11 tối:** `ScoringEngine` v1.1 xử lý đúng (SCR-05: chỉ tạo card 15,30 < hoàn thành đúng hạn 31,42), nhưng routine `sp_calculate_contribution_scores` mà dashboard và PDF dùng vẫn sai (22,22% > 16,67%). Cần thống nhất một nguồn điểm | M3 (+ M2 kiểm tra công thức) | **Closed** (15/11 – SCR-01..08 PASS) |
| DEF-18 | Medium | `docker-compose.yml` không truyền `JWT_SECRET` → backend dùng secret mặc định đã commit | Staging đã bắt buộc `JWT_SECRET` (PR #56). `docker-compose.yml`, `.env.example` gốc vẫn chưa có | Thêm `JWT_SECRET` vào compose gốc và `.env.example`; bỏ giá trị mặc định ở profile `prod` | M5 | **Closed** (15/11 – `docker-compose.yml` bắt buộc `JWT_SECRET`, thiếu thì báo lỗi rõ; `.env.example` có hướng dẫn sinh khóa) |
| DEF-19 | Low | **Mới 10/11:** thành viên thường tạo đợt chấm bị chặn nhưng trả **400** thay vì **403** | IT-PR-00: B tạo đợt → HTTP 400 "Only a team leader can manage review rounds" · 16/11 RT-19: B tạo đợt → vẫn **HTTP 400** "Only a team leader can manage review rounds" (`PeerReviewService` dòng 363–365 vẫn `BusinessException`) | Ném `AccessDeniedException` (403) thay cho `BusinessException` khi sai quyền | M4 | **Open** |
| DEF-20 | **High** | **Xuất PDF luôn trả HTTP 500 trên `master`.** `PdfReportService.generateSprintReportPdf` có `@Transactional(readOnly = true)` nhưng gọi `sp_calculate_contribution_scores` (routine có ghi) → MariaDB báo "Cannot execute statement in a READ ONLY transaction", transaction bị đánh dấu rollback-only. `PdfReportServiceTest` dùng mock nên không phát hiện | 11/11 trên `master` (8b51f18) **vẫn 500**: PDF-01..05, TRL-03 Fail. `PdfReportService` có thêm kiểm tra Leader nhưng vẫn `@Transactional(readOnly = true)`. Bản vá 1 dòng (bỏ `readOnly`) → 200, chậm nhất 0,109 s, TRL-03 và PDF-01..04 Pass | Bỏ `readOnly = true` (hoặc tách phần tính điểm ra transaction ghi riêng). Thêm test tích hợp Testcontainers gọi endpoint PDF thật | M0 | **Closed** (15/11 – PDF-01..04, TRL-03 PASS) |
| DEF-21 | Medium | **PDF mất dấu tiếng Việt.** Dùng font chuẩn Helvetica (không có Unicode), các tiêu đề phải viết không dấu | 11/11 PDF-05 (bản vá): "Trần Thị Bích" → "Trn Th Bích", vẫn mất dấu | Nhúng font TTF Unicode (vd. Noto Sans, DejaVu Sans) vào `resources/fonts`, dùng `BaseFont.createFont(..., BaseFont.IDENTITY_H, BaseFont.EMBEDDED)`; viết lại tiêu đề có dấu | M0 | **Closed** (15/11 – PDF-05 PASS (6/6 tên có dấu)) |
| DEF-22 | **High** | **Dashboard hiển thị sai nhóm.** `ContributionDashboard.tsx` gán cứng `teamId = 1` (dòng 404–406, 447) và `contribution.api.ts` gọi 2 endpoint backend không có: `/api/teams/{teamId}/contributions`, `/api/teams/{teamId}/contributions/{userId}/evidence` | 11/11 DASH-01 (4 lời gọi gán cứng), DASH-02, DASH-05 → 500: **vẫn Fail** | Lấy `teamId` từ nhóm đang chọn; đổi sang `/api/contributions/teams/{teamId}` hoặc `/api/contributions/sprints/{sprintId}` và `/api/contributions/evidence` (đã có). Thêm test Vitest cho teamId | M3 | **Closed** (15/11 – DASH-01..05 PASS (phần còn lại tách thành DEF-29)) |
| DEF-23 | Low | Đường dẫn API không tồn tại trả **500** thay vì **404** | 11/11 DASH-02, DASH-05 vẫn trả 500: **vẫn Fail** | Thêm handler `NoResourceFoundException` → 404 trong `GlobalExceptionHandler` | M1 | **Closed** (15/11 – DASH-02/05 PASS) |
| DEF-24 | **High** | **Chưa có phân quyền leader/thành viên trên board** (DoD Sprint 5). `board` không kiểm tra vai trò hay người được giao | 11/11 PERM-01..06 **Pass** (6/6): thành viên không tạo cột, đổi tên board, kéo card của người khác; người ngoài nhóm bị 403 (commit 3dd1460) | Leader: tạo/sửa/xóa board và cột. Thành viên: chỉ sửa/kéo card được giao. Người ngoài: 403. Thêm test phân quyền | M1 | **Closed** (11/11) |
| DEF-25 | Medium | **Chưa gỡ Trello legacy** (DoD Sprint 5, CR-02) | 11/11 TRL-01, TRL-02 **Pass**: đã gỡ `integration/trello`, `TrelloClientTest`, `ConnectTrelloPage.tsx`, `integration.api.ts` và route/menu (commits 97e7885, 542ab72). Còn enum `ActivitySource.TRELLO` cho dữ liệu cũ; TRL-03 vẫn Fail do DEF-20 | Gỡ trong PR riêng; giữ enum `ActivitySource.TRELLO` cho dữ liệu cũ. M5 chạy regression trước khi merge | M1 | **Closed** (11/11) |
| DEF-26 | Medium | PDF xuất được khi `sprintId` không thuộc `teamId` → trộn dữ liệu sprint nhóm khác vào báo cáo của nhóm | 11/11 PDF-08 (bản vá) vẫn 200 khi sprint không thuộc nhóm: **vẫn Fail**. PDF-07 (sprint không tồn tại) đã đạt | Kiểm tra `sprint.team.id == teamId`, nếu sai trả 404 | M0 | **Closed** (15/11 – PDF-08 → 404 PASS) |
| DEF-27 | Medium | **Mới 14/11:** `mvn test` lỗi 4/178 test trong `ManualContributionServiceTest` (NullPointerException: `userRepository` null tại `ManualContributionService.toResponse` dòng 34). Service thêm phụ thuộc `UserRepository` nhưng test chưa mock → CI backend đỏ | 14/11 23:25, `master` @ `d2eab98`: 4 lỗi (`createContribution…`, `getPendingContributions…`, `reviewContribution…Approve…`, `…Reject…`). Xuất hiện từ commit `a2be40b` · 16/11: `ManualContributionServiceTest` đã mock `UserRepository` (commit `7798e33`). `mvn test` trong Docker: **233 test, 0 lỗi, 0 skip** | Thêm `@Mock UserRepository userRepository` vào test (hoặc inject qua constructor). Chạy `cd fairshare-backend && mvn test -Dtest=ManualContributionServiceTest` | M0 (tác giả `a2be40b`) | **Closed** (16/11 – `mvn test` 233/233) |
| DEF-28 | Low | **Mới 14/11:** ảnh người dùng tải lên bị commit vào repo (`uploads/1794667251651_0ea1b4a0.jpg`, 473 KB) | Commit `a2be40b` · 16/11: **thêm 1 ảnh nữa** `uploads/1794837902938_7342bbe4.jpg` (commit `b2a1dc2`). `.gitignore` chỉ chặn `fairshare-backend/uploads/*` trong khi ảnh nằm ở `uploads/` gốc. M5 đã thêm `/uploads/` vào `.gitignore`; 2 file vẫn đang được Git theo dõi | Xóa khỏi Git, thêm `uploads/` vào `.gitignore`; thư mục upload nên là volume Docker | M0 | **Open** |
| DEF-29 | Low | **Mới 15/11:** `contributionApi.getContributions` gọi `GET /api/teams/{teamId}/contributions`, backend không có endpoint này. Dashboard dùng `Promise.allSettled` nên không vỡ trang, nhưng mỗi lần mở dashboard đều có 1 lời gọi 404 và state `summary` luôn `null` | `frontend/src/api/contribution.api.ts` dòng 5–8; `ContributionDashboard.tsx` dòng 187 | Bỏ lời gọi này, hoặc trỏ sang `/api/contributions/summary` | M3 | **Rejected** (15/11 – không phải lỗi: endpoint có ở `TeamController` dòng 213 từ commit `13e639a` ngày 11/11; M5 tìm sót khi rà soát) |
| DEF-30 | Low | **Mới 15/11:** script staging của WP5 không chạy trên Windows: (1) gọi cứng `python3` → mật khẩu `.env.staging` để trống; (2) file CRLF làm `grep "^VAR=$"` không khớp; (3) healthcheck `wget http://localhost/` trong container Alpine phân giải ra IPv6 `::1` → frontend `unhealthy`; (4) `regression-sprint5.py` gọi `grep`/`pdftotext` | Dựng staging trên Windows 15/11 | `staging-up.sh`, `staging-smoke.sh` tự dò `python3`/`python`/`py` (dùng `openssl` khi không có), bỏ `\r`; healthcheck dùng `127.0.0.1`; regression tìm bằng Python, dùng `pypdf` khi không có `pdftotext` | M5 | **Closed** (15/11 – smoke PASS trên Windows) |
| DEF-31 | **High** | **Mới 15/11 (pilot UAT):** API khai báo đóng góp thủ công **không xác thực người gọi**: `userId`/`reviewerId` lấy từ tham số URL, controller không đọc token. (a) Thành viên khai báo đứng tên người khác; (b) **tự duyệt** khai báo của mình bằng cách gửi `reviewerId` của người khác, vượt qua quy tắc "không tự duyệt"; (c) người ngoài nhóm duyệt được khai báo của nhóm. Vi phạm yêu cầu chống gian lận (R05) | UAT-SEC-04: HTTP 201, khai báo ghi cho user khác. UAT-SEC-05: HTTP 200, `APPROVED`. UAT-SEC-06: HTTP 200 · 16/11: `ManualContributionController` không đổi trên `master`. UAT-SEC-04, 05, 06 **vẫn FAIL** (HTTP 201/200) | `ManualContributionController`: lấy `userId`/`reviewerId` từ `Authentication`, `assertTeamMember(teamId)`, chặn người duyệt = người tạo theo ID trong token | M3 | **Open** |
| DEF-32 | Medium | **Mới 15/11:** người ngoài nhóm xem được danh sách khai báo đóng góp (tên việc, SP, link minh chứng) của nhóm khác | UAT-SEC-03: `GET /api/contributions/manual?teamId=` → HTTP 200 · 16/11: UAT-SEC-03 **vẫn FAIL** (HTTP 200) | `assertTeamMember` cho `GET /api/contributions/manual`, `/pending`, `/{id}` | M3 | **Open** |
| DEF-33 | **High** | **Mới 15/11:** `POST /api/teams/{teamId}/members` **không kiểm tra người gọi** và nhận trường `role`: **người ngoài nhóm tự thêm mình vào nhóm bất kỳ với vai trò LEADER**; thành viên thường cũng mời được người khác (kịch bản UAT-M2-02 quy định chỉ Leader mời) | UAT-SEC-08: HTTP 200, người ngoài thành LEADER. UAT-M2-02c: thành viên mời → HTTP 200 · 16/11 (PR #81, commit `384e5b0`): UAT-SEC-08 **PASS** (403, không thành LEADER), UAT-M2-02c **PASS** (thành viên thường không mời được) | `TeamController.inviteMember`: nhận `Authentication`, chỉ Leader của nhóm được mời; bỏ hoặc chặn `role=LEADER` từ client | M2 | **Closed** (16/11 – UAT-SEC-08, UAT-M2-02c PASS) |
| DEF-34 | Medium | **Mới 15/11:** `GET /api/boards/team/{teamId}` không kiểm tra thành viên → người ngoài nhóm xem toàn bộ board (tên việc, người phụ trách, hạn) của nhóm khác | UAT-SEC-02: HTTP 200 · 16/11 (commit `59ef7d7`): UAT-SEC-02 **PASS** (HTTP 403) | `assertTeamMember` trong `BoardController.getBoardsByTeam` | M1 | **Closed** (16/11 – UAT-SEC-02 PASS) |
| DEF-35 | Low | **Mới 15/11:** `GET /api/teams/{teamId}/sprints` không kiểm tra thành viên (lộ tên, ngày sprint của nhóm khác) | UAT-SEC-01: HTTP 200 · 16/11 (PR #81): UAT-SEC-01 **PASS** (HTTP 403) | `assertTeamMember` như `GET /{teamId}/contributions` | M2 | **Closed** (16/11 – UAT-SEC-01 PASS) |
| DEF-36 | Low | **Mới 15/11:** tạo sprint có ngày kết thúc **trước** ngày bắt đầu vẫn thành công | UAT-M2-05b: HTTP 201 · 16/11 (PR #81): UAT-M2-05b **PASS** (HTTP 400) | Validate `endDate >= startDate` (400) | M2 | **Closed** (16/11 – UAT-M2-05b PASS) |
| DEF-37 | Low | **Mới 15/11:** mã mời sinh ra 12 ký tự (`FS` + 10 ký tự), trong khi giao diện ghi "Mã mời gồm 6–8 ký tự" và kịch bản UAT-M2-01 quy định 6 ký tự | UAT-M2-01: `inviteCode='FS7E4793EFBB'` · 16/11 (PR #81): UAT-M2-01 **PASS** (mã mời 8 ký tự, khớp nhãn 6–8) | Thống nhất: rút mã còn 6–8 ký tự hoặc sửa chữ trên giao diện và kịch bản | M2 | **Closed** (16/11 – UAT-M2-01 PASS) |
| DEF-38 | **High** | **Mới 15/11 (khi quay video demo):** mỗi lần kéo thẻ **vào cột Review**, hệ thống ghi sự kiện `REVIEW_CARD` cộng điểm cho **người kéo**, kể cả khi thẻ là của người khác, và **không giới hạn số lần**. Kéo thẻ vào Review rồi trả về nhiều lần sẽ tự nâng tỷ lệ đóng góp của mình. Đây là lỗ hổng gian lận (R05), cùng loại với DEF-11 | Staging 15/11: Leader `uat01` nhận **5 sự kiện `REVIEW_CARD`, +25 SP** sau 5 lần kéo thẻ "Màn hình Dashboard" (người phụ trách: `uat05`) vào Review và trả về; tỷ lệ của uat01 tăng **34% → 41%**. Có trong video `docs/qa/evidence/demo/` (bảng bằng chứng) · 16/11 (commit `59ef7d7`): RT-38a **PASS** (C kéo thẻ của B vào Review 6 lần → 1 `REVIEW_CARD`), RT-38b **PASS** (tỷ lệ của C không đổi). RT-38c FAIL: đổi tiêu đề thẻ thì sinh thêm `REVIEW_CARD` → ghi riêng DEF-42 | Mỗi (thẻ, người review) chỉ tính 1 lần; người review phải khác người phụ trách; hủy điểm khi thẻ rời Review mà chưa Done; thêm test chống lặp | M1 (sinh sự kiện), M3 (công thức) | **Closed** (16/11 – RT-38a, RT-38b PASS) |
| DEF-39 | Low | **Mới 15/11:** giao diện hiện **số liệu/công việc mẫu cứng**, không phải dữ liệu nhóm: (a) Dashboard luôn ghi "1.248 hoạt động chia cho 4 người" (`DashboardHeroCanvas.tsx` dòng 336, 542); (b) Task Calendar trang nhóm hiện việc mẫu ("Submit Final Screens", "Prototype Testing", tuần tháng 2) khi thẻ chưa có ngày khớp tuần đang xem (`TaskCalendar.tsx` dòng 205–215). Người dùng UAT và giảng viên có thể hiểu nhầm | Ảnh `docs/qa/evidence/user-guide/03-danh-sach-nhom.png`, `07-...`; nhóm A có 5 người, 21 sự kiện · 16/11: vẫn còn trong code: `DashboardHeroCanvas.tsx` dòng 336, 542 ("1.248 hoạt động chia cho 4 người"), `TaskCalendar.tsx` dòng 208–213 | Lấy số từ API (tổng sự kiện, số thành viên); bỏ dữ liệu mẫu, hiện trạng thái trống | M0 | **Open** |
| DEF-40 | **High** | **Mới 16/11:** migration `V23__seed_demo_peer_review_data.sql` (commit `db59b72`) **chèn dữ liệu demo vào mọi CSDL** qua Flyway, kể cả staging/production: (a) 5 tài khoản `demo@fairshare.io`, `*@edu.vn` (id 109–113) với **mật khẩu ghi công khai trong comment của file migration**, đăng nhập được; (b) `INSERT … ON DUPLICATE KEY UPDATE` lên `teams.id = 1`, `team_members.id = 1..5`, `sprints.id = 1..3`, `boards`, `cards`: **ghi đè tên nhóm, vai trò, người phụ trách** của dữ liệu thật đang có; (c) `DELETE FROM review_submissions WHERE review_round_id IN (2, 3)` **xóa phiếu chấm chéo thật** | 16/11 trên staging cũ (trước reset): nhóm UAT A (id 1) bị đổi tên thành "EduConnect — …", `team_members` 1..5 bị cập nhật vai trò. Sau reset: RT-40a FAIL (5 tài khoản demo), RT-40b FAIL (đăng nhập demo HTTP 200), RT-40c FAIL (5 thành viên demo trong team 1). Seed M3 nạp sau đó cũng bị lẫn: team 1 có 11 thành viên thay vì 6 | Không sửa V23 đã chạy (Flyway báo lỗi checksum). Tạo migration mới xóa dữ liệu demo id 109–113 và các dòng phụ thuộc; chuyển dữ liệu demo sang `src/main/resources/seed/` (nạp tay) hoặc `db/seed-dev` chỉ bật ở profile `dev`. Không ghi mật khẩu vào repo | M0 (tác giả `db59b72`), M4 xác nhận phần chấm chéo | **Open** |
| DEF-41 | **High** | **Mới 16/11:** **người phụ trách tự nâng tỷ lệ đóng góp bằng cách kéo thẻ của mình qua lại** giữa To Do và In Progress. Mỗi lần kéo, `BoardService.moveCard` (nhánh 4) ghi `CARD_MOVED` mang **toàn bộ story points** của thẻ, và công thức tính điểm (V19, DEF-17) cho `CARD_MOVED` 20% điểm một phần. Không giới hạn số lần. Cùng loại gian lận R05 với DEF-11, DEF-38 | RT-41a: thẻ 5 SP, 10 vòng → 21 `CARD_MOVED`, tổng SP 5 → **105**. RT-41b: tỷ lệ đóng góp của D **50% → 91,67%** dù thẻ chưa hoàn thành | `CARD_MOVED` ghi `storyPoints = 0` (chỉ là nhật ký), hoặc mỗi (thẻ, người) chỉ được điểm một phần 1 lần; thêm test chống lặp như DEF-38 | M1 (sinh sự kiện), M3 (công thức) | **Open** |
| DEF-42 | Low | **Mới 16/11:** bản sửa DEF-38 so trùng `REVIEW_CARD` bằng chuỗi `reviewed card '<tiêu đề>'` trong `details`. Đổi tiêu đề thẻ rồi kéo lại vào Review sẽ sinh thêm `REVIEW_CARD` | RT-38c: đổi tiêu đề (HTTP 200) → 2 `REVIEW_CARD` của C cho cùng thẻ. Hiện `REVIEW_CARD` chưa làm tăng tỷ lệ đóng góp (RT-38b: 0%), nên ảnh hưởng thấp | So trùng theo `cardId` (thêm cột `card_id` vào `activity_events` hoặc lưu id trong `details`) | M1 | **Open** |

## Ghi chú cho Sprint Review 12/11

- **Đã đạt:** cam kết cốt lõi về ẩn danh (≥ 3 người chấm khác nhau) và luồng board → `ActivityEvent` → `ScoringEngine` (8/8) đã được kiểm thử đạt ngày 10/11.
- **Chặn demo:** DEF-20 (PDF lỗi 500), phải sửa trước code freeze 11/11 17:00. Hiệu năng sau khi vá đã đo lại 11/11: chậm nhất 0,109 s, đạt G4 (< 10 s).
- **DoD Sprint 5 chưa đạt:** DEF-22 (dashboard). DEF-24 (phân quyền board) và DEF-25 (gỡ Trello) đã đạt ngày 11/11. Nếu DEF-22 không kịp, M0 ghi vào Change Log hoặc chuyển sang Sprint 6.
- **Rủi ro đã giảm:** DEF-11 (gian lận cột Done, R05) đã đóng. DEF-12 còn phần kết quả chấm chéo.
- Mỗi defect khi đóng phải có: PR sửa, ca IT/REG chạy lại đạt, ngày đóng. M5 cập nhật file này sau mỗi lần chạy `scripts/integration-sprint4.py` và `scripts/regression-sprint5.py`.
