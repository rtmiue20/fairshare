# SPRINT 6 – UAT, triển khai và viết báo cáo

**Thời gian:** Thứ 4, 18/11/2026 → Thứ 3, 24/11/2026 | **Tương ứng:** Sprint 6 trong kế hoạch 7 sprint (Sprint 4 trong kế hoạch gốc) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Chạy UAT với ≥ 10 người, sửa lỗi theo defect log, khóa phạm vi.
- Triển khai bản demo kèm user guide, tài khoản demo và video dự phòng.
- Vì hạn nộp là 26/11, **viết báo cáo song song**: mỗi người nộp nội dung chương và bản nháp Mini-PM Report trong sprint này; M0 ghép bản 1 trước hết sprint.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 18/11 |
| Daily | Hằng ngày |
| UAT (cửa sổ thử nghiệm) | Thứ 5, 19/11 → Chủ nhật, 22/11 |
| Khóa phạm vi, chỉ sửa lỗi; hạn nộp nội dung chương | Thứ 2, 23/11 |
| Sprint Review + Retrospective | Thứ 3, 24/11 |

## Phân công công việc
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M2 | Tiến hành UAT (≥ 10 người), tổng hợp phản hồi, đo mức hài lòng (G5); viết Chương I, kết quả khảo sát/UAT | Kết quả UAT, nội dung chương | 22/11 (UAT), 23/11 (chương) | ⬜ |
| M5 | Triển khai demo, user guide, tài khoản demo, video dự phòng; ghi defect UAT; viết chương kiểm thử/triển khai | Release, user guide, URL/video, nội dung chương | 23/11 | ⬜ |
| M1 | Sửa lỗi nền tảng/board theo defect log; viết chương kiến trúc, board/card, kết quả kỹ thuật | Commit, nội dung chương | 23/11 | ⬜ |
| M3 | Sửa lỗi đóng góp/dashboard; viết chương ERD, dữ liệu, routine, công thức, kết quả đo | Commit, nội dung chương | 23/11 | ⬜ |
| M4 | Sửa lỗi chấm chéo; viết chương chấm chéo, ẩn danh, giới hạn | Commit, nội dung chương | 23/11 | ⬜ |
| M0 | Khóa phạm vi, theo dõi sửa lỗi; khung báo cáo cuối, đánh giá G1–G6, lessons learned; ghép báo cáo bản 1 | Sprint report, báo cáo bản 1 | 24/11 | ⬜ |
| Cả 6 người | Bản nháp Mini-PM Report | Mini-PM Report nháp | 22/11 | ⬜ |

## Tiêu chí hoàn thành (DoD)
- Có ≥ 10 phiếu phản hồi UAT, đã tổng hợp số liệu mức hài lòng.
- Lỗi nghiêm trọng trong defect log đã đóng hoặc có quyết định chấp nhận rủi ro.
- Bản demo (URL hoặc video) chạy được, có user guide và tài khoản demo.
- Phạm vi đã khóa, mọi thay đổi sau đó phải qua Change Request.
- Đủ 5 file nội dung chương từ M1–M5 và báo cáo ghép bản 1 trước khi sang Sprint 7.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R12: UAT không đủ 10 người | M2 nhắc người thử, có phương án dự phòng là thử trực tiếp |
| Lỗi nặng phát hiện muộn | M5 phân loại ngay, chủ module sửa trong 24 giờ |
| Triển khai demo gặp sự cố | M5 chuẩn bị video demo làm phương án dự phòng |
| Dồn việc viết báo cáo vào ngày cuối | Hạn nộp chương nội bộ 23/11, M0 nhắc từ 19/11 |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 7: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 18/11 – Planning & chuẩn bị UAT
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia lỗi theo module, chốt lịch UAT và viết chương | Sprint backlog | 1h | 18/11, 21:00 |
| M5 | Môi trường UAT (1/2) | Triển khai bản UAT | Môi trường UAT | 2h | 18/11, 21:00 |
| M5 | Môi trường UAT (2/2) | Tạo tài khoản thử, dữ liệu mẫu | Tài khoản thử | 1h | 19/11, 12:00 |
| M2 | Gửi lời mời UAT | Gửi link, hướng dẫn, kịch bản | Danh sách đã gửi | 1h | 18/11, 22:00 |
| M1, M3, M4 | Sửa lỗi ưu tiên cao | Sửa lỗi nghiêm trọng trong defect log | Commit, defect đã đóng | 2h | 19/11, 12:00 |
| M0 | Khung báo cáo cuối | Tạo file báo cáo chung, mục lục, quy định định dạng | File báo cáo khung | 2h | 19/11, 12:00 |

### Thứ 5, 19/11 – Bắt đầu UAT
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Điều phối UAT | Hướng dẫn người thử, thu phiếu theo ngày | Số phiếu thu được | 2h/ngày | Hằng ngày đến 22/11 |
| M5 | Ghi lỗi UAT | Ghi lỗi người thử báo vào defect log, phân loại | Defect log cập nhật | 2h/ngày | Hằng ngày đến 22/11 |
| M0 | Theo dõi tiến độ | Nhắc chủ module xử lý lỗi, cập nhật Risk | Cập nhật Risk | 1h | 19/11, 21:00 |

### Thứ 6, 20/11 – Sửa lỗi lượt 1 & bắt đầu viết chương
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M1, M3, M4 | Sửa lỗi từ UAT | Xử lý lỗi theo module trong 24 giờ, mở PR | PR merge, defect đóng | 2h | 21/11, 12:00 |
| M5 | Demo ổn định | Chuẩn bị URL demo, tài khoản demo | Bản demo chạy được | 2h | 21/11, 12:00 |
| M2 | Chương I (1/2) | Tổng quan, bối cảnh, mục tiêu G1–G6 | Nháp chương I phần 1 | 2h | 21/11, 21:00 |
| M1 | Chương kiến trúc (1/2) | Kiến trúc hệ thống, module `board` | Nháp chương phần 1 | 2h | 21/11, 21:00 |
| M3 | Chương dữ liệu (1/2) | ERD, quy ước CSDL, routine | Nháp chương phần 1 | 2h | 21/11, 21:00 |
| M4 | Chương chấm chéo (1/2) | Cơ chế ẩn danh, ngưỡng tổng hợp | Nháp chương phần 1 | 2h | 21/11, 21:00 |

### Thứ 7, 21/11 – Tài liệu
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M5 | User guide (1/2) | Hướng dẫn cài đặt, chạy bằng Docker Compose | Hướng dẫn cài đặt | 2h | 22/11, 12:00 |
| M5 | User guide (2/2) | Hướng dẫn sử dụng có ảnh chụp có thời gian | User guide | 2h | 22/11, 21:00 |
| M2 | Chương I (2/2) | Kết quả khảo sát, yêu cầu, Use Case | Nháp chương I hoàn chỉnh | 2h | 22/11, 21:00 |
| M1 | Chương kiến trúc (2/2) | Kết quả kỹ thuật, khó khăn, giải pháp | Nháp chương hoàn chỉnh | 2h | 22/11, 21:00 |
| M3 | Chương dữ liệu (2/2) | Công thức đóng góp, kết quả đo | Nháp chương hoàn chỉnh | 2h | 22/11, 21:00 |
| M4 | Chương chấm chéo (2/2) | Kết quả kiểm tra ẩn danh, giới hạn | Nháp chương hoàn chỉnh | 2h | 22/11, 21:00 |

### Chủ nhật, 22/11 – Kết thúc UAT
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Đóng UAT (1/2) | Khóa form, tổng hợp phiếu | Dữ liệu UAT | 2h | 22/11, 17:00 |
| M2 | Đóng UAT (2/2) | Tính mức hài lòng (G5), đưa vào chương | Kết quả UAT | 1h | 22/11, 21:00 |
| M5 | Video demo dự phòng | Quay video demo | Video demo | 2h | 22/11, 21:00 |
| M5 | Chương kiểm thử | Test plan, kết quả test, triển khai | Nháp chương | 2h | 22/11, 21:00 |
| M0 | Đánh giá G1–G6 | Thu số liệu, đối chiếu mục tiêu | Bảng G1–G6 nháp | 2h | 23/11, 12:00 |
| Cả 6 người | Mini-PM Report nháp | Viết theo khung 7 mục, gắn minh chứng module mình | Mini-PM Report nháp | 2h | 22/11, 23:00 |

### Thứ 2, 23/11 – Khóa phạm vi & nộp chương
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Khóa phạm vi | Thông báo chỉ sửa lỗi, thay đổi qua CR | Thông báo khóa phạm vi | 1h | 23/11, 12:00 |
| M1, M3, M4 | Sửa lỗi cuối | Xử lý lỗi UAT còn lại | Commit, defect đóng | 2h | 23/11, 17:00 |
| M5 | Release | Gắn tag release, kiểm tra bản demo cuối | Release, URL/video demo | 2h | 23/11, 21:00 |
| M1–M5 | Nộp nội dung chương | Đưa file chương vào thư mục chung | Nội dung chương | 1h | 23/11, 21:00 |
| M0 | Lessons learned | Tổng hợp từ các Retro | Mục lessons learned | 2h | 23/11, 21:00 |

### Thứ 3, 24/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Ghép báo cáo bản 1 (1/2) | Ghép chương, thống nhất định dạng | Báo cáo bản 1 phần 1 | 2h | 24/11, 17:00 |
| M0 | Ghép báo cáo bản 1 (2/2) | Đánh số hình/bảng, đưa G1–G6 và lessons learned vào | Báo cáo bản 1 | 2h | 24/11, 21:00 |
| M0 | Báo cáo tuần 6 | Burndown, tiến độ, defect còn mở | Sprint report | 1h | 24/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Xem kết quả UAT, demo bản release | Biên bản họp | 1h | 24/11, 21:00 |
| M0 | Chuẩn bị Sprint 7 | Chia việc 2 ngày cuối, nhắc hạn nộp 26/11 | Kế hoạch Sprint 7 | 1h | 24/11, 22:00 |
