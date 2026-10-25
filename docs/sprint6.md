# SPRINT 6 – UAT và triển khai

**Thời gian:** Thứ 4, 18/11/2026 → Thứ 3, 24/11/2026 | **Tương ứng:** Sprint 4 trong kế hoạch (Tuần 6) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
Chạy UAT với ≥ 10 người, sửa lỗi theo defect log, triển khai bản demo kèm hướng dẫn, khóa phạm vi.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 18/11 |
| Daily | Hằng ngày |
| UAT (cửa sổ thử nghiệm) | Thứ 5, 19/11 → Chủ nhật, 22/11 |
| Khóa phạm vi, chỉ sửa lỗi | Thứ 2, 23/11 |
| Sprint Review + Retrospective | Thứ 3, 24/11 |

## Phân công công việc
| Người | Việc | Minh chứng | Deadline |
|---|---|---|---|
| M0 | Khóa phạm vi, theo dõi sửa lỗi, báo cáo sprint | Sprint report | 24/11 |
| M1, M3, M4 | Sửa lỗi trong module của mình theo defect log; (có điều kiện) Google Docs bản đơn giản (M1) | Commit | 23/11 |
| M2 | Tiến hành UAT (≥ 10 người), tổng hợp phản hồi, đo mức hài lòng (G5) | Kết quả UAT | 23/11 |
| M5 | Triển khai bản demo, hướng dẫn cài đặt/sử dụng, tài khoản demo, bằng chứng triển khai | Release, user guide, URL/video demo | 23/11 |

## Tiêu chí hoàn thành (DoD)
- Có ≥ 10 phiếu phản hồi UAT, đã tổng hợp số liệu mức hài lòng.
- Các lỗi mức nghiêm trọng trong defect log đã đóng.
- Bản demo truy cập được (URL hoặc video), có user guide và tài khoản demo.
- Phạm vi đã khóa, mọi thay đổi sau đó phải qua Change Request.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| UAT không đủ 10 người hoặc phản hồi ít | M2 nhắc người thử, có phương án dự phòng là thử trực tiếp |
| Lỗi nặng phát hiện muộn | M5 phân loại ngay, chủ module sửa trong vòng 24 giờ |
| Triển khai demo gặp sự cố | M5 chuẩn bị video demo làm phương án dự phòng |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 7: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. "Hạn" là thời điểm phải đưa minh chứng lên Drive/GitHub và cập nhật task. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 18/11 – Planning & chuẩn bị UAT
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia lỗi theo module, chốt lịch UAT | Sprint backlog | 1h | 18/11, 21:00 |
| M5 | Chuẩn bị môi trường UAT (1/2) | Triển khai bản UAT | Bản UAT chạy được | 2h | 18/11, 21:00 |
| M5 | Chuẩn bị môi trường UAT (2/2) | Tạo tài khoản thử | Tài khoản thử | 1h | 18/11, 22:00 |
| M2 | Gửi lời mời UAT | Gửi link, hướng dẫn, kịch bản cho người thử | Danh sách đã gửi | 1h | 18/11, 22:00 |
| M1, M3, M4 | Sửa lỗi ưu tiên cao (1/2) | Sửa lỗi nghiêm trọng trong defect log | Commit | 2h | 19/11, 12:00 |
| M1, M3, M4 | Sửa lỗi ưu tiên cao (2/2) | Kiểm tra lại, đóng defect | Defect đã đóng | 1h | 19/11, 12:00 |

### Thứ 5, 19/11 – Bắt đầu UAT
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Điều phối UAT (ngày 1/4) | Hướng dẫn người thử, thu phiếu phản hồi | Số phiếu thu được | 2h | 19/11, 21:00 |
| M5 | Theo dõi lỗi UAT (ngày 1/4) | Ghi lỗi người thử báo vào defect log, phân loại | Defect log cập nhật | 2h | 19/11, 21:00 |
| M0 | Theo dõi tiến độ | Nhắc các chủ module xử lý lỗi, cập nhật Risk | Cập nhật Risk | 1h | 19/11, 21:00 |

### Thứ 6, 20/11 – Sửa lỗi lượt 1
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Điều phối UAT (ngày 2/4) | Hướng dẫn người thử, thu phiếu phản hồi | Số phiếu thu được | 2h | 20/11, 21:00 |
| M5 | Theo dõi lỗi UAT (ngày 2/4) | Ghi lỗi người thử báo vào defect log, phân loại | Defect log cập nhật | 2h | 20/11, 21:00 |
| M1, M3, M4 | Sửa lỗi từ UAT (1/2) | Xử lý lỗi theo module trong 24 giờ, mở PR | PR merge | 2h | 20/11, 21:00 |
| M1, M3, M4 | Sửa lỗi từ UAT (2/2) | Kiểm tra lại, đóng defect | Defect đóng | 1h | 21/11, 21:00 |
| M5 | Triển khai demo (1/2) | Cấu hình URL bản demo | URL bản demo | 2h | 21/11, 21:00 |
| M5 | Triển khai demo (2/2) | Tạo tài khoản demo, kiểm tra bản demo ổn định | Bản demo chạy được | 2h | 22/11, 21:00 |

### Thứ 7, 21/11 – Tài liệu
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Điều phối UAT (ngày 3/4) | Hướng dẫn người thử, thu phiếu phản hồi | Số phiếu thu được | 2h | 21/11, 21:00 |
| M5 | Theo dõi lỗi UAT (ngày 3/4) | Ghi lỗi người thử báo vào defect log, phân loại | Defect log cập nhật | 2h | 21/11, 21:00 |
| M5 | User guide (1/2) | Hướng dẫn cài đặt | Hướng dẫn cài đặt | 2h | 22/11, 12:00 |
| M5 | User guide (2/2) | Hướng dẫn sử dụng có ảnh chụp màn hình | User guide | 2h | 22/11, 21:00 |
| M1 | (Có điều kiện) Google Docs (1/2) | Bản đơn giản nếu CR cho phép, nếu không bỏ qua | Commit hoặc ghi chú bỏ | 2h | 22/11, 12:00 |
| M1 | (Có điều kiện) Google Docs (2/2) | Test và hoàn thiện bản đơn giản | Commit hoặc ghi chú bỏ | 2h | 22/11, 21:00 |

### Chủ nhật, 22/11 – Kết thúc UAT
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Điều phối UAT (ngày 4/4) | Hướng dẫn người thử, thu nốt phiếu phản hồi | Số phiếu thu được | 2h | 22/11, 17:00 |
| M5 | Theo dõi lỗi UAT (ngày 4/4) | Ghi lỗi người thử báo vào defect log, phân loại | Defect log cập nhật | 2h | 22/11, 17:00 |
| M2 | Đóng UAT (1/2) | Khóa form, tổng hợp phiếu | Bảng tổng hợp phiếu | 2h | 22/11, 20:00 |
| M2 | Đóng UAT (2/2) | Tính mức hài lòng (G5) | Kết quả UAT | 1h | 22/11, 21:00 |
| M5 | Video demo | Quay video demo dự phòng | Video demo | 2h | 22/11, 21:00 |

### Thứ 2, 23/11 – Khóa phạm vi
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Khóa phạm vi | Thông báo chỉ sửa lỗi, mọi thay đổi qua CR | Thông báo khóa phạm vi | 1h | 23/11, 12:00 |
| M1, M3, M4 | Sửa lỗi cuối (1/2) | Xử lý lỗi UAT còn lại | Commit | 2h | 23/11, 17:00 |
| M1, M3, M4 | Sửa lỗi cuối (2/2) | Kiểm tra lại, đóng defect | Defect đóng | 1h | 23/11, 21:00 |
| M5 | Release | Gắn tag release, kiểm tra bản demo cuối | Release, URL/video demo | 2h | 23/11, 21:00 |

### Thứ 3, 24/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 6 | Burndown, tiến độ, defect còn mở | Sprint report | 1h | 24/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Xem kết quả UAT, demo bản release | Biên bản họp | 1h | 24/11, 21:00 |
| M0 | Chuẩn bị Sprint 7 | Phân công viết chương, thống nhất khung báo cáo | Khung báo cáo cuối | 1h | 24/11, 22:00 |
