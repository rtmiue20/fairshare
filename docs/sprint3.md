# SPRINT 3 – Nền tảng, nhóm và board/card (khung)

**Thời gian:** Thứ 4, 28/10/2026 → Thứ 3, 03/11/2026 | **Tương ứng:** Sprint 3 trong kế hoạch 7 sprint (Sprint 1 trong kế hoạch gốc) | **Trạng thái sprint:** ✅ Hoàn thành (Đã nghiệm thu Review 03/11)

## Mục tiêu sprint
- Có khung xác thực (JWT), layout chung, xử lý lỗi để các module khác nối vào.
- Có nhóm, sprint, consent (API + màn hình).
- Có khung module `board` (board, cột, card) tự xây thay cho Trello API; mọi thao tác trên card ghi thành `ActivityEvent`.
- Có khung `contribution` (`ScoringEngine` v1) và `peerreview` (migration, thiết kế ẩn danh), CI chạy test.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 28/10 |
| Daily (15 phút, chat/họp nhanh) | Hằng ngày |
| Mốc: M1 giao khung xác thực/JWT + layout chung lên `develop` | Thứ 6, 30/10 |
| Sprint Review + Retrospective | Thứ 3, 03/11 |

## Phân công công việc (lát cắt dọc)
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M0 | Sprint Planning, Change Request thay Trello API bằng module `board` nội bộ (cập nhật Change Log, WBS, Gantt, Risk R02, API contract), burndown, báo cáo tuần, khung module `report` | Sprint report, CR02, burndown | 03/11 | ✅ Hoàn thành |
| M1 | Nền tảng: `BaseEntity`, xử lý lỗi, JWT, layout chung, đăng nhập/đăng ký. Board/card (khung): migration `V10`, entity, API board/cột/card, ghi `ActivityEvent`, màn hình board cơ bản | Commit, API log, demo UI | 30/10 (nền tảng), 02/11 (board) | ✅ Hoàn thành |
| M2 | Nhóm/Sprint/Consent: migration, entity, API tạo nhóm, mời thành viên, consent, sprint; màn hình nhóm và consent | Commit, demo UI | 02/11 | ✅ Hoàn thành |
| M3 | Đóng góp (khung): migration `contribution`, công thức v1 cùng M2, `ScoringEngine` bản đầu + unit test, dữ liệu mẫu `ActivityEvent` | Commit, test, tài liệu công thức v1 | 02/11 | ✅ Hoàn thành |
| M4 | Chấm chéo (khung): migration + entity `ReviewRound/Submission/Criterion`, thiết kế cơ chế ẩn danh, tiêu chí | Commit, AnonymityAggregator | 02/11 | ✅ Hoàn thành |
| M5 | Test case Sprint 3, bật CI chạy test, kiểm thử auth/nhóm/board | Test case, kết quả test, CI | 02/11 | ✅ Hoàn thành |

## Quy ước nhắc lại
- Nhánh `feature/<module>-<mô-tả>` → PR vào `develop`, ít nhất 1 người review trong 24 giờ.
- Flyway dùng số phiên bản theo ngày giờ hoặc tuần tự chuẩn hóa (`V10__create_boards_and_cards.sql`); file đã merge không sửa.
- Dữ liệu đọc/tổng hợp lấy qua routine (stored procedure/function) trong MariaDB hoặc JPA Repository chuẩn hóa; backend gọi qua Service phân tầng rõ ràng.
- Mọi task ≤ 2 giờ; việc lớn hơn tách thành (1/2), (2/2)…, mỗi phần có đầu ra riêng.

## Tiêu chí hoàn thành (DoD)
- [x] Đăng ký/đăng nhập chạy được, token JWT dùng được cho các API khác.
- [x] Tạo nhóm, mời thành viên, ghi consent, tạo sprint hoạt động trên API và màn hình.
- [x] Tạo board/cột/card, di chuyển card thì có bản ghi `ActivityEvent` tương ứng (`BOARD`, `CARD_CREATED`, `CARD_MOVED`, `CARD_COMPLETED`).
- [x] `ScoringEngine` v1 có unit test với dữ liệu mẫu (5/5 tests passed).
- [x] CI chạy build/test thành công; demo được trên `develop`.

## Rủi ro theo dõi
| Rủi ro | Biện pháp | Kết quả thực tế |
|---|---|---|
| R16: M2/M3/M4 bị chặn bởi nền tảng M1 | M1 giao khung trước 30/10; các module khác làm với dữ liệu giả | Đã hoàn thành bàn giao khung JWT và BaseEntity đúng hạn |
| R19: M1 quá tải (nền tảng + board/card) | M0 theo dõi sát; ưu tiên khung, phần giao diện kéo thả để Sprint 4 | Đã hoàn thành Board API & Kanban BoardView cơ bản, phần DnD chuyển Sprint 4 |
| R18: đụng migration Flyway | Đúng quy ước phiên bản, M3 giữ ERD tổng | Đã tạo V10 chuẩn hóa không xung đột |

## Báo cáo cuối sprint (nghiệm thu họp Review)
- **Việc hoàn thành:** 
  1. Module Xác thực & Nền tảng: Hoàn tất Spring Security, JWT, `BaseEntity`, `ApiResponse`, `GlobalExceptionHandler`, giao diện Đăng nhập / Đăng ký.
  2. Module Nhóm, Sprint & Consent (M2): Hoàn tất API và giao diện tạo nhóm, xem chi tiết, mời thành viên qua email, tham gia bằng mã mời (`inviteCode`), quản lý Sprint và cam kết dữ liệu Nghị định 13/2023/NĐ-CP.
  3. Module Task Board Nội bộ (CR-02 thay Trello API): Hoàn tất migration `V10`, entity/repository/service/controller cho Board, Column, Card; ghi nhận `ActivityEvent` tự động khi tạo/chuyển thẻ; giao diện Kanban BoardView tích hợp vào chi tiết nhóm.
  4. Module Đóng góp & Chấm chéo: Hoàn tất `ScoringEngine` v1 với đầy đủ unit test (100% pass), cài đặt `AnonymityAggregator` bảo vệ ẩn danh chống suy luận danh tính người chấm.
  5. Đảm bảo toàn bộ 19 backend unit tests và 23 frontend vitest tests đạt 100% pass.
- **Việc tồn đọng chuyển sang Sprint 4:** 
  - Kéo thả HTML5 Drag-and-Drop / thư viện DnD nâng cao cho BoardView.
  - Drill-down lọc nâng cao trên Dashboard đóng góp.
  - Kiểm thử công thức với dữ liệu thực nghiệm quy mô lớp học.
- **Bài học từ Retro:** 
  - Quyết định ban hành CR-02 chuyển sang Task Board nội bộ là quyết định đúng đắn, giúp hệ thống hoàn toàn làm chủ nguồn dữ liệu và ghi vết `ActivityEvent` tức thì, loại bỏ rủi ro phụ thuộc bên ngoài và rate-limiting.

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 28/10 – Planning & dựng nền tảng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia việc, nhắc quy ước Git/Flyway/routine | Sprint backlog | 1h | 28/10, 21:00 | ✅ |
| M0 | Change Request thay Trello API | Ghi CR: dùng module `board` nội bộ, cập nhật Change Log, Risk R02, API contract | CR02, Change Log | 1h | 29/10, 12:00 | ✅ |
| M1 | Khung dự án + `BaseEntity` | Cấu trúc package, `BaseEntity`, `ApiResponse` | Nhánh `feature/common-base` | 2h | 29/10, 12:00 | ✅ |
| M1 | Xử lý lỗi | `GlobalExceptionHandler`, các exception chung | Commit | 1h | 29/10, 12:00 | ✅ |
| M2 | Migration nhóm (1/2) | Migration + entity `Team`, `TeamMember` | Migration, entity | 2h | 29/10, 21:00 | ✅ |
| M3 | Migration đóng góp | Migration bảng `contribution` | Migration | 2h | 29/10, 21:00 | ✅ |
| M4 | Migration chấm chéo (1/2) | `ReviewRound`, `ReviewCriterion` | Migration, entity | 2h | 29/10, 21:00 | ✅ |
| M5 | Test case (1/2) | Test case auth, nhóm theo tiêu chí chấp nhận | Test case phần 1 | 2h | 29/10, 21:00 | ✅ |

### Thứ 5, 29/10 – JWT & API nhóm
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| M1 | JWT (1/2) | Cấu hình Spring Security, API đăng ký/đăng nhập | API auth | 2h | 30/10, 12:00 | ✅ |
| M1 | JWT (2/2) | `JwtService`, `JwtAuthenticationFilter`, test | Commit + test | 2h | 30/10, 17:00 | ✅ |
| M2 | API nhóm (1/2) | API tạo nhóm, xem chi tiết (dữ liệu giả cho đến khi có JWT) | Endpoint + validation | 2h | 30/10, 21:00 | ✅ |
| M2 | Migration nhóm (2/2) | Migration + entity `Consent`, `Sprint` | Migration, entity | 2h | 30/10, 21:00 | ✅ |
| M3 | Công thức v1 | Cùng M2 chốt công thức v1 từ v0.1 | Tài liệu công thức v1 | 2h | 30/10, 21:00 | ✅ |
| M4 | Migration chấm chéo (2/2) | `ReviewSubmission`, bảng lưu ẩn danh | Migration, entity | 2h | 30/10, 21:00 | ✅ |
| M5 | Test case (2/2) | Test case chấm chéo, đóng góp | Test case phần 2 | 1h | 30/10, 21:00 | ✅ |

### Thứ 6, 30/10 – Mốc giao khung nền tảng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| M1 | Layout chung (1/2) | Router, layout, component `Button`, `Card`, `Modal` | Layout, component chung | 2h | 30/10, 12:00 | ✅ |
| M1 | Trang đăng nhập/đăng ký | Hai màn hình nối với API auth | Màn hình dùng được | 2h | 30/10, 17:00 | ✅ |
| M1 | Merge khung | PR vào `develop`, báo cả nhóm | Khung xác thực trên `develop` | 1h | 30/10, 19:00 | ✅ |
| M2, M3, M4 | Nối vào xác thực | Kéo `develop`, thay dữ liệu giả bằng xác thực thật | Nhánh cập nhật | 1h | 31/10, 12:00 | ✅ |
| M5 | Bật CI | GitHub Actions chạy build + test | Pipeline CI | 2h | 30/10, 21:00 | ✅ |

### Thứ 7, 31/10 – Board/card và API nhóm
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| M1 | Board/card (1/2) | Migration + entity `Board`, `BoardColumn`, `Card`, người phụ trách | Migration `V10`, entity | 2h | 01/11, 12:00 | ✅ |
| M1 | Board/card (2/2) | API tạo/sửa/xóa board và cột | Endpoint + validation | 2h | 01/11, 17:00 | ✅ |
| M2 | API mời thành viên | Mời, chấp nhận lời mời | Endpoint + validation | 2h | 01/11, 12:00 | ✅ |
| M2 | API consent, sprint | Ghi/rút consent, tạo sprint | Endpoint + validation | 2h | 01/11, 21:00 | ✅ |
| M4 | Thiết kế ẩn danh | Mô tả cơ chế ẩn danh, cách lưu, ngưỡng tổng hợp | AnonymityAggregator | 2h | 01/11, 21:00 | ✅ |

### Chủ nhật, 01/11 – Card API, màn hình, ScoringEngine
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| M1 | Card API (1/2) | CRUD card, giao việc cho thành viên | Endpoint + validation | 2h | 02/11, 12:00 | ✅ |
| M1 | Card API (2/2) | Di chuyển card giữa cột, ghi `ActivityEvent` | Endpoint + bản ghi sự kiện | 2h | 02/11, 17:00 | ✅ |
| M2 | Màn hình nhóm | Danh sách/chi tiết nhóm, mời thành viên | Màn hình dùng được | 2h | 02/11, 12:00 | ✅ |
| M2 | Màn hình consent | Hộp thoại consent, trạng thái đồng ý | Màn hình dùng được | 2h | 02/11, 17:00 | ✅ |
| M3 | `ScoringEngine` (1/2) | Cài đặt công thức v1 | Code `ScoringEngine` | 2h | 02/11, 12:00 | ✅ |
| M3 | `ScoringEngine` (2/2) | Unit test với dữ liệu mẫu | Test `ScoringEngineTest` | 2h | 02/11, 17:00 | ✅ |
| M3 | Dữ liệu mẫu | Script dữ liệu mẫu `ActivityEvent` | Script dữ liệu mẫu | 1h | 02/11, 17:00 | ✅ |

### Thứ 2, 02/11 – Test & tích hợp
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| M1 | Màn hình board khung | Hiển thị cột và card, tạo card | Màn hình `BoardView` | 2h | 02/11, 17:00 | ✅ |
| M5 | Kiểm thử | Test auth, nhóm, board API, ghi kết quả | Kết quả test | 2h | 02/11, 21:00 | ✅ |
| M1, M2, M3, M4 | Hoàn tất PR | PR vào `develop`, nhờ người liền kề review | PR đã merge | 1h | 02/11, 21:00 | ✅ |
| M0 | Khung `report` | Package `report`, endpoint rỗng | Khung module | 2h | 02/11, 21:00 | ✅ |

### Thứ 3, 03/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn | Trạng thái |
|---|---|---|---|---|---|---|
| M0 | Báo cáo tuần 3 | Burndown, tiến độ, cập nhật Risk | Sprint report | 1h | 03/11, 12:00 | ✅ |
| Cả nhóm | Sprint Review + Retro | Demo trên `develop`: đăng nhập, nhóm, board/card | Biên bản họp | 1h | 03/11, 21:00 | ✅ |
| M0 | Chuẩn bị Sprint 4 | Ghi việc tồn đọng, chọn việc Sprint 4 | Sprint 4 backlog | 1h | 03/11, 22:00 | ✅ |
