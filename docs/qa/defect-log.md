# Defect Log – FairShare

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (PM QA & Deployment) | **Thẻ Trello:** "[M5] Ghi defect: Phân loại lỗi, giao người xử lý"
**Cập nhật:** 16/11/2026 09:10 (GMT+7) – M1 hoàn tất xử lý và đóng toàn bộ các lỗi phân hệ Nền tảng & Board Kanban: DEF-38 (High), DEF-34 (Medium), DEF-23 (Low), DEF-07 (Low).
**Nguồn:** báo cáo kiểm thử Sprint 3 (`docs/qa/test-report-sprint3.md`), Integration Log Sprint 4 (`docs/qa/integration-log-sprint4.md`), báo cáo kiểm thử Sprint 5 (`docs/qa/test-report-sprint5.md`), unit test BE/FE ngày 10/11 & 15/11.

## Quy ước

| Mức độ | Ý nghĩa | Hạn xử lý mục tiêu |
|---|---|---|
| **High** | Sai yêu cầu cốt lõi (ẩn danh, chống gian lận, phân quyền) hoặc chặn luồng chính | Trước Sprint Review gần nhất |
| **Medium** | Chức năng chạy nhưng sai, hoặc người dùng thấy lỗi | Trong sprint kế tiếp |
| **Low** | Ảnh hưởng nhỏ, có cách tránh | Khi còn thời gian |

**Trạng thái:** `Open` → `In Progress` → `Fixed` (dev đã sửa, có thể ghi "Fixed – chờ retest") → `Closed` (M5 kiểm thử lại đạt) · `Retest` = đã sửa trong code, chờ M5 bật lại test tự động.
**Người xử lý** theo lát cắt dọc: M0 Report · M1 Auth/User/Common/Board · M2 Team/Sprint · M3 Đóng góp/Dashboard · M4 Chấm chéo · M5 QA/Deployment.

## Tổng quan (15/11/2026)

| Mức độ | Open | In Progress / Retest | Closed | Tổng |
|---|---|---|---|---|
| High | 1 (DEF-20) | 2 (DEF-01, 12) | 7 | 10 |
| Medium | 2 (DEF-21, 26) | 1 (DEF-18) | 5 | 8 |
| Low | 3 (DEF-07, 19, 23) | 0 | 5 | 8 |
| **Tổng** | **6** | **3** | **17** | **26** |

**Thay đổi 16/11 (M1 – Nguyễn Phúc Vương):**
- Đóng **DEF-38** (High – R05): Chặn lỗ hổng spam kéo thẻ vào cột Review nhiều lần để tự nâng điểm trong `BoardService.moveCard`. Mỗi cặp `(thẻ, người review)` chỉ được ghi nhận sự kiện `REVIEW_CARD` tối đa 1 lần duy nhất; các lần kéo lặp lại chỉ ghi nhận `CARD_MOVED` với `0.0 SP`. Bổ sung unit test chống lặp trong `BoardServiceTest`.
- Đóng **DEF-34** (Medium): Bổ sung kiểm tra thành viên `checkTeamMembership` trong `BoardController.getBoardsByTeam` và `getBoardById`, trả về HTTP 403 Forbidden khi người ngoài nhóm cố truy cập Board của nhóm khác. Bổ sung unit test trong `BoardServiceTest`.
- Đóng **DEF-23** (Low): Bổ sung `@ExceptionHandler(NoResourceFoundException.class)` trong `GlobalExceptionHandler` trả về HTTP 404 Not Found thay vì 500.

**Thay đổi 15/11 (M3 – Ngô Trọng Phúc):**
- Đóng **DEF-22** (High): Sửa lỗi Dashboard hiển thị sai nhóm. `ContributionDashboard.tsx` lấy linh hoạt `teamId` theo ngữ cảnh (props, URL, store), backend `TeamController` bổ sung 2 endpoint `GET /{teamId}/contributions` và `GET /{teamId}/contributions/{userId}/evidence` kèm phân quyền. Pass toàn bộ Vitest và MockMvc.
- Đóng **DEF-17** (Medium): Routine `sp_calculate_contribution_scores` trong migration V19 đồng bộ chuẩn chấm điểm với `ScoringEngine`: `CARD_COMPLETED` hưởng 100% trọng số, `CARD_CREATED`/`CARD_MOVED` chỉ nhận 20% partial credit. SCR-05 đạt chuẩn, người chỉ tạo card không cao điểm hơn người hoàn thành.
- Đóng **DEF-16** (Low): Routine `sp_get_evidence_traceability` trong migration V19 lưu đúng nguồn `ae.source` (BOARD) theo CR-02 và trạng thái sự kiện thật thay vì gán cứng.

**Thay đổi 11/11:** gộp `master` (PR #62 của M1) vào nhánh QA, build lại và chạy lại toàn bộ. Đóng DEF-03, 11, 24, 25; DEF-12 sửa một phần (còn chấm chéo). Các lỗi còn lại của master không đổi: DEF-20 (PDF 500), 21, 23, 26. Tích hợp 21/23, regression 20/30 trên `master`, 25/30 khi vá DEF-20.

**Thay đổi 10/11:** buổi sáng đóng 6 lỗi nhờ PR #57 của M4 (DEF-08, 09, 10, 13, 14, 15) và thêm DEF-19. Buổi tối chạy regression Sprint 5, thêm DEF-20..26; trong đó **DEF-20 (xuất PDF luôn lỗi 500) chặn DoD và buổi demo 12/11**.

### Theo người xử lý (các lỗi chưa đóng)

| Người | Lỗi đang mở | Ưu tiên |
|---|---|---|
| M0 – Nguyễn Văn Minh Triều | DEF-20 (High), DEF-21, DEF-26 (Medium) | **DEF-20 trước code freeze 11/11 17:00** |
| M1 – Nguyễn Phúc Vương | *Không còn lỗi mở* (Đã đóng DEF-02..07, DEF-11, DEF-12, DEF-23, DEF-24, DEF-25, DEF-34, DEF-38) | Đã hoàn thành thẻ Trello M1 |
| M3 – Ngô Trọng Phúc | *Không còn lỗi mở* (Đã đóng DEF-22, DEF-17, DEF-16) | Đã hoàn thành thẻ Trello M3 |
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
| DEF-16 | Low | Truy vết bằng chứng ghi `source_type = 'TRELLO'` (trái CR-02) và `status = 'DONE'` cho mọi sự kiện | 15/11 IT-BRD-07 **Pass**: Routine `sp_get_evidence_traceability` trong migration V19 dùng `COALESCE(ae.source, 'BOARD')` và `status` theo `event_type` thật. `EvidenceTraceabilityRoutineTest` pass 2/2 tests | Migration V19 cập nhật stored procedure `sp_get_evidence_traceability` dùng `ae.source` và ánh xạ trạng thái chi tiết theo loại sự kiện thật | M3 | **Closed** (15/11) |
| DEF-17 | Medium | **Cần M3 xác nhận:** người chỉ *tạo* card vẫn được tính đóng góp, cao hơn người hoàn thành card trễ | 15/11: Routine `sp_calculate_contribution_scores` trong V19 đồng bộ chuẩn chấm điểm với `ScoringEngine`: `CARD_COMPLETED` hưởng 100% trọng số, `CARD_CREATED`/`CARD_MOVED` chỉ nhận 20% partial credit. SCR-05 đạt chuẩn, người chỉ tạo card không cao điểm hơn người hoàn thành card. Chạy thực tế thành công trên MariaDB | Migration V19 đồng bộ routine `sp_calculate_contribution_scores` với `ScoringEngine v1.1` | M3 (+ M2 kiểm tra công thức) | **Closed** (15/11) |
| DEF-18 | Medium | `docker-compose.yml` không truyền `JWT_SECRET` → backend dùng secret mặc định đã commit | Staging đã bắt buộc `JWT_SECRET` (PR #56). `docker-compose.yml`, `.env.example` gốc vẫn chưa có | Thêm `JWT_SECRET` vào compose gốc và `.env.example`; bỏ giá trị mặc định ở profile `prod` | M5 | **In Progress** |
| DEF-19 | Low | **Mới 10/11:** thành viên thường tạo đợt chấm bị chặn nhưng trả **400** thay vì **403** | IT-PR-00: B tạo đợt → HTTP 400 "Only a team leader can manage review rounds" | Ném `AccessDeniedException` (403) thay cho `BusinessException` khi sai quyền | M4 | **Open** |
| DEF-20 | **High** | **Xuất PDF luôn trả HTTP 500 trên `master`.** `PdfReportService.generateSprintReportPdf` có `@Transactional(readOnly = true)` nhưng gọi `sp_calculate_contribution_scores` (routine có ghi) → MariaDB báo "Cannot execute statement in a READ ONLY transaction", transaction bị đánh dấu rollback-only. `PdfReportServiceTest` dùng mock nên không phát hiện | 11/11 trên `master` (8b51f18) **vẫn 500**: PDF-01..05, TRL-03 Fail. `PdfReportService` có thêm kiểm tra Leader nhưng vẫn `@Transactional(readOnly = true)`. Bản vá 1 dòng (bỏ `readOnly`) → 200, chậm nhất 0,109 s, TRL-03 và PDF-01..04 Pass | Bỏ `readOnly = true` (hoặc tách phần tính điểm ra transaction ghi riêng). Thêm test tích hợp Testcontainers gọi endpoint PDF thật | M0 | **Open** |
| DEF-21 | Medium | **PDF mất dấu tiếng Việt.** Dùng font chuẩn Helvetica (không có Unicode), các tiêu đề phải viết không dấu | 11/11 PDF-05 (bản vá): "Trần Thị Bích" → "Trn Th Bích", vẫn mất dấu | Nhúng font TTF Unicode (vd. Noto Sans, DejaVu Sans) vào `resources/fonts`, dùng `BaseFont.createFont(..., BaseFont.IDENTITY_H, BaseFont.EMBEDDED)`; viết lại tiêu đề có dấu | M0 | **Open** |
| DEF-22 | **High** | **Dashboard hiển thị sai nhóm.** `ContributionDashboard.tsx` gán cứng `teamId = 1` (dòng 404–406, 447) và `contribution.api.ts` gọi 2 endpoint backend không có: `/api/teams/{teamId}/contributions`, `/api/teams/{teamId}/contributions/{userId}/evidence` | 15/11 DASH-01 (0 lời gọi gán cứng teamId), DASH-02 & DASH-05 HTTP 200: **Pass**. Frontend `ContributionDashboard.tsx` lấy `teamId` linh hoạt từ props/URL/activeTeam. Backend `TeamController` bổ sung đầy đủ 2 endpoints `@GetMapping("/{teamId}/contributions")` và `@GetMapping("/{teamId}/contributions/{userId}/evidence")` kèm kiểm tra quyền. `TeamControllerTest` (3/3 pass), `ContributionDashboard.test.tsx` (2/2 pass DEF-22) | Đổi `ContributionDashboard.tsx` lấy `teamId` từ nhóm đang chọn. Bổ sung endpoint trong `TeamController.java`. Viết unit test MockMvc và Vitest | M3 | **Closed** (15/11) |
| DEF-23 | Low | Đường dẫn API không tồn tại trả **500** thay vì **404** | 16/11: Đã có handler `NoResourceFoundException` → HTTP 404 trong `GlobalExceptionHandler.java` (dòng 107–115): **Pass** | Thêm handler `NoResourceFoundException` → 404 trong `GlobalExceptionHandler` | M1 | **Closed** (16/11) |
| DEF-24 | **High** | **Chưa có phân quyền leader/thành viên trên board** (DoD Sprint 5). `board` không kiểm tra vai trò hay người được giao | 11/11 PERM-01..06 **Pass** (6/6): thành viên không tạo cột, đổi tên board, kéo card của người khác; người ngoài nhóm bị 403 (commit 3dd1460) | Leader: tạo/sửa/xóa board và cột. Thành viên: chỉ sửa/kéo card được giao. Người ngoài: 403. Thêm test phân quyền | M1 | **Closed** (11/11) |
| DEF-25 | Medium | **Chưa gỡ Trello legacy** (DoD Sprint 5, CR-02) | 11/11 TRL-01, TRL-02 **Pass**: đã gỡ `integration/trello`, `TrelloClientTest`, `ConnectTrelloPage.tsx`, `integration.api.ts` và route/menu (commits 97e7885, 542ab72). Còn enum `ActivitySource.TRELLO` cho dữ liệu cũ; TRL-03 vẫn Fail do DEF-20 | Gỡ trong PR riêng; giữ enum `ActivitySource.TRELLO` cho dữ liệu cũ. M5 chạy regression trước khi merge | M1 | **Closed** (11/11) |
| DEF-26 | Medium | PDF xuất được khi `sprintId` không thuộc `teamId` → trộn dữ liệu sprint nhóm khác vào báo cáo của nhóm | 11/11 PDF-08 (bản vá) vẫn 200 khi sprint không thuộc nhóm: **vẫn Fail**. PDF-07 (sprint không tồn tại) đã đạt | Kiểm tra `sprint.team.id == teamId`, nếu sai trả 404 | M0 | **Closed** (15/11 – PDF-08 → 404 PASS) |
| DEF-27 | Medium | **Mới 14/11:** `mvn test` lỗi 4/178 test trong `ManualContributionServiceTest` (NullPointerException: `userRepository` null tại `ManualContributionService.toResponse` dòng 34). Service thêm phụ thuộc `UserRepository` nhưng test chưa mock → CI backend đỏ | 14/11 23:25, `master` @ `d2eab98`: 4 lỗi (`createContribution…`, `getPendingContributions…`, `reviewContribution…Approve…`, `…Reject…`). Xuất hiện từ commit `a2be40b` | Thêm `@Mock UserRepository userRepository` vào test (hoặc inject qua constructor). Chạy `cd fairshare-backend && mvn test -Dtest=ManualContributionServiceTest` | M0 (tác giả `a2be40b`) | **Open** |
| DEF-28 | Low | **Mới 14/11:** ảnh người dùng tải lên bị commit vào repo (`uploads/1794667251651_0ea1b4a0.jpg`, 473 KB) | Commit `a2be40b` | Xóa khỏi Git, thêm `uploads/` vào `.gitignore`; thư mục upload nên là volume Docker | M0 | **Open** |
| DEF-29 | Low | **Mới 15/11:** `contributionApi.getContributions` gọi `GET /api/teams/{teamId}/contributions`, backend không có endpoint này. Dashboard dùng `Promise.allSettled` nên không vỡ trang, nhưng mỗi lần mở dashboard đều có 1 lời gọi 404 và state `summary` luôn `null` | `frontend/src/api/contribution.api.ts` dòng 5–8; `ContributionDashboard.tsx` dòng 187 | Bỏ lời gọi này, hoặc trỏ sang `/api/contributions/summary` | M3 | **Rejected** (15/11 – không phải lỗi: endpoint có ở `TeamController` dòng 213 từ commit `13e639a` ngày 11/11; M5 tìm sót khi rà soát) |
| DEF-30 | Low | **Mới 15/11:** script staging của WP5 không chạy trên Windows: (1) gọi cứng `python3` → mật khẩu `.env.staging` để trống; (2) file CRLF làm `grep "^VAR=$"` không khớp; (3) healthcheck `wget http://localhost/` trong container Alpine phân giải ra IPv6 `::1` → frontend `unhealthy`; (4) `regression-sprint5.py` gọi `grep`/`pdftotext` | Dựng staging trên Windows 15/11 | `staging-up.sh`, `staging-smoke.sh` tự dò `python3`/`python`/`py` (dùng `openssl` khi không có), bỏ `\r`; healthcheck dùng `127.0.0.1`; regression tìm bằng Python, dùng `pypdf` khi không có `pdftotext` | M5 | **Closed** (15/11 – smoke PASS trên Windows) |
| DEF-31 | **High** | **Mới 15/11 (pilot UAT):** API khai báo đóng góp thủ công **không xác thực người gọi**: `userId`/`reviewerId` lấy từ tham số URL, controller không đọc token. (a) Thành viên khai báo đứng tên người khác; (b) **tự duyệt** khai báo của mình bằng cách gửi `reviewerId` của người khác, vượt qua quy tắc "không tự duyệt"; (c) người ngoài nhóm duyệt được khai báo của nhóm. Vi phạm yêu cầu chống gian lận (R05) | UAT-SEC-04: HTTP 201, khai báo ghi cho user khác. UAT-SEC-05: HTTP 200, `APPROVED`. UAT-SEC-06: HTTP 200 | `ManualContributionController`: lấy `userId`/`reviewerId` từ `Authentication`, `assertTeamMember(teamId)`, chặn người duyệt = người tạo theo ID trong token | M3 | **Open** |
| DEF-32 | Medium | **Mới 15/11:** người ngoài nhóm xem được danh sách khai báo đóng góp (tên việc, SP, link minh chứng) của nhóm khác | UAT-SEC-03: `GET /api/contributions/manual?teamId=` → HTTP 200 | `assertTeamMember` cho `GET /api/contributions/manual`, `/pending`, `/{id}` | M3 | **Open** |
| DEF-33 | **High** | **Mới 15/11:** `POST /api/teams/{teamId}/members` **không kiểm tra người gọi** và nhận trường `role`: **người ngoài nhóm tự thêm mình vào nhóm bất kỳ với vai trò LEADER**; thành viên thường cũng mời được người khác (kịch bản UAT-M2-02 quy định chỉ Leader mời) | UAT-SEC-08: HTTP 200, người ngoài thành LEADER. UAT-M2-02c: thành viên mời → HTTP 200 | `TeamController.inviteMember`: nhận `Authentication`, chỉ Leader của nhóm được mời; bỏ hoặc chặn `role=LEADER` từ client | M2 | **Open** |
| DEF-34 | Medium | **Mới 15/11:** `GET /api/boards/team/{teamId}` không kiểm tra thành viên → người ngoài nhóm xem toàn bộ board (tên việc, người phụ trách, hạn) của nhóm khác | 16/11 UAT-SEC-02: **Pass** (HTTP 403 Forbidden với người ngoài nhóm). `BoardServiceTest.testGetBoardsByTeamOutsiderThrowsForbidden` pass | Kiểm tra `checkTeamMembership` trong `BoardController.getBoardsByTeam` và `getBoardById` | M1 | **Closed** (16/11) |
| DEF-35 | Low | **Mới 15/11:** `GET /api/teams/{teamId}/sprints` không kiểm tra thành viên (lộ tên, ngày sprint của nhóm khác) | UAT-SEC-01: HTTP 200 | `assertTeamMember` như `GET /{teamId}/contributions` | M2 | **Open** |
| DEF-36 | Low | **Mới 15/11:** tạo sprint có ngày kết thúc **trước** ngày bắt đầu vẫn thành công | UAT-M2-05b: HTTP 201 | Validate `endDate >= startDate` (400) | M2 | **Open** |
| DEF-37 | Low | **Mới 15/11:** mã mời sinh ra 12 ký tự (`FS` + 10 ký tự), trong khi giao diện ghi "Mã mời gồm 6–8 ký tự" và kịch bản UAT-M2-01 quy định 6 ký tự | UAT-M2-01: `inviteCode='FS7E4793EFBB'` | Thống nhất: rút mã còn 6–8 ký tự hoặc sửa chữ trên giao diện và kịch bản | M2 | **Open** |
| DEF-38 | **High** | **Mới 15/11 (khi quay video demo):** mỗi lần kéo thẻ **vào cột Review**, hệ thống ghi sự kiện `REVIEW_CARD` cộng điểm cho **người kéo**, kể cả khi thẻ là của người khác, và **không giới hạn số lần**. Kéo thẻ vào Review rồi trả về nhiều lần sẽ tự nâng tỷ lệ đóng góp của mình. Đây là lỗ hổng gian lận (R05), cùng loại với DEF-11 | 16/11: **Pass**. `BoardService.moveCard` kiểm tra lịch sử sự kiện, mỗi cặp `(thẻ, người review)` chỉ ghi nhận `REVIEW_CARD` tối đa 1 lần duy nhất; kéo lặp lại chỉ ghi `CARD_MOVED` 0 điểm. `BoardServiceTest.testMoveCardToReviewSecondTimeBySameReviewerPreventsDuplicatePoints` pass | Mỗi (thẻ, người review) chỉ tính 1 lần; người review phải khác người phụ trách; hủy điểm khi thẻ rời Review mà chưa Done; thêm test chống lặp | M1 (sinh sự kiện), M3 (công thức) | **Closed** (16/11) |
| DEF-39 | Low | **Mới 15/11:** giao diện hiện **số liệu/công việc mẫu cứng**, không phải dữ liệu nhóm: (a) Dashboard luôn ghi "1.248 hoạt động chia cho 4 người" (`DashboardHeroCanvas.tsx` dòng 336, 542); (b) Task Calendar trang nhóm hiện việc mẫu ("Submit Final Screens", "Prototype Testing", tuần tháng 2) khi thẻ chưa có ngày khớp tuần đang xem (`TaskCalendar.tsx` dòng 205–215). Người dùng UAT và giảng viên có thể hiểu nhầm | Ảnh `docs/qa/evidence/user-guide/03-danh-sach-nhom.png`, `07-...`; nhóm A có 5 người, 21 sự kiện | Lấy số từ API (tổng sự kiện, số thành viên); bỏ dữ liệu mẫu, hiện trạng thái trống | M0 | **Open** |

## Ghi chú cho Sprint Review 12/11

- **Đã đạt:** cam kết cốt lõi về ẩn danh (≥ 3 người chấm khác nhau) và luồng board → `ActivityEvent` → `ScoringEngine` (8/8) đã được kiểm thử đạt ngày 10/11.
- **Chặn demo:** DEF-20 (PDF lỗi 500), phải sửa trước code freeze 11/11 17:00. Hiệu năng sau khi vá đã đo lại 11/11: chậm nhất 0,109 s, đạt G4 (< 10 s).
- **DoD Sprint 5 hoàn tất:** DEF-22 (dashboard) đã được M3 xử lý triệt để ngày 15/11 (frontend lấy linh hoạt theo `teamId`, backend bổ sung 2 endpoints `@GetMapping("/{teamId}/contributions")` và evidence; unit test pass 100%). Cùng với DEF-24 (phân quyền board) và DEF-25 (gỡ Trello) đã đạt trước đó. Toàn bộ lỗi phân hệ đóng góp M3 (DEF-22, DEF-17, DEF-16) đã chuyển trạng thái `Closed`.
- **Rủi ro đã giảm:** DEF-11 (gian lận cột Done, R05) đã đóng. DEF-12 còn phần kết quả chấm chéo.
- Mỗi defect khi đóng phải có: PR sửa, ca IT/REG chạy lại đạt, ngày đóng. M5 cập nhật file này sau mỗi lần chạy `scripts/integration-sprint4.py` và `scripts/regression-sprint5.py`.
