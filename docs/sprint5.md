# SPRINT 5 – Chấm chéo, PDF, kiểm thử

**Thời gian:** Thứ 4, 11/11/2026 → Thứ 3, 17/11/2026 | **Tương ứng:** Sprint 3 trong kế hoạch (Tuần 5) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
Hoàn thiện chấm chéo ẩn danh (ngưỡng ≥ 3 lượt), xuất báo cáo PDF, tối ưu dashboard, bảo mật/phân quyền, và chuẩn bị UAT.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 11/11 |
| Daily | Hằng ngày |
| Code freeze tính năng mới (chỉ còn sửa lỗi) | Thứ 2, 16/11 |
| Sprint Review + Retrospective | Thứ 3, 17/11 |

## Phân công công việc (lát cắt dọc)
| Người | Lát cắt dọc | Việc cụ thể | Minh chứng | Deadline |
|---|---|---|---|---|
| M4 | Chấm chéo hoàn thiện | `AnonymityAggregator` (ngưỡng ≥ 3 lượt), kết quả tổng hợp, kiểm tra không lộ danh tính; (có điều kiện) cảnh báo sớm | Commit, kiểm tra ẩn danh | 16/11 |
| M0 | Báo cáo PDF | `report`: tổng hợp đóng góp, điểm chấm chéo, bằng chứng chính; nút xuất | Commit, demo PDF | 16/11 |
| M3 | Đóng góp hoàn thiện | Tối ưu truy vấn, kiểm thử dữ liệu lớn hơn, chỉnh dashboard theo phản hồi | Commit, kết quả đo | 15/11 |
| M1 | Hoàn thiện nền tảng | Bảo mật cơ bản, phân quyền theo vai trò nhóm, sửa lỗi tích hợp | Commit | 15/11 |
| M2 | BA + nhóm | Chuẩn bị UAT: kịch bản, danh sách người thử, phiếu phản hồi | Kịch bản UAT | 16/11 |
| M5 | Kiểm thử | Unit/integration/regression test, defect log, đo hiệu năng PDF | Test results, defect log | 16/11 |
| M0 | Quản lý | Báo cáo tuần, cập nhật Risk, Sprint Review/Retro | Sprint report | 17/11 |

## Tiêu chí hoàn thành (DoD)
- Kiểm tra được rằng với dưới 3 lượt đánh giá thì không hiển thị kết quả, và không suy ra được danh tính người chấm.
- Xuất được PDF có đóng góp, điểm chấm chéo và bằng chứng chính.
- Có kịch bản UAT và danh sách ≥ 10 người thử trước khi sang Sprint 6.
- Defect log cập nhật, mỗi lỗi có người nhận.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Lộ danh tính trong chấm chéo (nhóm ít người) | M4 kiểm thử các trường hợp biên, M5 kiểm tra độc lập |
| PDF chậm hoặc lỗi với dữ liệu lớn | M5 đo hiệu năng, M0 tối ưu |
| Chưa đủ người cho UAT | M2 bắt đầu mời người thử ngay từ đầu sprint |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 6: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 11/11 – Planning
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia việc theo CR đã chốt ở Sprint 4 | Sprint backlog | 1h | 11/11, 21:00 |
| M4 | `AnonymityAggregator` (1/3) | Tổng hợp điểm theo ngưỡng ≥ 3 lượt | Code tổng hợp | 2h | 12/11, 12:00 |
| M4 | `AnonymityAggregator` (2/3) | Không trả kết quả khi chưa đủ lượt, không trả `reviewerId` | Code ẩn kết quả | 2h | 12/11, 17:00 |
| M4 | `AnonymityAggregator` (3/3) | Unit test | Unit test | 1h | 12/11, 21:00 |
| M0 | Dựng `report` (1/2) | Lấy dữ liệu đóng góp từ API của M3 | Khung PDF có dữ liệu đóng góp | 2h | 12/11, 17:00 |
| M0 | Dựng `report` (2/2) | Lấy điểm chấm chéo từ API của M4 | Khung PDF với dữ liệu thật | 2h | 12/11, 21:00 |
| M2 | Kịch bản UAT (1/2) | Viết kịch bản UAT | Kịch bản UAT nháp | 2h | 12/11, 17:00 |
| M2 | Kịch bản UAT (2/2) | Tiêu chí thành công | Kịch bản UAT bản 1 | 1h | 12/11, 21:00 |

### Thứ 5, 12/11 – Tổng hợp & bảo mật
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4 | Màn hình kết quả (1/2) | Màn hình kết quả tổng hợp | Màn hình kết quả | 2h | 13/11, 12:00 |
| M4 | Màn hình kết quả (2/2) | Ẩn kết quả khi thiếu lượt | Màn hình kết quả (ẩn khi thiếu lượt) | 2h | 13/11, 21:00 |
| M1 | Phân quyền (1/3) | Mô hình quyền theo vai trò nhóm (leader, thành viên) | Mô hình quyền | 2h | 13/11, 12:00 |
| M1 | Phân quyền (2/3) | Áp dụng phân quyền vào API | Commit | 2h | 14/11, 12:00 |
| M1 | Phân quyền (3/3) | Test phân quyền | Test | 1h | 14/11, 21:00 |
| M3 | Tối ưu truy vấn (1/2) | Đo thời gian truy vấn dashboard | Kết quả đo trước | 2h | 13/11, 21:00 |
| M3 | Tối ưu truy vấn (2/2) | Thêm index, tối ưu truy vấn, đo lại | Kết quả đo trước/sau | 2h | 14/11, 21:00 |

### Thứ 6, 13/11 – PDF & danh sách người thử
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Nội dung PDF (1/3) | Trình bày phần đóng góp | Trang đóng góp trong PDF | 2h | 14/11, 12:00 |
| M0 | Nội dung PDF (2/3) | Trình bày điểm chấm chéo và bằng chứng chính | Trang chấm chéo, bằng chứng trong PDF | 2h | 15/11, 12:00 |
| M0 | Nội dung PDF (3/3) | Nút xuất PDF | PDF xuất được | 1h | 15/11, 21:00 |
| M2 | Mời người thử UAT | Lập danh sách ≥ 10 người, gửi lời mời | Danh sách người thử | 2h | 14/11, 21:00 |
| M5 | Regression test (1/2) | Chạy test các module đã có | Test results | 2h | 14/11, 17:00 |
| M5 | Regression test (2/2) | Ghi kết quả, ghi defect | Defect log | 1h | 14/11, 21:00 |

### Thứ 7, 14/11 – Kiểm thử ẩn danh & dữ liệu lớn
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4 | Kiểm tra ẩn danh (1/2) | Thử các trường hợp đủ/thiếu lượt | Kết quả kiểm tra phần 1 | 2h | 15/11, 12:00 |
| M4 | Kiểm tra ẩn danh (2/2) | Thử các trường hợp trùng lượt, biên; (có điều kiện) cảnh báo sớm nếu CR giữ | Báo cáo kiểm tra ẩn danh | 2h | 15/11, 21:00 |
| M3 | Dữ liệu lớn (1/2) | Nạp dữ liệu mẫu lớn, đo hiệu năng | Kết quả đo | 2h | 15/11, 12:00 |
| M3 | Dữ liệu lớn (2/2) | Chỉnh dashboard theo phản hồi | Commit | 2h | 15/11, 21:00 |
| M1 | Sửa lỗi tích hợp (1/2) | Sửa lỗi từ defect log liên quan nền tảng | Commit | 2h | 15/11, 17:00 |
| M1 | Sửa lỗi tích hợp (2/2) | Kiểm tra lại sau khi sửa | Commit, defect đã đóng | 1h | 15/11, 21:00 |

### Chủ nhật, 15/11 – Hoàn thiện
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Hoàn thiện PDF (1/2) | Chỉnh bố cục, phông chữ tiếng Việt | PDF bố cục chuẩn | 2h | 15/11, 19:00 |
| M0 | Hoàn thiện PDF (2/2) | Kiểm tra với nhiều nhóm dữ liệu | Demo PDF | 1h | 15/11, 21:00 |
| M5 | Đo hiệu năng PDF | Đo thời gian xuất PDF, ghi lỗi | Kết quả đo, defect log | 2h | 16/11, 12:00 |
| M2 | Phiếu phản hồi | Soạn phiếu phản hồi UAT, thống nhất cách đo mức hài lòng | Phiếu phản hồi | 2h | 16/11, 12:00 |

### Thứ 2, 16/11 – Code freeze
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4, M0, M3, M1 | Mở PR cuối | PR vào `develop`, review chéo trong 24h | PR đã merge | 2h | 16/11, 17:00 |
| M5 | Integration/regression (1/2) | Chạy lại toàn bộ test trên `develop` | Test results | 2h | 16/11, 19:00 |
| M5 | Integration/regression (2/2) | Phân loại lỗi, cập nhật defect log | Defect log | 1h | 16/11, 21:00 |
| M2 | Kịch bản UAT bản cuối | Chốt kịch bản và danh sách người thử | Kịch bản UAT, danh sách | 2h | 16/11, 21:00 |

### Thứ 3, 17/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 5 | Burndown, tiến độ, cập nhật Risk | Sprint report | 1h | 17/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo PDF, chấm chéo ẩn danh, dashboard | Biên bản họp | 1h | 17/11, 21:00 |
| M0 | Chuẩn bị Sprint 6 | Chọn lỗi cần sửa, chia việc UAT | Sprint 6 backlog | 1h | 17/11, 22:00 |
