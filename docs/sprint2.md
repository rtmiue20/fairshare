# SPRINT 2 – Lập kế hoạch & thiết kế

**Thời gian:** Thứ 4, 21/10/2026 → Thứ 3, 27/10/2026 | **Tương ứng:** Tuần 2 | **Trạng thái sprint:** 🔄 Đang thực hiện

## Mục tiêu sprint
Có đủ bộ tài liệu kế hoạch (Gantt, RACI, Risk, Comm Plan), kiến trúc, ERD, test plan, prototype, và quan trọng nhất là **chốt hợp đồng API và bảng dùng chung** giữa các module trước khi vào code.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 21/10 |
| Daily | Hằng ngày |
| Họp chốt API contract (cả nhóm, bắt buộc) | Thứ 2, 26/10 |
| Sprint Review + Retrospective | Thứ 3, 27/10 |

## Phân công công việc
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M0 | Gantt, RACI, Risk Register, Communication Plan | Gantt, RACI, Risk Register, Comm Plan | 25/10 | ⬜ |
| M1 | Kiến trúc hệ thống; **spike** Trello API (và Google Docs nếu còn thời gian); thiết kế bảng `ActivityEvent` | Sơ đồ kiến trúc, kết quả spike, thiết kế bảng | 24/10 (spike), 25/10 (thiết kế) | ⬜ |
| M3 | ERD tổng (tổng hợp từ cả nhóm), quy ước CSDL, kế hoạch dữ liệu mẫu | ERD, quy ước | 26/10 | ⬜ |
| M2 | Mẫu consent, chính sách dữ liệu, kịch bản UAT, API contract M2 | Consent form, chính sách dữ liệu, kịch bản UAT, API contract | 25/10 | ✅ Hoàn thành |
| M4 | Prototype tương tác cho module chấm chéo và cảnh báo | Prototype | 25/10 | ⬜ |
| M5 | Test plan hoàn chỉnh, môi trường dev, CI cơ bản, Docker Compose MariaDB | Test plan, pipeline CI | 26/10 | ⬜ |
| **Cả nhóm** | **Chốt hợp đồng API và bảng dùng chung** giữa các module | Tài liệu API contract | **26/10** | ⬜ |
| M0 | Báo cáo tuần 2, Sprint Review/Retro, chuẩn bị Sprint 3 | Báo cáo tuần, biên bản | 27/10 | ⬜ |

## Chuẩn bị cho Sprint 3 (làm trong sprint này)
- M1 chuẩn bị sẵn khung dự án Spring Boot/Vite để vào code ngay Sprint 3.
- Mỗi chủ module đọc API contract và liệt kê endpoint mình sở hữu.
- Thống nhất quy ước Git và Flyway (số phiên bản theo ngày giờ, ví dụ `V202610281530__create_teams.sql`).

## Tiêu chí hoàn thành (DoD)
- API contract có danh sách đường dẫn, JSON request/response, mã lỗi cho từng module, đã đưa lên Swagger hoặc tài liệu chung.
- ERD tổng và bảng `ActivityEvent` đã được cả nhóm xem.
- CI chạy được với repo trống, Docker Compose MariaDB chạy trên máy các thành viên.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R16: module phía dưới chờ nền tảng của M1 | M1 lên kế hoạch giao khung xác thực trong 2–3 ngày đầu Sprint 3 |
| Spike Trello API cho thấy giới hạn lớn | M1 báo M0 ngay, đưa Change Request nếu phải đổi phạm vi |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 3: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 21/10 – Planning & bắt đầu thiết kế
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chọn việc Sprint 2, chốt cách làm API contract | Sprint backlog | 1h | 21/10, 21:00 |
| M0 | Gantt (1/2) | Dựng khung Gantt 7 sprint từ WBS: epic, mốc, thời lượng | Khung Gantt | 2h | 22/10, 21:00 |
| M0 | Gantt (2/2) | Thêm task chi tiết và phụ thuộc | Gantt bản nháp | 1h | 22/10, 21:00 |
| M1 | Kiến trúc (1/2) | Vẽ sơ đồ thành phần: Spring Boot, MariaDB, React | Sơ đồ thành phần | 2h | 22/10, 21:00 |
| M1 | Kiến trúc (2/2) | Bổ sung dịch vụ ngoài (Trello) và luồng triển khai | Sơ đồ kiến trúc nháp | 1h | 22/10, 21:00 |

### Thứ 5, 22/10 – Spike & dữ liệu
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Spike Trello API (1/3) | Gọi thử API lấy board/card | Code spike board/card | 2h | 22/10, 21:00 |
| M3 | ERD nháp (1/2) | Thu thập bảng từ các module | Danh sách bảng theo module | 2h | 23/10, 12:00 |
| M3 | ERD nháp (2/2) | Vẽ ERD bản đầu | ERD nháp | 1h | 23/10, 21:00 |
| M2 | Consent | Soạn mẫu consent, nêu rõ dữ liệu thu thập, mục đích, quyền rút lại | Consent form nháp | 2h | 23/10, 21:00 |

### Thứ 6, 23/10 – Tài liệu quản lý & prototype
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Spike Trello API (2/3) | Gọi thử API lấy member/action | Code spike member/action | 2h | 23/10, 21:00 |
| M0 | RACI | Lập ma trận RACI theo nhóm công việc | RACI | 1h | 25/10, 21:00 |
| M0 | Risk Register | Danh sách rủi ro R1–R20 có owner và biện pháp | Risk Register | 2h | 25/10, 21:00 |
| M4 | Prototype (1/2) | Prototype tương tác form chấm chéo | Prototype form chấm chéo | 2h | 24/10, 21:00 |
| M4 | Prototype (2/2) | Prototype màn hình kết quả, cảnh báo | Prototype (Figma hoặc tương đương) | 2h | 25/10, 21:00 |
| M5 | Test plan (1/2) | Phạm vi, loại test | Test plan phần 1 | 2h | 24/10, 21:00 |
| M5 | Test plan (2/2) | Môi trường, tiêu chí đạt | Test plan bản 1 | 1h | 24/10, 21:00 |

### Thứ 7, 24/10 – Spike & môi trường
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Spike Trello API (3/3) | Ghi giới hạn, rate limit; kết luận dùng được/hạn chế gì, báo M0 nếu có rủi ro | Kết quả spike | 2h | 24/10, 21:00 |
| M5 | Môi trường dev (1/2) | Docker Compose MariaDB | docker-compose.yml | 2h | 24/10, 21:00 |
| M5 | Môi trường dev (2/2) | Hướng dẫn chạy local | README ngắn | 1h | 24/10, 21:00 |

### Chủ nhật, 25/10 – Chốt thiết kế
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Thiết kế `ActivityEvent` (1/2) | Cột, kiểu dữ liệu | Thiết kế cột | 2h | 25/10, 19:00 |
| M1 | Thiết kế `ActivityEvent` (2/2) | Loại sự kiện, khóa ngoài | Thiết kế bảng | 1h | 25/10, 21:00 |
| M0 | Comm Plan | Kênh, tần suất họp, quy tắc phản hồi 24h, báo cáo | Communication Plan | 1h | 25/10, 21:00 |
| M2 | Chính sách dữ liệu | Quy định lưu/xóa dữ liệu | Chính sách dữ liệu | 2h | 25/10, 19:00 |
| M2 | Kịch bản UAT sơ bộ | Kịch bản UAT sơ bộ | Kịch bản UAT nháp | 1h | 25/10, 21:00 |
| M4 | Chốt prototype | Chỉnh theo góp ý, đưa lên Drive | Prototype hoàn chỉnh | 1h | 25/10, 21:00 |

### Thứ 2, 26/10 – Họp chốt API contract (bắt buộc)
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Từng chủ module | Soạn danh sách endpoint | Mỗi người liệt kê đường dẫn, JSON request/response, mã lỗi của module mình trước giờ họp | Danh sách endpoint theo module | 2h | 26/10, 17:00 |
| Cả nhóm | Họp chốt API contract | Rà từng module, thống nhất kiểu dữ liệu dùng chung, bảng dùng chung | Tài liệu API contract | 2h | 26/10, 21:00 |
| M3 | ERD tổng, quy ước CSDL | Hợp nhất ERD sau họp, ghi quy ước đặt tên, kế hoạch dữ liệu mẫu | ERD, quy ước CSDL | 2h | 26/10, 23:00 |
| M5 | CI cơ bản | Pipeline GitHub Actions chạy build/test | Pipeline CI | 2h | 26/10, 23:00 |

### Thứ 3, 27/10 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Chuẩn bị khung dự án | Tạo sẵn khung Spring Boot/Vite để vào code ngày mai | Khung repo | 2h | 27/10, 17:00 |
| M0 | Báo cáo tuần 2 | Tổng hợp tiến độ, cập nhật burndown, Gantt, Risk | Báo cáo tuần | 1h | 27/10, 12:00 |
| Cả nhóm | Sprint Review + Retro | Duyệt tài liệu, nêu điều tốt/chưa tốt, chốt cải tiến | Biên bản họp | 1h | 27/10, 21:00 |
| M0 | Chuẩn bị Sprint 3 | Chọn việc Sprint 3 từ backlog | Sprint 3 backlog | 1h | 27/10, 22:00 |
