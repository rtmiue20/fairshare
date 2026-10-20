# SPRINT 3 – Nền tảng, nhóm, tích hợp Trello (khung)

**Thời gian:** Thứ 4, 28/10/2026 → Thứ 3, 03/11/2026 | **Tương ứng:** Sprint 1 trong kế hoạch (Tuần 3) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
Có khung xác thực và layout chung để các module khác chạy được; nhóm/sprint/consent hoạt động; khung đồng bộ Trello vào `ActivityEvent`; khung `contribution` và `peerreview`; CI chạy test.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 28/10 |
| Daily | Hằng ngày |
| Mốc: M1 giao khung xác thực/JWT + layout chung | Thứ 6, 30/10 |
| Sprint Review + Retrospective | Thứ 3, 03/11 |

## Phân công công việc (lát cắt dọc)
| Người | Lát cắt dọc | Việc cụ thể | Minh chứng | Deadline |
|---|---|---|---|---|
| M1 | Nền tảng + Trello | **Ngày 1–3 (28–30/10):** xác thực/JWT, `BaseEntity`, xử lý lỗi, layout chung, trang đăng nhập/đăng ký. **Ngày 3–5 (30/10–02/11):** kết nối Trello, đồng bộ board/card/member/action vào `ActivityEvent` | Commit, API log, demo đồng bộ | 30/10 (nền tảng), 02/11 (Trello) |
| M2 | Nhóm/Sprint/Consent | Migration + entity + API tạo nhóm, mời thành viên, consent, sprint; màn hình nhóm và consent (làm với dữ liệu giả cho đến khi M1 giao khung xác thực) | Commit, demo UI | 02/11 |
| M3 | Đóng góp (khung) | Migration `contribution`, công thức v1 cùng M2, `ScoringEngine` bản đầu (unit test với dữ liệu mẫu), dữ liệu mẫu `ActivityEvent` | Commit, test, tài liệu công thức v1 | 02/11 |
| M4 | Chấm chéo (khung) | Migration + entity `ReviewRound/Submission/Criterion`, thiết kế cơ chế ẩn danh, tiêu chí | Commit, thiết kế ẩn danh | 02/11 |
| M5 | Kiểm thử/CI | Test case Sprint 3, bật CI chạy test, kiểm thử đồng bộ Trello | Test case, kết quả test | 02/11 |
| M0 | Quản lý | Sprint Planning, burndown, báo cáo tuần, cập nhật Risk; khung module `report` | Sprint report, burndown | 03/11 |

## Tiêu chí hoàn thành (DoD)
Mỗi lát dọc tính là xong khi có: migration + entity, API có validation, màn hình dùng được, unit/integration test tối thiểu, cập nhật task Trello và log công việc, demo được trên `develop`. (Sprint này chấp nhận bản "khung" cho `contribution` và `peerreview`.)

## Quy ước nhắc lại
- Nhánh `feature/<module>-<mô-tả>` → PR vào `develop`, ít nhất 1 người review trong 24 giờ.
- Flyway dùng số phiên bản theo ngày giờ; file đã merge không sửa.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R16: M2/M3/M4 bị chặn bởi nền tảng M1 | M1 giao khung trước 30/10; các module khác làm với dữ liệu giả |
| R19: M1 quá tải | M0 theo dõi sát, hỗ trợ sau sprint này; cắt Google Docs nếu trễ |
| R18: đụng migration | Đúng quy ước phiên bản, M3 giữ ERD tổng |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 4: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi PR cần được review trong 24 giờ. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 28/10 – Planning & dựng nền tảng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia việc, nhắc quy ước Git/Flyway | Sprint backlog | 1h | 28/10, 21:00 |
| M1 | JWT + khung (1/3) | Cấu hình Spring Security, khung bảo mật | Nhánh `feature/auth-jwt` (khung bảo mật) | 2h | 28/10, 23:00 |
| M1 | JWT + khung (2/3) | API đăng ký, đăng nhập phát JWT | Endpoint đăng ký/đăng nhập | 2h | 29/10, 12:00 |
| M1 | JWT + khung (3/3) | `BaseEntity`, bộ lọc JWT | `BaseEntity`, bộ lọc JWT | 1h | 29/10, 21:00 |
| M2 | Migration nhóm (1/2) | Migration + entity `Team`, `TeamMember` | Migration, entity (dữ liệu giả) | 2h | 29/10, 12:00 |
| M2 | Migration nhóm (2/2) | Migration + entity `Sprint`, `Consent` | Migration, entity (dữ liệu giả) | 1h | 29/10, 21:00 |
| M3 | Migration đóng góp (1/2) | Migration `contribution` | Migration | 2h | 29/10, 12:00 |
| M3 | Migration đóng góp (2/2) | Bảng điểm | Migration | 1h | 29/10, 21:00 |
| M4 | Migration chấm chéo (1/2) | Migration + entity `ReviewRound` | Migration, entity | 2h | 29/10, 12:00 |
| M4 | Migration chấm chéo (2/2) | Migration + entity `Submission`, `Criterion` | Migration, entity | 1h | 29/10, 21:00 |
| M5 | Test case (1/2) | Test case xác thực, nhóm theo tiêu chí chấp nhận | Test case | 2h | 29/10, 21:00 |
| M5 | Test case (2/2) | Test case consent, đồng bộ Trello | Test case | 1h | 30/10, 21:00 |

### Thứ 5, 29/10 – Xử lý lỗi & layout
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Xử lý lỗi, layout (1/3) | Exception handler chung | Exception handler | 2h | 29/10, 23:00 |
| M1 | Xử lý lỗi, layout (2/3) | Layout/router | Layout, router | 2h | 30/10, 12:00 |
| M1 | Xử lý lỗi, layout (3/3) | Component dùng chung | Component chung | 1h | 30/10, 17:00 |
| M2 | API nhóm (1/2) | API tạo nhóm | Endpoint + validation | 2h | 30/10, 21:00 |
| M2 | API nhóm (2/2) | API mời thành viên | Endpoint + validation | 2h | 31/10, 21:00 |
| M3 | Công thức v1 (1/2) | Cùng M2 rà công thức v0.1, chỉnh trọng số | Bản chỉnh công thức | 2h | 30/10, 12:00 |
| M3 | Công thức v1 (2/2) | Viết tài liệu công thức v1 | Tài liệu công thức v1 | 1h | 30/10, 21:00 |

### Thứ 6, 30/10 – Mốc giao khung nền tảng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Đăng nhập/đăng ký (1/3) | Màn hình đăng nhập | Màn hình đăng nhập | 2h | 30/10, 14:00 |
| M1 | Đăng nhập/đăng ký (2/3) | Màn hình đăng ký | Màn hình đăng ký | 1h | 30/10, 16:00 |
| M1 | Đăng nhập/đăng ký (3/3) | PR vào `develop`, thông báo cả nhóm | Khung xác thực chạy trên `develop` | 1h | 30/10, 17:00 |
| M2, M3, M4 | Nối vào xác thực | Pull `develop`, thay dữ liệu giả bằng xác thực thật khi có thể | Nhánh cập nhật | 1–2h | 30/10, 21:00 |
| M1 | Bắt đầu Trello (1/2) | Lưu token Trello, gọi thử API | Token lưu được, gọi thử thành công | 2h | 31/10, 12:00 |
| M1 | Bắt đầu Trello (2/2) | Dịch vụ kết nối Trello bản đầu | Dịch vụ kết nối Trello bản đầu | 1h | 31/10, 21:00 |

### Thứ 7, 31/10 – Đồng bộ Trello
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Đồng bộ dữ liệu (1/3) | Map board/list/card vào `ActivityEvent` | Code đồng bộ board/card | 2h | 01/11, 12:00 |
| M1 | Đồng bộ dữ liệu (2/3) | Map member/action vào `ActivityEvent` | Code đồng bộ member/action | 2h | 01/11, 17:00 |
| M1 | Đồng bộ dữ liệu (3/3) | API log, xử lý lỗi cơ bản | API log | 1h | 01/11, 21:00 |
| M2 | API sprint, consent (1/2) | API tạo sprint | Endpoint + validation | 2h | 01/11, 17:00 |
| M2 | API sprint, consent (2/2) | API ghi consent | Endpoint + validation | 2h | 01/11, 21:00 |
| M4 | Thiết kế ẩn danh (1/2) | Mô tả cơ chế ẩn danh, cách lưu dữ liệu | Tài liệu thiết kế ẩn danh (phần 1) | 2h | 01/11, 17:00 |
| M4 | Thiết kế ẩn danh (2/2) | Ngưỡng tổng hợp, hoàn thiện tài liệu | Tài liệu thiết kế ẩn danh | 1h | 01/11, 21:00 |

### Chủ nhật, 01/11 – Màn hình & ScoringEngine
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Màn hình nhóm, consent (1/3) | Danh sách/chi tiết nhóm | Màn hình nhóm | 2h | 02/11, 12:00 |
| M2 | Màn hình nhóm, consent (2/3) | Mời thành viên | Màn hình mời thành viên | 2h | 02/11, 15:00 |
| M2 | Màn hình nhóm, consent (3/3) | Màn hình consent | Màn hình consent | 1h | 02/11, 17:00 |
| M3 | `ScoringEngine` (1/3) | Cấu trúc `ScoringEngine`, hàm tính điểm cơ bản | Code khung `ScoringEngine` | 2h | 02/11, 12:00 |
| M3 | `ScoringEngine` (2/3) | Cài trọng số theo công thức v1 (độ khó, đúng hạn) | Code công thức v1 | 2h | 02/11, 15:00 |
| M3 | `ScoringEngine` (3/3) | Unit test với dữ liệu mẫu | Unit test | 1h | 02/11, 17:00 |
| M3 | Dữ liệu mẫu | Tạo dữ liệu mẫu `ActivityEvent` | Script dữ liệu mẫu | 2h | 02/11, 17:00 |

### Thứ 2, 02/11 – Test & tích hợp
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Kiểm tra đồng bộ (1/2) | Chạy đồng bộ với board thật | Demo đồng bộ | 2h | 02/11, 14:00 |
| M1 | Kiểm tra đồng bộ (2/2) | Sửa lỗi phát sinh | Commit sửa lỗi | 1h | 02/11, 17:00 |
| M5 | CI | Bật CI chạy test | CI chạy test | 2h | 02/11, 17:00 |
| M5 | Kiểm thử Trello | Kiểm tra đồng bộ Trello, ghi kết quả | Kết quả test | 2h | 02/11, 21:00 |
| M2, M3, M4 | Hoàn tất PR | Mở PR vào `develop`, nhờ người liền kề review | PR đã merge | 2h | 02/11, 21:00 |
| M0 | Khung `report` | Tạo package `report`, endpoint rỗng | Khung module | 2h | 02/11, 21:00 |

### Thứ 3, 03/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 3 | Burndown, tiến độ, cập nhật Risk | Sprint report | 1h | 03/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo trên `develop`: đăng nhập, nhóm, đồng bộ Trello | Biên bản họp | 1h | 03/11, 21:00 |
| M0 | Chuẩn bị Sprint 4 | Chọn việc Sprint 4 từ backlog | Sprint 4 backlog | 1h | 03/11, 22:00 |
