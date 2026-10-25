# SPRINT 4 – Bảng đóng góp

**Thời gian:** Thứ 4, 04/11/2026 → Thứ 3, 10/11/2026 | **Tương ứng:** Sprint 2 trong kế hoạch (Tuần 4) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

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
- Việc tồn đọng chuyển sang Sprint 5: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 04/11 – Planning
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Rà việc tồn đọng Sprint 3, chia việc Sprint 4 | Sprint backlog | 1h | 04/11, 21:00 |
| M3 | API tổng hợp (1/2) | API tổng hợp đóng góp theo người | Endpoint + test | 2h | 05/11, 12:00 |
| M3 | API tổng hợp (2/2) | API tổng hợp đóng góp theo sprint | Endpoint + test | 2h | 05/11, 21:00 |
| M1 | Đồng bộ định kỳ (1/2) | Scheduler đồng bộ định kỳ | Code scheduler | 2h | 05/11, 12:00 |
| M1 | Đồng bộ định kỳ (2/2) | Nút đồng bộ thủ công | Code đồng bộ thủ công | 2h | 05/11, 21:00 |
| M4 | API đợt chấm (1/2) | API mở đợt chấm chéo | Endpoint + validation | 2h | 05/11, 12:00 |
| M4 | API đợt chấm (2/2) | API đóng đợt chấm chéo | Endpoint + validation | 2h | 05/11, 21:00 |

### Thứ 5, 05/11 – API & truy vết
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Truy vết (1/2) | Truy vấn từ điểm đóng góp tới `ActivityEvent` gốc | Truy vấn truy vết | 2h | 06/11, 12:00 |
| M3 | Truy vết (2/2) | API truy vết và test | API truy vết | 2h | 06/11, 21:00 |
| M1 | Rate limit, lỗi (1/2) | Thử lại khi lỗi | Code + test | 2h | 06/11, 21:00 |
| M1 | Rate limit, lỗi (2/2) | Xử lý rate limit, ghi log | Code + test | 2h | 07/11, 21:00 |
| M2 | Hoàn thiện thành viên (1/2) | API xóa/đổi vai trò thành viên | Endpoint | 2h | 06/11, 21:00 |
| M2 | Hoàn thiện thành viên (2/2) | Quản lý sprint, màn hình tương ứng | Endpoint + màn hình | 2h | 07/11, 21:00 |

### Thứ 6, 06/11 – Dashboard
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Dashboard (1/3) | Biểu đồ đóng góp | Biểu đồ đóng góp | 2h | 07/11, 12:00 |
| M3 | Dashboard (2/3) | Bộ lọc sprint/người | Bộ lọc | 2h | 08/11, 12:00 |
| M3 | Dashboard (3/3) | Nối màn hình với API tổng hợp | Màn hình dashboard | 1h | 08/11, 21:00 |
| M4 | Form chấm chéo (1/3) | Màn hình nhập điểm theo tiêu chí | Màn hình nhập điểm | 2h | 07/11, 12:00 |
| M4 | Form chấm chéo (2/3) | Kiểm tra hợp lệ dữ liệu nhập | Validation form | 2h | 08/11, 12:00 |
| M4 | Form chấm chéo (3/3) | Nối form với API đợt chấm | Màn hình form | 1h | 08/11, 21:00 |
| M5 | Môi trường staging (1/2) | Docker Compose cho staging | docker-compose staging | 2h | 07/11, 12:00 |
| M5 | Môi trường staging (2/2) | Triển khai và kiểm tra chạy được | Staging chạy được | 2h | 07/11, 21:00 |

### Thứ 7, 07/11 – Bảo mật & kiểm tra công thức
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1 | Mã hóa token (1/2) | Mã hóa token lưu trong DB | Commit | 2h | 07/11, 21:00 |
| M1 | Mã hóa token (2/2) | Test mã hóa/giải mã | Test | 1h | 07/11, 21:00 |
| M2 | Kiểm tra công thức (1/2) | Chạy công thức với dữ liệu thật của nhóm (đã có đồng ý) | Kết quả chạy công thức | 2h | 08/11, 15:00 |
| M2 | Kiểm tra công thức (2/2) | So với cảm nhận của thành viên | Bản nháp báo cáo kiểm tra | 1h | 08/11, 21:00 |
| M5 | Test tích hợp (1/2) | Test các module đã merge | Integration log | 2h | 08/11, 17:00 |
| M5 | Test tích hợp (2/2) | Ghi defect | Defect log | 1h | 08/11, 21:00 |

### Chủ nhật, 08/11 – Bảng bằng chứng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Bảng bằng chứng, khai báo thủ công (1/3) | Bảng sự kiện gốc | Màn hình bằng chứng | 2h | 09/11, 12:00 |
| M3 | Bảng bằng chứng, khai báo thủ công (2/3) | Form khai báo đóng góp thủ công | Form khai báo | 2h | 09/11, 15:00 |
| M3 | Bảng bằng chứng, khai báo thủ công (3/3) | Luồng xác nhận của người khác | Luồng xác nhận | 1h | 09/11, 17:00 |
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
| M0 | Cập nhật Gantt, báo cáo tuần 4 | Gantt thực tế, burndown, Risk | Sprint report, Gantt cập nhật | 2h | 10/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo dashboard, form chấm chéo, staging | Biên bản họp | 1h | 10/11, 21:00 |
| M0 | Chuẩn bị Sprint 5 | Chọn việc Sprint 5, tính theo CR vừa chốt | Sprint 5 backlog | 1h | 10/11, 22:00 |
