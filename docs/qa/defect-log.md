# Defect Log – FairShare

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (PM QA & Deployment) | **Thẻ Trello:** "[M5] Ghi defect: Phân loại lỗi, giao người xử lý"
**Cập nhật:** 14/11/2026 23:40 (GMT+7). Rà soát mã nguồn và chạy lại unit test trên `master` @ `d2eab98`. **Chưa chạy lại integration và regression** vì máy kiểm thử hiện chưa có Docker. Lần chạy đầy đủ gần nhất: 11/11 trên `master` @ `8b51f18`.
**Nguồn:** báo cáo kiểm thử Sprint 3 (`docs/qa/test-report-sprint3.md`), Integration Log Sprint 4 (`docs/qa/integration-log-sprint4.md`, lần chạy 09/11 và 10/11), báo cáo kiểm thử Sprint 5 (`docs/qa/test-report-sprint5.md`), unit test BE/FE ngày 10/11.

## Quy ước

| Mức độ | Ý nghĩa | Hạn xử lý mục tiêu |
|---|---|---|
| **High** | Sai yêu cầu cốt lõi (ẩn danh, chống gian lận, phân quyền) hoặc chặn luồng chính | Trước Sprint Review gần nhất |
| **Medium** | Chức năng chạy nhưng sai, hoặc người dùng thấy lỗi | Trong sprint kế tiếp |
| **Low** | Ảnh hưởng nhỏ, có cách tránh | Khi còn thời gian |

**Trạng thái:** `Open` → `In Progress` → `Fixed` (dev đã sửa, có thể ghi "Fixed – chờ retest") → `Closed` (M5 kiểm thử lại đạt) · `Retest` = đã sửa trong code, chờ M5 bật lại test tự động.
**Người xử lý** theo lát cắt dọc: M0 Report · M1 Auth/User/Common/Board · M2 Team/Sprint · M3 Đóng góp/Dashboard · M4 Chấm chéo · M5 QA/Deployment.

## Tổng quan (14/11/2026)

| Mức độ | Open | In Progress | Fixed – chờ retest | Closed | Tổng |
|---|---|---|---|---|---|
| High | 0 | 1 (DEF-22) | 3 (DEF-01, 12, 20) | 6 | 10 |
| Medium | 1 (DEF-27) | 1 (DEF-18) | 3 (DEF-17, 21, 26) | 4 | 9 |
| Low | 2 (DEF-19, 28) | 0 | 3 (DEF-07, 16, 23) | 4 | 9 |
| **Tổng** | **3** | **2** | **9** | **14** | **28** |

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
| M3 – Ngô Trọng Phúc | **DEF-22**: `contribution.api.ts` vẫn gọi `/api/teams/{teamId}/contributions` (backend không có), dùng trong `ContributionDashboard.tsx` dòng 187. DEF-16, 17: chờ M5 retest | **In Progress** (14/11: hết gán cứng teamId, còn gọi endpoint không tồn tại) |
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
| DEF-22 | Đã bỏ gán cứng `teamId = 1` (có test Vitest DEF-22). **Còn** gọi `/api/teams/{teamId}/contributions` không tồn tại | In Progress |
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
| DEF-01 | High | Module auth backend chưa hiện thực, mọi request bị 401 | Auth chạy đúng trên staging (smoke test 11/11). Nhưng `AuthApiTest.AuthContract` **vẫn `@Disabled`** → 7 test skip trong `mvn test` | M5 bật lại test | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-02 | High | `AuthResponse` thiếu `user`, chưa bọc `ApiResponse` | Staging trả `{success, data:{accessToken, user}}` | M1 | **Closed** (09/11) |
| DEF-03 | Medium | Đăng nhập sai → 401 → interceptor reload cứng `/login`, mất thông báo lỗi | 11/11: `client.ts` đã bỏ qua chuyển hướng khi 401 đến từ `/auth/login`, `/auth/register` (PR master, commit 20e895e). Kiểm tra bằng đọc code; chưa có test Vitest | M1 (Frontend) | **Closed** (11/11) |
| DEF-04 | Low | Nhãn form không gắn `htmlFor`/`id` | Đã có `htmlFor` ở Login/Register | M1 (Frontend) | **Closed** (09/11) |
| DEF-05 | Low | `authStore` chỉ lưu token, F5 mất `user` | `authStore.ts` lưu và đọc lại `fairshare_user` | M1 (Frontend) | **Closed** (09/11) |
| DEF-06 | Low | DTO auth thiếu `@Email`/`@NotBlank` | Đăng ký sai định dạng → HTTP 400 kèm lỗi từng trường | M1 | **Closed** (09/11) |
| DEF-07 | Low | Test giả `assertTrue(true)` làm số test pass ảo | 11/11: `TrelloClientTest` đã xóa (commit 97e7885). Còn **1/5**: `AuthTest.testAuth` vẫn là `assertTrue(true)`. Master ghi Closed nhưng chưa đúng | M1 (`AuthTest`), M5 (xóa `TrelloClientTest` theo CR-02) | **Fixed – chờ retest** (14/11, rà soát code) |

### B. Phát hiện trong Sprint 4

| Mã | Mức độ | Mô tả | Bằng chứng | Đề xuất / cách đã sửa | Người xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| DEF-08 | High | Lộ điểm chấm chéo khi dưới 3 lượt | 09/11 IT-PR-04 Fail (avg = 4.0 với 1 lượt) → 10/11 **Pass** (avg = 0, không nhận xét) | `AnonymityAggregator` trả avg = 0 khi chưa đủ ngưỡng (PR #57) | M4 | **Closed** (10/11) |
| DEF-09 | High | Đếm số lượt thay vì số người chấm | 09/11 IT-PR-08 Fail → 10/11 **Pass** (lần 2, 3 bị từ chối 400; safe = false) | Đếm `DISTINCT reviewer`, chặn chấm trùng tiêu chí (PR #57) | M4 | **Closed** (10/11) |
| DEF-10 | High | Người ngoài nhóm chấm được thành viên | 09/11 IT-PR-07 Fail (đã lưu DB) → 10/11 **Pass** (400, 0 dòng) | Kiểm tra cả 2 người thuộc team, đợt ở trạng thái OPEN (PR #57) | M4 | **Closed** (10/11) |
| DEF-11 | **High** | **Giả mạo hoàn thành card (rủi ro R05).** `moveCard` dùng `toColumnName` do client gửi | 11/11 IT-BRD-09 **Pass**: `moveCard` dùng tên cột thật, bỏ qua `toColumnName` do client gửi (commit fc4bd60) | Bỏ `fromColumnName`/`toColumnName` khỏi `MoveCardRequest`, luôn dùng tên cột thật | M1 | **Closed** (11/11) |
| DEF-12 | **High** | **Thiếu phân quyền theo nhóm.** Mọi tài khoản đăng nhập đọc được dữ liệu nhóm khác | 11/11: IT-BRD-10, IT-BRD-11 **Pass** (403 với người ngoài nhóm, commit 83a4b26), PDF-06 Pass. **IT-PR-11 vẫn Fail**: `/review-rounds/{id}/results/{uid}` trả 200 cho người ngoài nhóm. Phần PDF đã có kiểm tra thành viên Leader | Hàm chung `assertTeamMember(teamId, user)` → 403, áp dụng ở contribution, activity, peerreview (kể cả `GET /review-rounds/team/{id}`) | M1 (hàm chung) + M3, M4, M0 (PDF) | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-13 | Medium | API chấm chéo trả 500 dù đã lưu (trả entity JPA LAZY) | 09/11 IT-PR-01/02 Fail → 10/11 **Pass** | Trả `ReviewRoundDto`, số lượng đã lưu (PR #57) | M4 | **Closed** (10/11) |
| DEF-14 | Medium | Thiếu API mở/đóng đợt chấm chéo | 10/11 IT-PR-00 **Pass** | Thêm `POST /review-rounds/sprint/{id}`, `/open`, `/close`, trạng thái DRAFT/OPEN/CLOSED (PR #57, V17) | M4 | **Closed** (10/11) |
| DEF-15 | Low | Điểm ngoài thang 1–5 trả 500 | 09/11 IT-PR-06 Fail → 10/11 **Pass** (400) | `@Min(1) @Max(5)`, `@Valid` (PR #57) | M4 | **Closed** (10/11) |
| DEF-16 | Low | Truy vết bằng chứng ghi `source_type = 'TRELLO'` (trái CR-02) và `status = 'DONE'` cho mọi sự kiện | 10/11 IT-BRD-07 **vẫn Fail**; V18 không sửa routine `sp_get_evidence_traceability` (V12) | Migration mới dùng `ae.source`, `ae.event_type` thật | M3 | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-17 | Medium | **Cần M3 xác nhận:** người chỉ *tạo* card vẫn được tính đóng góp, cao hơn người hoàn thành card trễ | 10/11 vẫn như cũ sau scoring v1.1 (PR #61): D chỉ tạo card 5 SP → 27.78%; C hoàn thành 2 SP trễ → 22.22% | Đối chiếu công thức CR-03; nếu không đúng ý đồ, chỉ tính SP từ `CARD_COMPLETED`. **Cập nhật 10/11 tối:** `ScoringEngine` v1.1 xử lý đúng (SCR-05: chỉ tạo card 15,30 < hoàn thành đúng hạn 31,42), nhưng routine `sp_calculate_contribution_scores` mà dashboard và PDF dùng vẫn sai (22,22% > 16,67%). Cần thống nhất một nguồn điểm | M3 (+ M2 kiểm tra công thức) | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-18 | Medium | `docker-compose.yml` không truyền `JWT_SECRET` → backend dùng secret mặc định đã commit | Staging đã bắt buộc `JWT_SECRET` (PR #56). `docker-compose.yml`, `.env.example` gốc vẫn chưa có | Thêm `JWT_SECRET` vào compose gốc và `.env.example`; bỏ giá trị mặc định ở profile `prod` | M5 | **In Progress** |
| DEF-19 | Low | **Mới 10/11:** thành viên thường tạo đợt chấm bị chặn nhưng trả **400** thay vì **403** | IT-PR-00: B tạo đợt → HTTP 400 "Only a team leader can manage review rounds" | Ném `AccessDeniedException` (403) thay cho `BusinessException` khi sai quyền | M4 | **Open** |
| DEF-20 | **High** | **Xuất PDF luôn trả HTTP 500 trên `master`.** `PdfReportService.generateSprintReportPdf` có `@Transactional(readOnly = true)` nhưng gọi `sp_calculate_contribution_scores` (routine có ghi) → MariaDB báo "Cannot execute statement in a READ ONLY transaction", transaction bị đánh dấu rollback-only. `PdfReportServiceTest` dùng mock nên không phát hiện | 11/11 trên `master` (8b51f18) **vẫn 500**: PDF-01..05, TRL-03 Fail. `PdfReportService` có thêm kiểm tra Leader nhưng vẫn `@Transactional(readOnly = true)`. Bản vá 1 dòng (bỏ `readOnly`) → 200, chậm nhất 0,109 s, TRL-03 và PDF-01..04 Pass | Bỏ `readOnly = true` (hoặc tách phần tính điểm ra transaction ghi riêng). Thêm test tích hợp Testcontainers gọi endpoint PDF thật | M0 | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-21 | Medium | **PDF mất dấu tiếng Việt.** Dùng font chuẩn Helvetica (không có Unicode), các tiêu đề phải viết không dấu | 11/11 PDF-05 (bản vá): "Trần Thị Bích" → "Trn Th Bích", vẫn mất dấu | Nhúng font TTF Unicode (vd. Noto Sans, DejaVu Sans) vào `resources/fonts`, dùng `BaseFont.createFont(..., BaseFont.IDENTITY_H, BaseFont.EMBEDDED)`; viết lại tiêu đề có dấu | M0 | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-22 | **High** | **Dashboard hiển thị sai nhóm.** `ContributionDashboard.tsx` gán cứng `teamId = 1` (dòng 404–406, 447) và `contribution.api.ts` gọi 2 endpoint backend không có: `/api/teams/{teamId}/contributions`, `/api/teams/{teamId}/contributions/{userId}/evidence` | 11/11 DASH-01 (4 lời gọi gán cứng), DASH-02, DASH-05 → 500: **vẫn Fail** | Lấy `teamId` từ nhóm đang chọn; đổi sang `/api/contributions/teams/{teamId}` hoặc `/api/contributions/sprints/{sprintId}` và `/api/contributions/evidence` (đã có). Thêm test Vitest cho teamId | M3 | **In Progress** (14/11: hết gán cứng `teamId`, còn gọi endpoint không tồn tại) |
| DEF-23 | Low | Đường dẫn API không tồn tại trả **500** thay vì **404** | 11/11 DASH-02, DASH-05 vẫn trả 500: **vẫn Fail** | Thêm handler `NoResourceFoundException` → 404 trong `GlobalExceptionHandler` | M1 | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-24 | **High** | **Chưa có phân quyền leader/thành viên trên board** (DoD Sprint 5). `board` không kiểm tra vai trò hay người được giao | 11/11 PERM-01..06 **Pass** (6/6): thành viên không tạo cột, đổi tên board, kéo card của người khác; người ngoài nhóm bị 403 (commit 3dd1460) | Leader: tạo/sửa/xóa board và cột. Thành viên: chỉ sửa/kéo card được giao. Người ngoài: 403. Thêm test phân quyền | M1 | **Closed** (11/11) |
| DEF-25 | Medium | **Chưa gỡ Trello legacy** (DoD Sprint 5, CR-02) | 11/11 TRL-01, TRL-02 **Pass**: đã gỡ `integration/trello`, `TrelloClientTest`, `ConnectTrelloPage.tsx`, `integration.api.ts` và route/menu (commits 97e7885, 542ab72). Còn enum `ActivitySource.TRELLO` cho dữ liệu cũ; TRL-03 vẫn Fail do DEF-20 | Gỡ trong PR riêng; giữ enum `ActivitySource.TRELLO` cho dữ liệu cũ. M5 chạy regression trước khi merge | M1 | **Closed** (11/11) |
| DEF-26 | Medium | PDF xuất được khi `sprintId` không thuộc `teamId` → trộn dữ liệu sprint nhóm khác vào báo cáo của nhóm | 11/11 PDF-08 (bản vá) vẫn 200 khi sprint không thuộc nhóm: **vẫn Fail**. PDF-07 (sprint không tồn tại) đã đạt | Kiểm tra `sprint.team.id == teamId`, nếu sai trả 404 | M0 | **Fixed – chờ retest** (14/11, rà soát code) |
| DEF-27 | Medium | **Mới 14/11:** `mvn test` lỗi 4/178 test trong `ManualContributionServiceTest` (NullPointerException: `userRepository` null tại `ManualContributionService.toResponse` dòng 34). Service thêm phụ thuộc `UserRepository` nhưng test chưa mock → CI backend đỏ | 14/11 23:25, `master` @ `d2eab98`: 4 lỗi (`createContribution…`, `getPendingContributions…`, `reviewContribution…Approve…`, `…Reject…`). Xuất hiện từ commit `a2be40b` | Thêm `@Mock UserRepository userRepository` vào test (hoặc inject qua constructor). Chạy `cd fairshare-backend && mvn test -Dtest=ManualContributionServiceTest` | M0 (tác giả `a2be40b`) | **Open** |
| DEF-28 | Low | **Mới 14/11:** ảnh người dùng tải lên bị commit vào repo (`uploads/1794667251651_0ea1b4a0.jpg`, 473 KB) | Commit `a2be40b` | Xóa khỏi Git, thêm `uploads/` vào `.gitignore`; thư mục upload nên là volume Docker | M0 | **Open** |

## Ghi chú cho Sprint Review 12/11

- **Đã đạt:** cam kết cốt lõi về ẩn danh (≥ 3 người chấm khác nhau) và luồng board → `ActivityEvent` → `ScoringEngine` (8/8) đã được kiểm thử đạt ngày 10/11.
- **Chặn demo:** DEF-20 (PDF lỗi 500), phải sửa trước code freeze 11/11 17:00. Hiệu năng sau khi vá đã đo lại 11/11: chậm nhất 0,109 s, đạt G4 (< 10 s).
- **DoD Sprint 5 chưa đạt:** DEF-22 (dashboard). DEF-24 (phân quyền board) và DEF-25 (gỡ Trello) đã đạt ngày 11/11. Nếu DEF-22 không kịp, M0 ghi vào Change Log hoặc chuyển sang Sprint 6.
- **Rủi ro đã giảm:** DEF-11 (gian lận cột Done, R05) đã đóng. DEF-12 còn phần kết quả chấm chéo.
- Mỗi defect khi đóng phải có: PR sửa, ca IT/REG chạy lại đạt, ngày đóng. M5 cập nhật file này sau mỗi lần chạy `scripts/integration-sprint4.py` và `scripts/regression-sprint5.py`.
