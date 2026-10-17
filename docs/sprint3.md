# SPRINT 3 – Lập kế hoạch & thiết kế

**Thời gian:** Thứ 4, 21/10/2026 → Thứ 3, 27/10/2026 | **Tương ứng:** Tuần 3 | **Trạng thái sprint:** ⬜ Chưa bắt đầu

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
| M2 | Mẫu consent, chính sách dữ liệu, kịch bản UAT | Consent form, chính sách dữ liệu | 25/10 | ⬜ |
| M4 | Prototype tương tác cho module chấm chéo và cảnh báo | Prototype | 25/10 | ⬜ |
| M5 | Test plan hoàn chỉnh, môi trường dev, CI cơ bản, Docker Compose MariaDB | Test plan, pipeline CI | 26/10 | ⬜ |
| **Cả nhóm** | **Chốt hợp đồng API và bảng dùng chung** giữa các module | Tài liệu API contract | **26/10** | ⬜ |
| M0 | Báo cáo tuần 3, Sprint Review/Retro, chuẩn bị Sprint 4 | Báo cáo tuần, biên bản | 27/10 | ⬜ |

## Chuẩn bị cho Sprint 4 (làm trong sprint này)
- M1 chuẩn bị sẵn khung dự án Spring Boot/Vite để vào code ngay Sprint 4.
- Mỗi chủ module đọc API contract và liệt kê endpoint mình sở hữu.
- Thống nhất quy ước Git và Flyway (số phiên bản theo ngày giờ, ví dụ `V202610281530__create_teams.sql`).

## Tiêu chí hoàn thành (DoD)
- API contract có danh sách đường dẫn, JSON request/response, mã lỗi cho từng module, đã đưa lên Swagger hoặc tài liệu chung.
- ERD tổng và bảng `ActivityEvent` đã được cả nhóm xem.
- CI chạy được với repo trống, Docker Compose MariaDB chạy trên máy các thành viên.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R16: module phía dưới chờ nền tảng của M1 | M1 lên kế hoạch giao khung xác thực trong 2–3 ngày đầu Sprint 4 |
| Spike Trello API cho thấy giới hạn lớn | M1 báo M0 ngay, đưa Change Request nếu phải đổi phạm vi |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 4: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task.

### Thứ 4, 21/10 – Planning & bắt đầu thiết kế
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chọn việc Sprint 3, chốt cách làm API contract | Sprint backlog | 1h | 21/10, 21:00 |
| M0 | Gantt | Dựng Gantt 8 sprint từ WBS | Gantt bản nháp | 3h | 22/10, 21:00 |
| M1 | Kiến trúc | Vẽ sơ đồ kiến trúc (Spring Boot, MariaDB, React, dịch vụ ngoài) | Sơ đồ kiến trúc nháp | 3h | 22/10, 21:00 |

### Thứ 5, 22/10 – Spike & dữ liệu
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Spike Trello API | Gọi thử API lấy board/card/member/action, ghi giới hạn, rate limit | Code spike, ghi chú kết quả | 4h | 24/10, 21:00 |
| M3 | ERD nháp | Thu thập bảng từ các module, vẽ ERD bản đầu | ERD nháp | 3h | 23/10, 21:00 |
| M2 | Consent | Soạn mẫu consent, nêu rõ dữ liệu thu thập, mục đích, quyền rút lại | Consent form nháp | 2h | 23/10, 21:00 |

### Thứ 6, 23/10 – Tài liệu quản lý & prototype
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | RACI, Risk Register | Lập RACI, danh sách rủi ro R1–R20 có owner và biện pháp | RACI, Risk Register | 3h | 25/10, 21:00 |
| M4 | Prototype | Làm prototype tương tác form chấm chéo, kết quả, cảnh báo | Prototype (Figma hoặc tương đương) | 4h | 25/10, 21:00 |
| M5 | Test plan | Viết test plan hoàn chỉnh (phạm vi, loại test, môi trường, tiêu chí đạt) | Test plan bản 1 | 3h | 24/10, 21:00 |

### Thứ 7, 24/10 – Spike & môi trường
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Hoàn thành spike | Ghi kết luận: dùng được/hạn chế gì, báo M0 nếu có rủi ro | Kết quả spike | 2h | 24/10, 21:00 |
| M5 | Môi trường dev | Docker Compose MariaDB, hướng dẫn chạy local | docker-compose.yml, README ngắn | 3h | 24/10, 21:00 |

### Chủ nhật, 25/10 – Chốt thiết kế
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Thiết kế `ActivityEvent` | Cột, kiểu dữ liệu, loại sự kiện, khóa ngoài | Thiết kế bảng | 3h | 25/10, 21:00 |
| M0 | Comm Plan | Kênh, tần suất họp, quy tắc phản hồi 24h, báo cáo | Communication Plan | 1h | 25/10, 21:00 |
| M2 | Chính sách dữ liệu, kịch bản UAT | Quy định lưu/xóa dữ liệu, kịch bản UAT sơ bộ | Chính sách dữ liệu, kịch bản UAT nháp | 3h | 25/10, 21:00 |
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
| M0 | Báo cáo tuần 3 | Tổng hợp tiến độ, cập nhật burndown, Gantt, Risk | Báo cáo tuần | 1h | 27/10, 12:00 |
| Cả nhóm | Sprint Review + Retro | Duyệt tài liệu, nêu điều tốt/chưa tốt, chốt cải tiến | Biên bản họp | 1h | 27/10, 21:00 |
