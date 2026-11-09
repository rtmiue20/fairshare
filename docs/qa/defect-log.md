# Defect Log – FairShare

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (PM QA & Deployment) | **Cập nhật:** 09/11/2026 (Sprint 4)
**Nguồn:** báo cáo kiểm thử Sprint 3 (`docs/qa/test-report-sprint3.md`), Integration Log Sprint 4 (`docs/qa/integration-log-sprint4.md`), dựng staging ngày 09/11.
**Mã nguồn đối chiếu:** `master` @ `c32a069`

## Quy ước

| Mức độ | Ý nghĩa | Hạn xử lý mục tiêu |
|---|---|---|
| **High** | Sai yêu cầu cốt lõi (ẩn danh, chống gian lận, phân quyền) hoặc chặn luồng chính | Trước Sprint Review gần nhất |
| **Medium** | Chức năng chạy nhưng sai, hoặc người dùng thấy lỗi | Trong sprint kế tiếp |
| **Low** | Ảnh hưởng nhỏ, có cách tránh | Khi còn thời gian |

**Trạng thái:** `Open` → `In Progress` → `Fixed` (dev đã sửa) → `Closed` (M5 kiểm thử lại đạt) · `Retest` = đã sửa trong code, chờ M5 chạy lại test tự động.
**Người xử lý** giao theo lát cắt dọc: M1 Auth/User/Common/Board · M2 Team/Sprint · M3 Đóng góp/Dashboard · M4 Chấm chéo · M5 QA/Deployment.

## Tổng quan (09/11/2026)

| Mức độ | Open | In Progress / Retest | Closed | Tổng |
|---|---|---|---|---|
| High | 5 | 1 (DEF-01) | 1 | 7 |
| Medium | 4 | 1 (DEF-18) | 0 | 5 |
| Low | 3 | 0 | 3 | 6 |
| **Tổng** | **12** | **2** | **4** | **18** |

## Danh sách lỗi

### A. Chuyển từ Sprint 3 (DEF-01..07) – trạng thái kiểm lại ngày 09/11

| Mã | Mức độ | Mô tả ngắn | Bằng chứng kiểm lại 09/11 | Người xử lý | Trạng thái |
|---|---|---|---|---|---|
| DEF-01 | High | Module auth backend chưa hiện thực, mọi request bị 401 | Auth đã merge (d7eed2e). Trên staging: đăng ký, đăng nhập, gọi API có token đều đạt (smoke test 11/11). Nhưng nhóm test `AuthApiTest.AuthContract` **vẫn `@Disabled`** | M5 bật lại test (thẻ S4-04) | **Retest** |
| DEF-02 | High | `AuthResponse` thiếu `user`, chưa bọc `ApiResponse` | `AuthResponse` đã có `UserDto user`; staging trả `{success, data:{accessToken, user}}` | M1 | **Closed** |
| DEF-03 | Medium | Đăng nhập sai → 401 → interceptor reload cứng `/login`, mất thông báo lỗi | `useAuth` **đã** đọc `response.data.message`, nhưng `client.ts` dòng 24–27 **vẫn** redirect mọi 401, kể cả `/auth/login` | M1 (Frontend) | **Open** (sửa một phần) |
| DEF-04 | Low | Nhãn form không gắn `htmlFor`/`id` | `LoginPage.tsx` có 2, `RegisterPage.tsx` có 4 `htmlFor` | M1 (Frontend) | **Closed** |
| DEF-05 | Low | `authStore` chỉ lưu token, F5 mất `user` | `authStore.ts` lưu `fairshare_user` và đọc lại khi khởi động | M1 (Frontend) | **Closed** |
| DEF-06 | Low | DTO auth thiếu `@Email`/`@NotBlank` | Staging: đăng ký email sai, bỏ trống → HTTP 400 kèm lỗi từng trường | M1 | **Closed** |
| DEF-07 | Low | Test placeholder `assertTrue(true)` làm số test pass ảo | Còn **3/5**: `AuthTest`, `PdfReportServiceTest`, `TrelloClientTest`. `ScoringEngineTest`, `AnonymityAggregatorTest` đã có test thật. `TrelloClientTest` nên xóa theo CR-02 | M0 (PDF), M1 (Auth), M5 (xóa TrelloClientTest – thẻ S4-09) | **Open** |

### B. Phát hiện mới trong Sprint 4

| Mã | Mức độ | Mô tả | Bước tái hiện / bằng chứng | Đề xuất sửa | Người xử lý | Trạng thái |
|---|---|---|---|---|---|---|
| DEF-08 | **High** | **Lộ điểm chấm chéo khi dưới 3 lượt.** `AnonymityAggregator` ẩn nhận xét nhưng vẫn trả `averageScore` và `submissionCount`. Với 1 lượt, điểm trung bình chính là điểm của người chấm duy nhất | IT-PR-04: 1 lượt điểm 4 → `averageScore = 4.0, submissionCount = 1` | Khi `count < threshold`: trả `averageScore = null` (không trả số lượt chính xác, chỉ trả cờ "chưa đủ"). Thêm test cho trường hợp 1 và 2 lượt vào `AnonymityAggregatorTest` | M4 | Open |
| DEF-09 | **High** | **Đếm số lượt, không đếm người chấm.** Một người gửi 3 lần là `isAnonymousSafe = true`. Không có ràng buộc chống chấm trùng (trigger DB thì lại đếm `DISTINCT reviewer_id`, hai nơi không thống nhất) | IT-PR-08: B chấm D 3 lần → safe = true, hiện 3 nhận xét đều của B | Thêm `UNIQUE (review_round_id, reviewer_id, reviewee_id, criterion)` (migration mới) và trả 409 khi trùng. Aggregator đếm `DISTINCT reviewer` | M4 | Open |
| DEF-10 | **High** | **Người ngoài nhóm chấm được thành viên nhóm.** `submitReview` không kiểm tra người chấm và người được chấm thuộc team của đợt chấm, cũng không kiểm tra đợt còn mở | IT-PR-07: user E (không thuộc team) gửi đánh giá → API 500 nhưng **dòng đã lưu vào DB** | Kiểm tra cả 2 người là thành viên `round.team`, `status = OPEN`, `now` nằm trong `[start_date, end_date]`, nếu không đạt thì 403/400 | M4 | Open |
| DEF-11 | **High** | **Giả mạo hoàn thành card (rủi ro R05).** `moveCard` lấy tên cột từ `fromColumnName`/`toColumnName` do client gửi thay vì tên cột thật | IT-BRD-09: `PUT /api/cards/{id}/move` với `targetColumnId` = In Progress, `toColumnName = "Done"` → sinh `CARD_COMPLETED` cho D | Bỏ 2 trường này khỏi `MoveCardRequest`, luôn dùng `fromColumn.getName()` / `targetColumn.getName()`. Kiểm tra cột đích thuộc cùng board | M1 | Open |
| DEF-12 | **High** | **Thiếu phân quyền theo nhóm.** Mọi tài khoản đã đăng nhập đều đọc được dữ liệu của nhóm khác | IT-BRD-10 (`/api/contributions/summary` → 200), IT-BRD-11 (`/api/activities/team/{id}` → 200, lộ 7 sự kiện), IT-PR-11 (`/api/review-rounds/{id}/results/{uid}` → 200) | Viết 1 hàm dùng chung `assertTeamMember(teamId, currentUser)` (tầng common), gọi ở các controller contribution, activity, board, peerreview. Trả 403 | M1 (hàm chung) + M3, M4 áp dụng cho module mình | Open |
| DEF-13 | Medium | **API chấm chéo trả 500 dù đã lưu.** Controller trả thẳng entity JPA (`ReviewSubmission`, `ReviewRound`) có quan hệ LAZY, `open-in-view: false` → Jackson lỗi "no session". Người dùng thấy "gửi thất bại", gửi lại, tạo bản trùng (làm DEF-09 nặng thêm) | IT-PR-01 (`GET /review-rounds/sprint/{id}` → 500), IT-PR-02 (`POST submissions` → 500, DB có dòng) | Trả DTO (`ReviewSubmissionDto`, `ReviewRoundDto`) thay cho entity | M4 | Open |
| DEF-14 | Medium | **Thiếu API mở/đóng đợt chấm chéo** (DoD Sprint 4 của M4). `PeerReviewService.createRound` có nhưng không controller nào gọi; không có API đóng đợt | Phải tạo đợt bằng SQL khi test tích hợp | Thêm `POST /api/review-rounds` và `PUT /api/review-rounds/{id}/close` (chỉ trưởng nhóm) | M4 | Open |
| DEF-15 | Low | Điểm ngoài thang 1–5 trả 500 thay vì 400. Chỉ có CHECK constraint ở DB chặn | IT-PR-06: `score = 9` → HTTP 500 | `@Min(1) @Max(5)` cho `score`, `@NotNull` cho `revieweeId`, `criterion`; `@Valid` ở controller | M4 | Open |
| DEF-16 | Low | Routine truy vết `sp_get_evidence_traceability` gán `source_type = 'TRELLO'` cho mọi sự kiện board (trái CR-02) và gán `status = 'DONE'` cả cho `CARD_CREATED`, `CARD_MOVED` | IT-BRD-06/07: bằng chứng của B có 3 mục đều `TRELLO`, `DONE` | Migration mới: dùng `ae.source` và `ae.event_type` thật | M3 | Open |
| DEF-17 | Medium | **Cần M3 xác nhận:** thành viên chỉ *tạo* card (chưa hoàn thành card nào) vẫn được tính đóng góp, cao hơn người đã hoàn thành card trễ hạn → có thể lợi dụng bằng cách tạo card SP lớn (R05) | IT-BRD-05: D chỉ có `CARD_CREATED` 5 SP → `finalPct = 27.78`; C hoàn thành 1 card 2 SP trễ → `22.22` | M3 đối chiếu với công thức CR-03. Nếu không đúng ý đồ: chỉ tính SP từ `CARD_COMPLETED` cho D1 | M3 (+ M2 kiểm tra công thức) | Open |
| DEF-18 | Medium | `docker-compose.yml` không truyền `JWT_SECRET` → backend dùng secret mặc định đã commit trong `application.yaml`; ai đọc repo cũng ký được token hợp lệ trên bản demo | Đọc `docker-compose.yml` mục `backend.environment` | Staging đã bắt buộc `JWT_SECRET` (`docker-compose.staging.yml`). Còn lại: thêm `JWT_SECRET` vào `.env.example` và compose gốc; bỏ giá trị mặc định ở profile `prod` | M5 | In Progress |

## Ghi chú cho Sprint Review 10/11

- **Phải sửa trước demo:** DEF-08, DEF-09 (ẩn danh là cam kết cốt lõi của đề tài), DEF-13 (demo form chấm chéo sẽ báo lỗi 500).
- **Nêu là rủi ro đã biết nếu chưa kịp:** DEF-10, DEF-11, DEF-12. Ghi vào Risk Log, liên quan R05 (gian lận dữ liệu).
- Mỗi defect khi đóng phải có: link PR, ca IT/TC chạy lại đạt, ngày đóng. M5 cập nhật file này sau mỗi lần chạy `scripts/integration-sprint4.py`.
