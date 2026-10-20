# SPRINT 1 – Khởi động & Phân tích nghiệp vụ

**Thời gian:** Thứ 4, 14/10/2026 → Thứ 3, 20/10/2026 | **Tương ứng:** Tuần 1 (gộp Tuần 1 và Tuần 2 cũ) | **Trạng thái sprint:** ✅ Hoàn thành

## Mục tiêu sprint
Khởi động dự án (Project Charter, Team Charter, công cụ quản lý), chốt yêu cầu và phạm vi MVP, có WBS/backlog, bản nháp công thức đóng góp, wireframe sơ bộ và khung test plan.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Họp kick-off | Thứ 4, 14/10 |
| Sprint Planning | Thứ 4, 14/10 |
| Daily (15 phút, chat/họp nhanh) | Hằng ngày |
| Sprint Review + Retrospective | Thứ 3, 20/10 |

## Phân công công việc
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M0 | Họp kick-off, tạo Trello và thư mục Drive minh chứng, Project Charter, Team Charter | Charter, Team Charter, task board, thư mục Drive | 16/10 | ✅ |
| M1 | Tạo repository GitHub, quy ước nhánh/commit, README | Repo, README | 15/10 | ✅ |
| M2 | Stakeholder sơ bộ; chạy khảo sát (Google Form), tổng hợp yêu cầu chức năng/phi chức năng, Use Case, BPMN, xác định MVP | Stakeholder Register sơ bộ, Requirement list, Use Case, BPMN, báo cáo khảo sát | 19/10 | ✅ |
| M2 + M3 | Bản nháp công thức đóng góp và tiêu chí chấm chéo | Công thức v0.1 | 19/10 | ✅ |
| M0 | Scope Statement, WBS, backlog (ước lượng story point cùng nhóm) | Scope, WBS, backlog | 17/10 | ✅ |
| M1 | Ước lượng kỹ thuật, đọc tài liệu Trello API | Ghi chú kỹ thuật | 18/10 | ✅ |
| M3 | Tìm hiểu cấu trúc dữ liệu Trello; hỗ trợ công thức v0.1, rà soát cấu trúc dữ liệu cần lưu | Ghi chú tìm hiểu, ghi chú dữ liệu | 19/10 | ✅ |
| M4 | Wireframe sơ bộ form chấm chéo và màn hình kết quả | Wireframe v0.1 | 19/10 | ✅ |
| M5 | Chiến lược kiểm thử, tiêu chí chấp nhận; chọn môi trường triển khai, mẫu biên bản họp | Khung test plan, mẫu biên bản | 19/10 | ✅ |
| M0 | Báo cáo tuần 1, họp Sprint Review/Retro, chuẩn bị Sprint 2 | Báo cáo tuần, biên bản | 20/10 | ✅ |

## Tiêu chí hoàn thành (DoD)
- Project Charter, Team Charter, task board Trello và repository GitHub đã có, cả nhóm đồng ý.
- Scope, WBS, backlog được cả nhóm đồng ý.
- Yêu cầu có Use Case/BPMN, MVP rõ ràng.
- Công thức v0.1 và wireframe v0.1 có file minh chứng trên Drive.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Phạm vi phình to | M0 khóa MVP, tính năng thêm đưa vào danh sách "có điều kiện" |
| Công thức đóng góp chưa thống nhất | Chốt bản v0.1, chỉnh tiếp ở Sprint 3–4 |
| Sprint gộp hai tuần việc nên khối lượng cao hơn bình thường | M0 theo dõi workload hằng ngày, việc nào trễ báo ngay trong Daily |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 2: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 14/10 – Kick-off, Planning & khởi động
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Họp kick-off | Chốt đề tài FairShare, vai trò từng người, kênh liên lạc | Biên bản kick-off | 1h | 14/10, 20:00 |
| M0 | Tạo công cụ quản lý | Tạo Trello board và thư mục Drive minh chứng | Task board, thư mục Drive | 1h | 14/10, 20:00 |
| Cả nhóm | Sprint Planning | Rà backlog, chọn việc Sprint 1, chia người, thống nhất DoD | Sprint backlog trên Trello | 1h | 14/10, 21:00 |
| M2 | Soạn khảo sát | Viết câu hỏi Google Form (nhu cầu đo đóng góp, vấn đề hiện tại của nhóm, quan ngại riêng tư) | Link Google Form | 2h | 14/10, 23:00 |
| M0 | Bắt đầu Scope | Liệt kê trong phạm vi/ngoài phạm vi, giả định, ràng buộc | Bản nháp Scope Statement | 2h | 15/10, 21:00 |

### Thứ 5, 15/10 – Charter, repository & thu thập yêu cầu
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Phát khảo sát | Gửi form cho bạn học/nhóm khác, theo dõi số phản hồi | Số phản hồi ban đầu | 1h | 15/10, 12:00 |
| M0 | Project Charter (1/2) | Vấn đề, bối cảnh, mục tiêu SMART, phạm vi sơ bộ | Charter nháp (các mục 1–8) | 2h | 15/10, 21:00 |
| M0 | Project Charter (2/2) | Stakeholder chính, giả định, rủi ro cấp cao, ràng buộc, xác nhận các bên | Project Charter v1.0 | 1h | 16/10, 12:00 |
| M1 | Tạo repository | Tạo repo GitHub, quy ước nhánh/commit, README | Repo, README | 2h | 15/10, 21:00 |
| M2 | Stakeholder sơ bộ | Liệt kê bên liên quan, mức ảnh hưởng/quan tâm | Stakeholder Register sơ bộ | 2h | 15/10, 21:00 |
| M1 | Đọc Trello API (1/2) | Đọc tài liệu board/card/member, xác định dữ liệu lấy được | Ghi chú kỹ thuật bản nháp | 2h | 15/10, 21:00 |
| M4 | Khảo sát giao diện | Xem form chấm chéo/360 tham khảo, phác ý tưởng màn hình | Ảnh chụp tham khảo, phác tay | 2h | 15/10, 21:00 |
| M5 | Test strategy | Xác định loại test, công cụ, mức độ ưu tiên | Khung test plan bản nháp | 2h | 15/10, 21:00 |

### Thứ 6, 16/10 – Team Charter, WBS & backlog
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Team Charter | Thống nhất quy tắc làm việc, kênh liên lạc, cách giải quyết xung đột | Team Charter | 1h | 16/10, 21:00 |
| M0 | WBS (1/2) | Phân rã theo phân hệ WP0–WP2 đến gói việc nhỏ (≤ 2 giờ) | WBS phần WP0–WP2 | 2h | 16/10, 19:00 |
| M0 | WBS (2/2) | Phân rã WP3–WP5, rà lại giới hạn 2 giờ/task | WBS hoàn chỉnh | 1h | 16/10, 21:00 |
| Cả nhóm | Ước lượng story point | Họp ngắn ước lượng bằng Planning Poker | Backlog có điểm | 1h | 16/10, 22:00 |
| M2 | Bắt đầu viết yêu cầu | Tổng hợp phản hồi khảo sát lần 1, nháp yêu cầu chức năng | Nháp requirement list | 2h | 16/10, 21:00 |
| M1 | Đọc Trello API (2/2) | Đọc phần action/webhook, giới hạn rate limit | Ghi chú kỹ thuật bản nháp | 1h | 16/10, 21:00 |
| M3 | Cấu trúc dữ liệu Trello | Tìm hiểu cấu trúc board, card, member, action | Ghi chú tìm hiểu | 2h | 16/10, 21:00 |
| M5 | Môi trường & biên bản | Chọn môi trường triển khai, soạn mẫu biên bản họp | Ghi chú môi trường, mẫu biên bản | 1h | 16/10, 21:00 |

### Thứ 7, 17/10 – Chốt Scope
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Hoàn thiện Scope, backlog | Chốt MVP, danh sách tính năng có điều kiện, đưa lên Drive | Scope Statement, backlog | 2h | 17/10, 21:00 |
| M2 | Đóng khảo sát | Khóa form, xuất kết quả, thống kê sơ bộ | Dữ liệu khảo sát | 1h | 17/10, 21:00 |

### Chủ nhật, 18/10 – Yêu cầu & kỹ thuật
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Use Case | Vẽ Use Case luồng đo đóng góp và chấm chéo | Use Case | 2h | 18/10, 19:00 |
| M2 | BPMN | Vẽ BPMN luồng đo đóng góp và chấm chéo | BPMN | 2h | 18/10, 21:00 |
| M1 | Ước lượng kỹ thuật | Ước lượng công, rủi ro tích hợp, giới hạn API | Ghi chú kỹ thuật hoàn chỉnh | 2h | 18/10, 21:00 |

### Thứ 2, 19/10 – Công thức, wireframe, test
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 + M3 | Công thức v0.1 (1/2) | Định nghĩa loại sự kiện, trọng số | Bảng loại sự kiện, trọng số | 2h | 19/10, 17:00 |
| M2 + M3 | Công thức v0.1 (2/2) | Cách tính điểm, tiêu chí chấm chéo | Công thức v0.1 | 1h | 19/10, 20:00 |
| M2 | Hoàn thiện yêu cầu | Chốt requirement list và báo cáo khảo sát | Requirement list, báo cáo khảo sát | 2h | 19/10, 20:00 |
| M4 | Wireframe (1/2) | Vẽ wireframe form chấm chéo | Wireframe form chấm chéo | 2h | 19/10, 17:00 |
| M4 | Wireframe (2/2) | Vẽ wireframe màn hình kết quả | Wireframe v0.1 | 1h | 19/10, 20:00 |
| M5 | Test plan khung | Viết khung test plan, tiêu chí chấp nhận | Khung test plan | 2h | 19/10, 20:00 |
| M3 | Rà dữ liệu | Liệt kê dữ liệu cần lưu cho công thức | Ghi chú dữ liệu | 1h | 19/10, 20:00 |

### Thứ 3, 20/10 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 1 | Tổng hợp tiến độ, cập nhật burndown | Báo cáo tuần | 1h | 20/10, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo sản phẩm tài liệu, nêu điều tốt/chưa tốt, chọn cải tiến | Biên bản họp | 1h | 20/10, 21:00 |
| M0 | Chuẩn bị Sprint 2 | Chọn việc Sprint 2 từ backlog | Sprint 2 backlog | 1h | 20/10, 22:00 |
