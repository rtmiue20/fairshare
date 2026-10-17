# SPRINT 4 – Nền tảng, nhóm, tích hợp Trello (khung)

**Thời gian:** Thứ 4, 28/10/2026 → Thứ 3, 03/11/2026 | **Tương ứng:** Sprint 1 trong kế hoạch gốc (Tuần 4) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

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
| M5 | Kiểm thử/CI | Test case Sprint 4, bật CI chạy test, kiểm thử đồng bộ Trello | Test case, kết quả test | 02/11 |
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
- Việc tồn đọng chuyển sang Sprint 5: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi PR cần được review trong 24 giờ.

### Thứ 4, 28/10 – Planning & dựng nền tảng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia việc, nhắc quy ước Git/Flyway | Sprint backlog | 1h | 28/10, 21:00 |
| M1 | JWT + khung | Cấu hình Spring Security, đăng ký/đăng nhập, JWT, `BaseEntity` | Nhánh `feature/auth-jwt` | 5h | 29/10, 21:00 |
| M2 | Migration nhóm | Viết migration + entity `Team`, `TeamMember`, `Sprint`, `Consent` | Migration, entity (dữ liệu giả) | 3h | 29/10, 21:00 |
| M3 | Migration đóng góp | Migration `contribution`, bảng điểm | Migration | 3h | 29/10, 21:00 |
| M4 | Migration chấm chéo | `ReviewRound`, `Submission`, `Criterion` | Migration, entity | 3h | 29/10, 21:00 |
| M5 | Test case | Soạn test case Sprint 4 theo tiêu chí chấp nhận | Test case | 3h | 30/10, 21:00 |

### Thứ 5, 29/10 – Xử lý lỗi & layout
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Xử lý lỗi, layout | Exception handler chung, layout/router, component dùng chung | Layout, component chung | 5h | 30/10, 17:00 |
| M2 | API nhóm | API tạo nhóm, mời thành viên | Endpoint + validation | 4h | 31/10, 21:00 |
| M3 | Công thức v1 | Cùng M2 chốt công thức v1 từ v0.1 | Tài liệu công thức v1 | 3h | 30/10, 21:00 |

### Thứ 6, 30/10 – Mốc giao khung nền tảng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Trang đăng nhập/đăng ký, merge | Màn hình đăng nhập/đăng ký, PR vào `develop`, thông báo cả nhóm | Khung xác thực chạy trên `develop` | 4h | 30/10, 17:00 |
| M2, M3, M4 | Nối vào xác thực | Pull `develop`, thay dữ liệu giả bằng xác thực thật khi có thể | Nhánh cập nhật | 1–2h | 30/10, 21:00 |
| M1 | Bắt đầu Trello | Lưu token Trello, gọi thử API trong dịch vụ | Dịch vụ kết nối Trello bản đầu | 3h | 31/10, 21:00 |

### Thứ 7, 31/10 – Đồng bộ Trello
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Đồng bộ dữ liệu | Map board/card/member/action vào `ActivityEvent` | Code đồng bộ, API log | 5h | 01/11, 21:00 |
| M2 | API sprint, consent | API tạo sprint, ghi consent | Endpoint + validation | 4h | 01/11, 21:00 |
| M4 | Thiết kế ẩn danh | Mô tả cơ chế ẩn danh, lưu dữ liệu, ngưỡng tổng hợp | Tài liệu thiết kế ẩn danh | 3h | 01/11, 21:00 |

### Chủ nhật, 01/11 – Màn hình & ScoringEngine
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Màn hình nhóm, consent | Danh sách/chi tiết nhóm, mời thành viên, consent | Màn hình dùng được | 5h | 02/11, 17:00 |
| M3 | `ScoringEngine` | Cài đặt công thức v1, unit test | Code + test | 5h | 02/11, 17:00 |
| M3 | Dữ liệu mẫu | Tạo dữ liệu mẫu `ActivityEvent` | Script dữ liệu mẫu | 2h | 02/11, 17:00 |

### Thứ 2, 02/11 – Test & tích hợp
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M5 | CI + kiểm thử Trello | Bật CI chạy test, kiểm tra đồng bộ Trello | Kết quả test | 4h | 02/11, 21:00 |
| M1 | Kiểm tra đồng bộ | Chạy đồng bộ với board thật, sửa lỗi | Demo đồng bộ | 3h | 02/11, 17:00 |
| M2, M3, M4 | Hoàn tất PR | Mở PR vào `develop`, nhờ người liền kề review | PR đã merge | 2h | 02/11, 21:00 |
| M0 | Khung `report` | Tạo package `report`, endpoint rỗng | Khung module | 2h | 02/11, 21:00 |

### Thứ 3, 03/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 4 | Burndown, tiến độ, cập nhật Risk | Sprint report | 1h | 03/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo trên `develop`: đăng nhập, nhóm, đồng bộ Trello | Biên bản họp | 1h | 03/11, 21:00 |
| M0 | Chuẩn bị Sprint 5 | Chọn việc Sprint 5 từ backlog | Sprint 5 backlog | 1h | 03/11, 22:00 |
