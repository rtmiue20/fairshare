# Defect Log – FairShare

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (PM QA & Deployment) | **Thẻ Trello:** "[M5] Ghi defect: Phân loại lỗi, giao người xử lý"
**Cập nhật:** 10/11/2026 20:15 (GMT+7), kiểm thử lại trên `master` @ `0ed8f05` (integration + regression Sprint 5)
**Nguồn:** báo cáo kiểm thử Sprint 3 (`docs/qa/test-report-sprint3.md`), Integration Log Sprint 4 (`docs/qa/integration-log-sprint4.md`, lần chạy 09/11 và 10/11), báo cáo kiểm thử Sprint 5 (`docs/qa/test-report-sprint5.md`), unit test BE/FE ngày 10/11.

## Quy ước

| Mức độ | Ý nghĩa | Hạn xử lý mục tiêu |
|---|---|---|
| **High** | Sai yêu cầu cốt lõi (ẩn danh, chống gian lận, phân quyền) hoặc chặn luồng chính | Trước Sprint Review gần nhất |
| **Medium** | Chức năng chạy nhưng sai, hoặc người dùng thấy lỗi | Trong sprint kế tiếp |
| **Low** | Ảnh hưởng nhỏ, có cách tránh | Khi còn thời gian |

**Trạng thái:** `Open` → `In Progress` → `Fixed` (dev đã sửa) → `Closed` (M5 kiểm thử lại đạt) · `Retest` = đã sửa trong code, chờ M5 bật lại test tự động.
**Người xử lý** theo lát cắt dọc: M0 Report · M1 Auth/User/Common/Board · M2 Team/Sprint · M3 Đóng góp/Dashboard · M4 Chấm chéo · M5 QA/Deployment.

## Tổng quan (10/11/2026)

| Mức độ | Open | In Progress / Retest | Closed | Tổng |
|---|---|---|---|---|
| High | 5 (DEF-11, 12, 20, 22, 24) | 1 (DEF-01) | 4 | 10 |
| Medium | 5 (DEF-03, 17, 21, 25, 26) | 1 (DEF-18) | 2 | 8 |
| Low | 4 (DEF-07, 16, 19, 23) | 0 | 4 | 8 |
| **Tổng** | **14** | **2** | **10** | **26** |

**Thay đổi 10/11:** buổi sáng đóng 6 lỗi nhờ PR #57 của M4 (DEF-08, 09, 10, 13, 14, 15) và thêm DEF-19. Buổi tối chạy regression Sprint 5, thêm DEF-20..26; trong đó **DEF-20 (xuất PDF luôn lỗi 500) chặn DoD và buổi demo 12/11**.

### Theo người xử lý (các lỗi chưa đóng)

| Người | Lỗi đang mở | Ưu tiên |
|---|---|---|
| M0 – Nguyễn Văn Minh Triều | DEF-20 (High), DEF-21, DEF-26 (Medium), DEF-12 phần PDF, DEF-07 phần `AuthTest` (Low, cùng M1) | **DEF-20 trước code freeze 11/11 17:00** |
| M1 – Nguyễn Phúc Vương | DEF-11, DEF-24 (High), DEF-12 phần hàm chung (High), DEF-25, DEF-03 (Medium), DEF-23 (Low) | DEF-24, DEF-11 |
| M3 – Ngô Trọng Phúc | DEF-22 (High), DEF-12 áp dụng cho contribution/activity (High), DEF-17 (Medium), DEF-16 (Low) | DEF-22 |
| M4 – Triệu Nguyễn Huỳnh Khang | DEF-12 áp dụng cho kết quả chấm chéo (High), DEF-19 (Low) | DEF-12 |
| M5 – Khiếu Hoàng Nam Anh | DEF-01 bật lại test (Retest), DEF-07 xóa `TrelloClientTest` (cùng DEF-25), DEF-18 (Medium); chạy lại regression sau mỗi bản sửa | DEF-01 |

## Danh sách lỗi

### A. Chuyển từ Sprint 3 (DEF-01..07)

| Mã | Mức độ | Mô tả ngắn | Bằng chứng kiểm lại 10/11 | Người xử lý | Trạng thái |
|---|---|---|---|---|---|
| DEF-01 | High | Module auth backend chưa hiện thực, mọi request bị 401 | Auth chạy đúng trên staging (smoke test 11/11). Nhưng `AuthApiTest.AuthContract` **vẫn `@Disabled`** → 7 test skip trong `mvn test` | M5 bật lại test | **Retest** |
| DEF-02 | High | `AuthResponse` thiếu `user`, chưa bọc `ApiResponse` | Staging trả `{success, data:{accessToken, user}}` | M1 | **Closed** (09/11) |
| DEF-03 | Medium | Đăng nhập sai → 401 → interceptor reload cứng `/login`, mất thông báo lỗi | `frontend/src/api/client.ts` vẫn redirect mọi 401, kể cả `/auth/login` | M1 (Frontend) | **Open** |
| DEF-04 | Low | Nhãn form không gắn `htmlFor`/`id` | Đã có `htmlFor` ở Login/Register | M1 (Frontend) | **Closed** (09/11) |
| DEF-05 | Low | `authStore` chỉ lưu token, F5 mất `user` | `authStore.ts` lưu và đọc lại `fairshare_user` | M1 (Frontend) | **Closed** (09/11) |
| DEF-06 | Low | DTO auth thiếu `@Email`/`@NotBlank` | Đăng ký sai định dạng → HTTP 400 kèm lỗi từng trường | M1 | **Closed** (09/11) |
| DEF-07 | Low | Test giả `assertTrue(true)` làm số test pass ảo | Còn **2/5**: `AuthTest`, `TrelloClientTest`. `PdfReportServiceTest` đã có test thật (sửa trong Sprint 4) | M1 (`AuthTest`), M5 (xóa `TrelloClientTest` theo CR-02) | **Open** |

### B. Phát hiện trong Sprint 4

| Mã | Mức độ | Mô tả | Bằng chứng | Đề xuất / cách đã sửa | Người xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| DEF-08 | High | Lộ điểm chấm chéo khi dưới 3 lượt | 09/11 IT-PR-04 Fail (avg = 4.0 với 1 lượt) → 10/11 **Pass** (avg = 0, không nhận xét) | `AnonymityAggregator` trả avg = 0 khi chưa đủ ngưỡng (PR #57) | M4 | **Closed** (10/11) |
| DEF-09 | High | Đếm số lượt thay vì số người chấm | 09/11 IT-PR-08 Fail → 10/11 **Pass** (lần 2, 3 bị từ chối 400; safe = false) | Đếm `DISTINCT reviewer`, chặn chấm trùng tiêu chí (PR #57) | M4 | **Closed** (10/11) |
| DEF-10 | High | Người ngoài nhóm chấm được thành viên | 09/11 IT-PR-07 Fail (đã lưu DB) → 10/11 **Pass** (400, 0 dòng) | Kiểm tra cả 2 người thuộc team, đợt ở trạng thái OPEN (PR #57) | M4 | **Closed** (10/11) |
| DEF-11 | **High** | **Giả mạo hoàn thành card (rủi ro R05).** `moveCard` dùng `toColumnName` do client gửi | 10/11 IT-BRD-09 **vẫn Fail**: `BoardService.java` dòng 450–451 còn ưu tiên `request.getToColumnName()` | Bỏ `fromColumnName`/`toColumnName` khỏi `MoveCardRequest`, luôn dùng tên cột thật | M1 | **Open** |
| DEF-12 | **High** | **Thiếu phân quyền theo nhóm.** Mọi tài khoản đăng nhập đọc được dữ liệu nhóm khác | 10/11 **vẫn Fail**: IT-BRD-10 (`/contributions/summary` → 200), IT-BRD-11 (`/activities/team/{id}` → 200, lộ 7 sự kiện), IT-PR-11 (`/review-rounds/{id}/results/{uid}` → 200) | Hàm chung `assertTeamMember(teamId, user)` → 403, áp dụng ở contribution, activity, peerreview (kể cả `GET /review-rounds/team/{id}`) | M1 (hàm chung) + M3, M4, M0 (PDF) | **Open** · 10/11 tối: thêm PDF-06 (người ngoài tải PDF nhóm khác → 200 trên bản vá PDF) |
| DEF-13 | Medium | API chấm chéo trả 500 dù đã lưu (trả entity JPA LAZY) | 09/11 IT-PR-01/02 Fail → 10/11 **Pass** | Trả `ReviewRoundDto`, số lượng đã lưu (PR #57) | M4 | **Closed** (10/11) |
| DEF-14 | Medium | Thiếu API mở/đóng đợt chấm chéo | 10/11 IT-PR-00 **Pass** | Thêm `POST /review-rounds/sprint/{id}`, `/open`, `/close`, trạng thái DRAFT/OPEN/CLOSED (PR #57, V17) | M4 | **Closed** (10/11) |
| DEF-15 | Low | Điểm ngoài thang 1–5 trả 500 | 09/11 IT-PR-06 Fail → 10/11 **Pass** (400) | `@Min(1) @Max(5)`, `@Valid` (PR #57) | M4 | **Closed** (10/11) |
| DEF-16 | Low | Truy vết bằng chứng ghi `source_type = 'TRELLO'` (trái CR-02) và `status = 'DONE'` cho mọi sự kiện | 10/11 IT-BRD-07 **vẫn Fail**; V18 không sửa routine `sp_get_evidence_traceability` (V12) | Migration mới dùng `ae.source`, `ae.event_type` thật | M3 | **Open** |
| DEF-17 | Medium | **Cần M3 xác nhận:** người chỉ *tạo* card vẫn được tính đóng góp, cao hơn người hoàn thành card trễ | 10/11 vẫn như cũ sau scoring v1.1 (PR #61): D chỉ tạo card 5 SP → 27.78%; C hoàn thành 2 SP trễ → 22.22% | Đối chiếu công thức CR-03; nếu không đúng ý đồ, chỉ tính SP từ `CARD_COMPLETED`. **Cập nhật 10/11 tối:** `ScoringEngine` v1.1 xử lý đúng (SCR-05: chỉ tạo card 15,30 < hoàn thành đúng hạn 31,42), nhưng routine `sp_calculate_contribution_scores` mà dashboard và PDF dùng vẫn sai (22,22% > 16,67%). Cần thống nhất một nguồn điểm | M3 (+ M2 kiểm tra công thức) | **Open** |
| DEF-18 | Medium | `docker-compose.yml` không truyền `JWT_SECRET` → backend dùng secret mặc định đã commit | Staging đã bắt buộc `JWT_SECRET` (PR #56). `docker-compose.yml`, `.env.example` gốc vẫn chưa có | Thêm `JWT_SECRET` vào compose gốc và `.env.example`; bỏ giá trị mặc định ở profile `prod` | M5 | **In Progress** |
| DEF-19 | Low | **Mới 10/11:** thành viên thường tạo đợt chấm bị chặn nhưng trả **400** thay vì **403** | IT-PR-00: B tạo đợt → HTTP 400 "Only a team leader can manage review rounds" | Ném `AccessDeniedException` (403) thay cho `BusinessException` khi sai quyền | M4 | **Open** |
| DEF-20 | **High** | **Xuất PDF luôn trả HTTP 500 trên `master`.** `PdfReportService.generateSprintReportPdf` có `@Transactional(readOnly = true)` nhưng gọi `sp_calculate_contribution_scores` (routine có ghi) → MariaDB báo "Cannot execute statement in a READ ONLY transaction", transaction bị đánh dấu rollback-only. `PdfReportServiceTest` dùng mock nên không phát hiện | Regression S5 PDF-01..05, TRL-03: 100% lần xuất trả 500. Bản vá thử chỉ đổi annotation → 200, chậm nhất 0,078 s | Bỏ `readOnly = true` (hoặc tách phần tính điểm ra transaction ghi riêng). Thêm test tích hợp Testcontainers gọi endpoint PDF thật | M0 | **Open** |
| DEF-21 | Medium | **PDF mất dấu tiếng Việt.** Dùng font chuẩn Helvetica (không có Unicode), các tiêu đề phải viết không dấu | PDF-05 (bản vá): "Trần Thị Bích" → "Trn Th Bích", "Phạm Đức Dũng" → "Phm c Dng". Mẫu: `docs/qa/evidence/pdf-sample-vietnamese-patched.pdf` | Nhúng font TTF Unicode (vd. Noto Sans, DejaVu Sans) vào `resources/fonts`, dùng `BaseFont.createFont(..., BaseFont.IDENTITY_H, BaseFont.EMBEDDED)`; viết lại tiêu đề có dấu | M0 | **Open** |
| DEF-22 | **High** | **Dashboard hiển thị sai nhóm.** `ContributionDashboard.tsx` gán cứng `teamId = 1` (dòng 404–406, 447) và `contribution.api.ts` gọi 2 endpoint backend không có: `/api/teams/{teamId}/contributions`, `/api/teams/{teamId}/contributions/{userId}/evidence` | DASH-01 (4 lời gọi gán cứng), DASH-02, DASH-05 → 500 "No static resource" | Lấy `teamId` từ nhóm đang chọn; đổi sang `/api/contributions/teams/{teamId}` hoặc `/api/contributions/sprints/{sprintId}` và `/api/contributions/evidence` (đã có). Thêm test Vitest cho teamId | M3 | **Open** |
| DEF-23 | Low | Đường dẫn API không tồn tại trả **500** thay vì **404** | DASH-02, DASH-05: `NoResourceFoundException` rơi vào handler chung | Thêm handler `NoResourceFoundException` → 404 trong `GlobalExceptionHandler` | M1 | **Open** |
| DEF-24 | **High** | **Chưa có phân quyền leader/thành viên trên board** (DoD Sprint 5). `board` không kiểm tra vai trò hay người được giao | PERM-01 thành viên tạo cột → 201; PERM-02 đổi tên board → 200; PERM-03 kéo card của người khác → 200; PERM-06 người ngoài nhóm kéo card → 200 | Leader: tạo/sửa/xóa board và cột. Thành viên: chỉ sửa/kéo card được giao. Người ngoài: 403. Thêm test phân quyền | M1 | **Open** |
| DEF-25 | Medium | **Chưa gỡ Trello legacy** (DoD Sprint 5, CR-02) | TRL-01: còn `integration/trello`, `TrelloClientTest`, `ConnectTrelloPage.tsx`, `integration.api.ts`. TRL-02: `router.tsx`, `Sidebar.tsx`, `AnimatedTopDock.tsx` còn route/menu | Gỡ trong PR riêng; giữ enum `ActivitySource.TRELLO` cho dữ liệu cũ. M5 chạy regression trước khi merge | M1 | **Open** |
| DEF-26 | Medium | PDF xuất được khi `sprintId` không thuộc `teamId` → trộn dữ liệu sprint nhóm khác vào báo cáo của nhóm | PDF-08 (bản vá): `GET /reports/teams/1/sprints/{sprint của nhóm khác}/pdf` → 200 | Kiểm tra `sprint.team.id == teamId`, nếu sai trả 404 | M0 | **Open** |

## Ghi chú cho Sprint Review 12/11

- **Đã đạt:** cam kết cốt lõi về ẩn danh (≥ 3 người chấm khác nhau) và luồng board → `ActivityEvent` → `ScoringEngine` (8/8) đã được kiểm thử đạt ngày 10/11.
- **Chặn demo:** DEF-20 (PDF lỗi 500), phải sửa trước code freeze 11/11 17:00. Hiệu năng sau khi sửa đã đo: chậm nhất 0,078 s, đạt G4 (< 10 s).
- **DoD Sprint 5 chưa đạt:** DEF-24 (phân quyền board), DEF-25 (gỡ Trello), DEF-22 (dashboard). Nếu không kịp, M0 ghi vào Change Log hoặc chuyển sang Sprint 6.
- **Nêu là rủi ro đã biết:** DEF-11 (gian lận cột Done, R05), DEF-12 (phân quyền theo nhóm).
- Mỗi defect khi đóng phải có: PR sửa, ca IT/REG chạy lại đạt, ngày đóng. M5 cập nhật file này sau mỗi lần chạy `scripts/integration-sprint4.py` và `scripts/regression-sprint5.py`.
