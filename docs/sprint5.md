# SPRINT 5 – Bảng đóng góp

**Thời gian:** Thứ 4, 04/11/2026 → Thứ 3, 10/11/2026 | **Tương ứng:** Sprint 2 trong kế hoạch gốc (Tuần 5) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
Hoàn thành bảng đóng góp có truy vết đến sự kiện gốc và dashboard; Trello đồng bộ ổn định; form chấm chéo và API đợt chấm; có staging và defect log đầu tiên; quyết định các tính năng có điều kiện.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 04/11 |
| Daily | Hằng ngày |
| Họp quyết định tính năng có điều kiện (CR) | Thứ 2, 09/11 |
| Sprint Review + Retrospective | Thứ 3, 10/11 |

## Phân công công việc (lát cắt dọc)
| Người | Lát cắt dọc | Việc cụ thể | Minh chứng | Deadline |
|---|---|---|---|---|
| M3 | Đóng góp & Dashboard | API tổng hợp đóng góp, truy vết đến sự kiện gốc; dashboard biểu đồ, bảng bằng chứng, bộ lọc theo sprint/người; khai báo thủ công có xác nhận | Commit, API doc, demo | 09/11 |
| M1 | Trello hoàn thiện | Đồng bộ định kỳ/thủ công, xử lý lỗi và rate limit, mã hóa token | Commit, test | 08/11 |
| M2 | Nhóm hoàn thiện + BA | Hoàn thiện quản lý thành viên/sprint; kiểm tra công thức với dữ liệu thật của nhóm (có đồng ý), thu thập phản hồi | Báo cáo kiểm tra công thức | 09/11 |
| M4 | Chấm chéo | API mở/đóng đợt, nhận đánh giá; form chấm chéo | Commit, demo | 09/11 |
| M5 | Tích hợp | Test tích hợp các module, ghi defect, môi trường staging | Integration log, defect log | 09/11 |
| M0 | Quản lý | Cập nhật Gantt thực tế, **quyết định tính năng có điều kiện** (CR), báo cáo tuần | Sprint report, CR | 10/11 |

## Tiêu chí hoàn thành (DoD)
- Dashboard hiển thị đóng góp theo sprint/người, bấm vào được bằng chứng gốc.
- Form chấm chéo gửi được đánh giá và lưu vào DB.
- Staging chạy được, defect log có mục đầu tiên và người xử lý.
- Quyết định về Google Docs, cảnh báo sớm được ghi vào Change Log.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Rate limit / lỗi API Trello | M1 xử lý thử lại, đồng bộ thủ công làm phương án dự phòng |
| Công thức cho kết quả thiếu công bằng với dữ liệu thật | M2 + M3 chỉnh và ghi vào báo cáo kiểm tra công thức |
| Tính năng có điều kiện kéo dài tiến độ | M0 quyết định cắt tại họp CR 09/11 |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 6: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task.

### Thứ 4, 04/11 – Planning
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Rà việc tồn đọng Sprint 4, chia việc Sprint 5 | Sprint backlog | 1h | 04/11, 21:00 |
| M3 | API tổng hợp | API tổng hợp đóng góp theo người/sprint | Endpoint + test | 4h | 05/11, 21:00 |
| M1 | Đồng bộ định kỳ | Scheduler đồng bộ định kỳ và nút đồng bộ thủ công | Code đồng bộ | 4h | 05/11, 21:00 |
| M4 | API đợt chấm | API mở/đóng đợt chấm chéo | Endpoint + validation | 4h | 05/11, 21:00 |

### Thứ 5, 05/11 – API & truy vết
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Truy vết | Từ điểm đóng góp truy được tới `ActivityEvent` gốc | API truy vết | 4h | 06/11, 21:00 |
| M1 | Rate limit, lỗi | Thử lại khi lỗi, xử lý rate limit, ghi log | Code + test | 4h | 07/11, 21:00 |
| M2 | Hoàn thiện thành viên | Xóa/đổi vai trò thành viên, quản lý sprint | Endpoint + màn hình | 4h | 07/11, 21:00 |

### Thứ 6, 06/11 – Dashboard
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Dashboard | Biểu đồ đóng góp, bộ lọc sprint/người | Màn hình dashboard | 5h | 08/11, 21:00 |
| M4 | Form chấm chéo | Màn hình nhập điểm theo tiêu chí, kiểm tra hợp lệ | Màn hình form | 5h | 08/11, 21:00 |
| M5 | Môi trường staging | Triển khai staging bằng Docker Compose | Staging chạy được | 4h | 07/11, 21:00 |

### Thứ 7, 07/11 – Bảo mật & kiểm tra công thức
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Mã hóa token | Mã hóa token lưu trong DB | Commit + test | 3h | 07/11, 21:00 |
| M2 | Kiểm tra công thức | Chạy công thức với dữ liệu thật của nhóm (đã có đồng ý), so với cảm nhận của thành viên | Bản nháp báo cáo kiểm tra | 3h | 08/11, 21:00 |
| M5 | Test tích hợp | Test các module đã merge, ghi defect | Integration log, defect log | 3h | 08/11, 21:00 |

### Chủ nhật, 08/11 – Bảng bằng chứng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Bảng bằng chứng, khai báo thủ công | Bảng sự kiện gốc, form khai báo thủ công có xác nhận | Màn hình bằng chứng, form khai báo | 5h | 09/11, 17:00 |
| M1 | Hoàn thiện Trello | Test lại đồng bộ, sửa lỗi, đóng task | Commit + test | 2h | 08/11, 21:00 |
| M2 | Thu phản hồi | Thu phản hồi của thành viên về công thức | Bản nháp phản hồi | 2h | 09/11, 12:00 |

### Thứ 2, 09/11 – Chốt tính năng có điều kiện
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Báo cáo kiểm tra công thức | Hoàn thiện báo cáo, đề xuất chỉnh công thức | Báo cáo kiểm tra công thức | 2h | 09/11, 17:00 |
| M4 | Hoàn tất chấm chéo | Demo form + API, PR vào `develop` | PR merge, demo | 2h | 09/11, 17:00 |
| M5 | Defect log | Phân loại lỗi, giao người xử lý | Defect log | 2h | 09/11, 17:00 |
| Cả nhóm | Họp CR | Quyết định Google Docs, cảnh báo sớm: giữ hay cắt | Change Request, Change Log | 1h | 09/11, 21:00 |

### Thứ 3, 10/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Cập nhật Gantt, báo cáo tuần 5 | Gantt thực tế, burndown, Risk | Sprint report, Gantt cập nhật | 2h | 10/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo dashboard, form chấm chéo, staging | Biên bản họp | 1h | 10/11, 21:00 |
| M0 | Chuẩn bị Sprint 6 | Chọn việc Sprint 6, tính theo CR vừa chốt | Sprint 6 backlog | 1h | 10/11, 22:00 |
