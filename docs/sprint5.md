# SPRINT 5 – Chấm chéo ẩn danh, báo cáo PDF và kiểm thử

**Thời gian:** Thứ 4, 11/11/2026 → Thứ 3, 17/11/2026 | **Tương ứng:** Sprint 5 trong kế hoạch 7 sprint (Sprint 3 trong kế hoạch gốc) | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Hoàn thiện chấm chéo ẩn danh (chỉ trả kết quả khi đủ ≥ 3 lượt), kiểm tra không lộ danh tính.
- Xuất báo cáo PDF gồm đóng góp, điểm chấm chéo, bằng chứng chính.
- Phân quyền theo vai trò nhóm, tối ưu truy vấn/routine, kiểm thử hồi quy.
- Chuẩn bị UAT (kịch bản, danh sách ≥ 10 người thử, phiếu phản hồi). Code freeze 16/11.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 11/11 |
| Daily | Hằng ngày |
| Code freeze tính năng mới (chỉ còn sửa lỗi) | Thứ 2, 16/11, 17:00 |
| Sprint Review + Retrospective | Thứ 3, 17/11 |

## Phân công công việc (lát cắt dọc)
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M4 | Chấm chéo hoàn thiện: `AnonymityAggregator` (ngưỡng ≥ 3 lượt, kiểm tra ngay trong routine), màn hình kết quả, kiểm tra không lộ danh tính; (có điều kiện theo CR 09/11) cảnh báo sớm rule-based | Commit, báo cáo kiểm tra ẩn danh | 16/11 | ⬜ |
| M0 | Báo cáo PDF: `report` tổng hợp đóng góp, điểm chấm chéo, bằng chứng chính; nút xuất | Commit, demo PDF | 16/11 | ⬜ |
| M3 | Đóng góp hoàn thiện: tối ưu routine/truy vấn, kiểm thử dữ liệu lớn, chỉnh dashboard theo phản hồi | Commit, kết quả đo trước/sau | 15/11 | ⬜ |
| M1 | Hoàn thiện nền tảng: bảo mật cơ bản, phân quyền theo vai trò nhóm, sửa lỗi board/tích hợp | Commit, test phân quyền | 15/11 | ⬜ |
| M2 | BA + nhóm: kịch bản UAT, danh sách ≥ 10 người thử, phiếu phản hồi | Kịch bản UAT, danh sách, phiếu | 16/11 | ⬜ |
| M5 | Kiểm thử: unit/integration/regression, defect log, đo hiệu năng PDF | Test results, defect log | 16/11 | ⬜ |
| M0 | Báo cáo tuần 5, cập nhật Risk, Sprint Review/Retro | Sprint report | 17/11 | ⬜ |

## Tiêu chí hoàn thành (DoD)
- Với dưới 3 lượt đánh giá thì không hiển thị kết quả, và không suy ra được danh tính người chấm.
- Xuất được PDF có đóng góp, điểm chấm chéo và bằng chứng chính; thời gian xuất đo được so với mục tiêu G4 (< 10 giây).
- Phân quyền leader/thành viên đúng, có test.
- Có kịch bản UAT và ≥ 10 người thử trước khi sang Sprint 6; defect log cập nhật, mỗi lỗi có người nhận.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R04: lộ danh tính trong chấm chéo (nhóm ít người) | M4 kiểm thử trường hợp biên, M5 kiểm tra độc lập |
| PDF chậm hoặc lỗi font tiếng Việt | M5 đo hiệu năng, M0 tối ưu và thử nhiều bộ dữ liệu |
| R12: chưa đủ người cho UAT | M2 mời ngay từ đầu sprint |
| Còn ít thời gian sau code freeze | Chỉ nhận sửa lỗi sau 16/11, mọi thay đổi qua CR |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 6: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 11/11 – Planning
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia việc theo CR đã chốt ở Sprint 4 | Sprint backlog | 1h | 11/11, 21:00 |
| M4 | `AnonymityAggregator` (1/2) | Routine tổng hợp, chỉ trả kết quả khi ≥ 3 lượt | Migration chứa routine | 2h | 12/11, 12:00 |
| M4 | `AnonymityAggregator` (2/2) | Service gọi routine, unit test | Code + test | 2h | 12/11, 21:00 |
| M0 | PDF (1/2) | Dựng khung PDF, lấy dữ liệu đóng góp từ API của M3 | Khung PDF với dữ liệu thật | 2h | 12/11, 21:00 |
| M2 | Kịch bản UAT (1/2) | Viết các kịch bản chính, tiêu chí thành công | Kịch bản UAT phần 1 | 2h | 12/11, 21:00 |

### Thứ 5, 12/11 – Kết quả & phân quyền
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4 | Màn hình kết quả (1/2) | Hiển thị điểm tổng hợp theo tiêu chí | Màn hình kết quả | 2h | 13/11, 12:00 |
| M4 | Màn hình kết quả (2/2) | Ẩn kết quả khi thiếu lượt, thông báo rõ ràng | Màn hình hoàn chỉnh | 1h | 13/11, 17:00 |
| M1 | Phân quyền (1/2) | Vai trò leader/thành viên trên API | Commit | 2h | 13/11, 21:00 |
| M1 | Phân quyền (2/2) | Test phân quyền, ẩn nút theo vai trò trên giao diện | Test + giao diện | 2h | 14/11, 12:00 |
| M3 | Tối ưu truy vấn (1/2) | Đo thời gian routine/truy vấn dashboard | Số đo trước | 2h | 13/11, 21:00 |
| M2 | Kịch bản UAT (2/2) | Hoàn thiện kịch bản, dữ liệu thử | Kịch bản UAT bản 1 | 1h | 13/11, 12:00 |

### Thứ 6, 13/11 – PDF & người thử
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | PDF (2/2) | Phần đóng góp + biểu đồ trong PDF | PDF có đóng góp | 2h | 14/11, 12:00 |
| M0 | PDF nội dung (bổ sung) | Điểm chấm chéo và bằng chứng chính | PDF đầy đủ nội dung | 2h | 14/11, 21:00 |
| M3 | Tối ưu truy vấn (2/2) | Thêm index, chỉnh routine | Số đo sau | 2h | 14/11, 21:00 |
| M2 | Mời người thử UAT | Lập danh sách ≥ 10 người, gửi lời mời | Danh sách người thử | 2h | 14/11, 21:00 |
| M5 | Regression test | Chạy test các module đã có | Test results | 2h | 14/11, 21:00 |

### Thứ 7, 14/11 – Kiểm tra ẩn danh & dữ liệu lớn
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4 | Kiểm tra ẩn danh (1/2) | Thử trường hợp đủ/thiếu lượt, trùng lượt | Kết quả kiểm tra phần 1 | 2h | 15/11, 12:00 |
| M4 | Kiểm tra ẩn danh (2/2) | Kiểm tra DB và API không lộ liên kết người chấm | Báo cáo kiểm tra ẩn danh | 2h | 15/11, 21:00 |
| M4 | (Có điều kiện) cảnh báo sớm | Rule-based: không hoạt động ≥ N ngày thì cảnh báo; chỉ làm nếu CR 09/11 đồng ý | Commit hoặc ghi chú bỏ | 2h | 15/11, 21:00 |
| M3 | Dữ liệu lớn | Nạp dữ liệu mẫu lớn, đo hiệu năng dashboard | Kết quả đo | 2h | 15/11, 12:00 |
| M1 | Sửa lỗi tích hợp | Sửa lỗi từ defect log liên quan board/nền tảng | Commit | 2h | 15/11, 12:00 |

### Chủ nhật, 15/11 – Hoàn thiện
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Hoàn thiện PDF | Nút xuất, font tiếng Việt, thử nhiều nhóm dữ liệu | Demo PDF | 2h | 15/11, 21:00 |
| M5 | Đo hiệu năng PDF | Đo thời gian xuất, ghi lỗi | Kết quả đo, defect log | 2h | 16/11, 12:00 |
| M2 | Phiếu phản hồi UAT | Soạn phiếu, cách đo mức hài lòng | Phiếu phản hồi | 2h | 16/11, 12:00 |
| M3 | Chỉnh dashboard | Chỉnh theo phản hồi nhóm | Commit | 2h | 15/11, 21:00 |

### Thứ 2, 16/11 – Code freeze
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0, M1, M3, M4 | Mở PR cuối | PR vào `develop`, review chéo trong 24h | PR đã merge | 1h | 16/11, 17:00 |
| M5 | Regression đầy đủ | Chạy lại toàn bộ test trên `develop` | Test results, defect log | 2h | 16/11, 21:00 |
| M2 | Chốt kịch bản UAT | Kịch bản và danh sách người thử bản cuối | Kịch bản UAT, danh sách | 1h | 16/11, 21:00 |

### Thứ 3, 17/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 5 | Burndown, tiến độ, cập nhật Risk | Sprint report | 1h | 17/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo PDF, chấm chéo ẩn danh, dashboard | Biên bản họp | 1h | 17/11, 21:00 |
| M0 | Chuẩn bị Sprint 6 | Chọn lỗi cần sửa, chia việc UAT và viết chương | Sprint 6 backlog | 1h | 17/11, 22:00 |
