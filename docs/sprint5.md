# SPRINT 5 – Chấm chéo ẩn danh, báo cáo PDF và kiểm thử

**Thời gian:** Thứ 5, 06/11/2026 → Thứ 4, 12/11/2026 | **Tương ứng:** Tuần 5 (Sprint 5) | **Trạng thái sprint:** 🔄 Đang thực hiện

## Mục tiêu sprint
- Hoàn thiện chấm chéo ẩn danh (chỉ trả kết quả khi đủ ≥ 3 lượt), kiểm tra không lộ danh tính.
- Xuất báo cáo PDF gồm đóng góp, điểm chấm chéo, bằng chứng chính (thời gian xuất < 10s - mục tiêu G4).
- Phân quyền theo vai trò nhóm, tối ưu truy vấn/routine, kiểm thử hồi quy.
- Cập nhật công thức tổng hợp 3 thành phần (Git 40%, Board 40%, Peer 20%) theo CR-03 và triển khai Cảnh báo sớm rule-based theo CR-04.
- Chuẩn bị UAT (kịch bản, danh sách ≥ 10 người thử, phiếu phản hồi). Code freeze 11/11 lúc 17:00.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 5, 06/11 |
| Daily | Hằng ngày |
| Code freeze tính năng mới (chỉ còn sửa lỗi) | Thứ 3, 11/11, 17:00 |
| Sprint Review + Retrospective | Thứ 4, 12/11 |

## Phân công công việc (lát cắt dọc)
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M4 | Chấm chéo hoàn thiện: `AnonymityAggregator` (ngưỡng ≥ 3 lượt, kiểm tra ngay trong routine), màn hình kết quả, kiểm tra không lộ danh tính; Cảnh báo sớm rule-based (CR-04) | Commit, báo cáo kiểm tra ẩn danh, module alert | 11/11 | 🔄 Đang thực hiện |
| M0 | Báo cáo PDF: `report` tổng hợp đóng góp, điểm chấm chéo, bằng chứng chính; nút xuất PDF chuẩn hóa, tối ưu hiệu năng < 10s | PR module report, demo PDF (< 1s) | 11/11 | ✅ Đã hoàn thành code & test |
| M3 | Đóng góp hoàn thiện: cập nhật `ScoringEngine v1.1` (CR-03), tối ưu routine/truy vấn, kiểm thử dữ liệu lớn, chỉnh dashboard theo phản hồi | Commit, kết quả đo trước/sau | 10/11 | 🔄 Đang thực hiện |
| M1 | Hoàn thiện nền tảng: bảo mật cơ bản, phân quyền theo vai trò nhóm (gồm quyền trên board: leader tạo/sửa bảng và cột, thành viên chỉ sửa/di chuyển thẻ được giao), sửa lỗi board; **gỡ module Trello legacy** (CR-02) | Commit, test phân quyền, PR gỡ legacy | 10/11 | 🔄 Đang thực hiện |
| M2 | BA + nhóm: kịch bản UAT (có luồng dùng Task Board: tạo thẻ → di chuyển → xem đóng góp), danh sách ≥ 10 người thử, phiếu phản hồi | Kịch bản UAT, danh sách, phiếu | 11/11 | 🔄 Đang thực hiện |
| M5 | Kiểm thử: unit/integration/regression (gồm luồng board → `ActivityEvent` → `ScoringEngine` → dashboard), defect log, đo hiệu năng PDF | Test results, defect log | 11/11 | 🔄 Đang thực hiện |
| M0 | Báo cáo tuần 5, cập nhật Risk Register, chủ trì Daily và điều phối Sprint Review/Retro | Sprint report, Risk update | 12/11 | 🔄 Đang thực hiện |

## Tiêu chí hoàn thành (DoD)
- Với dưới 3 lượt đánh giá thì không hiển thị kết quả, và không suy ra được danh tính người chấm.
- Xuất được PDF có đóng góp, điểm chấm chéo và bằng chứng chính; thời gian xuất đo được so với mục tiêu G4 (< 10 giây).
- Phân quyền leader/thành viên đúng (kể cả trên board), có test.
- Module Trello legacy đã gỡ (`integration/trello`, `TrelloClientTest`, fixtures/mock Trello, `ConnectTrelloPage`, `integration.api.ts`, route `integration`); build và CI vẫn xanh; dữ liệu cũ nguồn `TRELLO` (nếu có) không làm lỗi hệ thống.
- Có kịch bản UAT và ≥ 10 người thử trước khi sang Sprint 6; defect log cập nhật, mỗi lỗi có người nhận.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R04: lộ danh tính trong chấm chéo (nhóm ít người) | M4 kiểm thử trường hợp biên, M5 kiểm tra độc lập |
| PDF chậm hoặc lỗi font tiếng Việt | M5 đo hiệu năng, M0 tối ưu và thử nhiều bộ dữ liệu |
| R12: chưa đủ người cho UAT | M2 mời ngay từ đầu sprint |
| Gỡ Trello legacy làm vỡ build/test hoặc dữ liệu cũ | M1 gỡ trong PR riêng, M5 chạy regression đầy đủ trước khi merge; giữ giá trị enum `ActivitySource.TRELLO` nếu còn dữ liệu cũ |
| Còn ít thời gian sau code freeze | Chỉ nhận sửa lỗi sau 11/11, mọi thay đổi qua CR |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 6: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 5, 06/11 – Planning & Kick-off
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Chia việc theo CR-03 & CR-04 đã chốt ở Sprint 4 | Sprint backlog | 1h | 06/11, 21:00 |
| M4 | `AnonymityAggregator` (1/2) | Routine tổng hợp, chỉ trả kết quả khi ≥ 3 lượt | Migration chứa routine | 2h | 07/11, 12:00 |
| M4 | `AnonymityAggregator` (2/2) | Service gọi routine, unit test | Code + test | 2h | 07/11, 21:00 |
| M0 | PDF (1/2) | Dựng khung PDF, lấy dữ liệu đóng góp từ API của M3 | Khung PDF với dữ liệu thật | 2h | 07/11, 21:00 |
| M2 | Kịch bản UAT (1/2) | Viết các kịch bản chính, tiêu chí thành công | Kịch bản UAT phần 1 | 2h | 07/11, 21:00 |

### Thứ 6, 07/11 – Kết quả & phân quyền
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4 | Màn hình kết quả (1/2) | Hiển thị điểm tổng hợp theo tiêu chí | Màn hình kết quả | 2h | 08/11, 12:00 |
| M4 | Màn hình kết quả (2/2) | Ẩn kết quả khi thiếu lượt, thông báo rõ ràng | Màn hình hoàn chỉnh | 1h | 08/11, 17:00 |
| M1 | Phân quyền (1/2) | Vai trò leader/thành viên trên API | Commit | 2h | 08/11, 21:00 |
| M1 | Phân quyền (2/2) | Test phân quyền, ẩn nút theo vai trò trên giao diện (gồm `BoardView`) | Test + giao diện | 2h | 09/11, 12:00 |
| M1 | Gỡ Trello legacy (1/2) | Xóa `integration/trello`, `TrelloClientTest`, fixtures/mock Trello phía backend | PR backend | 2h | 09/11, 21:00 |
| M3 | Tối ưu truy vấn (1/2) | Đo thời gian routine/truy vấn dashboard | Số đo trước | 2h | 08/11, 21:00 |
| M2 | Kịch bản UAT (2/2) | Hoàn thiện kịch bản, dữ liệu thử | Kịch bản UAT bản 1 | 1h | 08/11, 12:00 |

### Thứ 7, 08/11 – PDF & người thử
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | PDF (2/2) | Phần đóng góp + biểu đồ trong PDF | PDF có đóng góp | 2h | 09/11, 12:00 |
| M0 | PDF nội dung (bổ sung) | Điểm chấm chéo và bằng chứng chính | PDF đầy đủ nội dung | 2h | 09/11, 21:00 |
| M3 | Tối ưu truy vấn (2/2) | Thêm index, chỉnh routine | Số đo sau | 2h | 09/11, 21:00 |
| M2 | Mời người thử UAT | Lập danh sách ≥ 10 người, gửi lời mời | Danh sách người thử | 2h | 09/11, 21:00 |
| M5 | Regression test | Chạy test các module đã có, thêm ca kiểm tra board → `ActivityEvent` → điểm đóng góp | Test results | 2h | 09/11, 21:00 |

### Chủ nhật, 09/11 – Kiểm tra ẩn danh & Cảnh báo sớm
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M4 | Kiểm tra ẩn danh (1/2) | Thử trường hợp đủ/thiếu lượt, trùng lượt | Kết quả kiểm tra phần 1 | 2h | 10/11, 12:00 |
| M4 | Kiểm tra ẩn danh (2/2) | Kiểm tra DB và API không lộ liên kết người chấm | Báo cáo kiểm tra ẩn danh | 2h | 10/11, 21:00 |
| M4 | Cảnh báo sớm (CR-04) | Rule-based: không hoạt động ≥ 3 ngày thì cảnh báo, thẻ trễ hạn | Commit module alert | 2h | 10/11, 21:00 |
| M3 | Dữ liệu lớn | Nạp dữ liệu mẫu lớn, đo hiệu năng dashboard | Kết quả đo | 2h | 10/11, 12:00 |
| M1 | Gỡ Trello legacy (2/2) | Xóa `ConnectTrelloPage`, `integration.api.ts`, route `integration` phía frontend; cập nhật README | PR frontend, CI xanh | 2h | 10/11, 12:00 |
| M1 | Sửa lỗi tích hợp | Sửa lỗi từ defect log liên quan board/nền tảng | Commit | 2h | 10/11, 21:00 |

### Thứ 2, 10/11 – Hoàn thiện & Đo hiệu năng
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Hoàn thiện PDF | Nút xuất, font tiếng Việt, thử nhiều nhóm dữ liệu | Demo PDF (< 1s) | 2h | 10/11, 21:00 |
| M5 | Đo hiệu năng PDF | Đo thời gian xuất, ghi lỗi | Kết quả đo, defect log | 2h | 11/11, 12:00 |
| M2 | Phiếu phản hồi UAT | Soạn phiếu, cách đo mức hài lòng | Phiếu phản hồi | 2h | 11/11, 12:00 |
| M3 | Chỉnh dashboard | Chỉnh theo phản hồi nhóm, cập nhật ScoringEngine v1.1 | Commit | 2h | 10/11, 21:00 |

### Thứ 3, 11/11 – Code freeze
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0, M1, M3, M4 | Mở PR cuối | PR vào `develop`, review chéo trong 24h | PR đã merge | 1h | 11/11, 17:00 |
| M5 | Regression đầy đủ | Chạy lại toàn bộ test trên `develop` | Test results, defect log | 2h | 11/11, 21:00 |
| M2 | Chốt kịch bản UAT | Kịch bản và danh sách người thử bản cuối | Kịch bản UAT, danh sách | 1h | 11/11, 21:00 |

### Thứ 4, 12/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Báo cáo tuần 5 | Burndown, tiến độ, cập nhật Risk | Sprint report | 1h | 12/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo PDF, chấm chéo ẩn danh, dashboard | Biên bản họp | 1h | 12/11, 21:00 |
| M0 | Chuẩn bị Sprint 6 | Chọn lỗi cần sửa, chia việc UAT và viết chương | Sprint 6 backlog | 1h | 12/11, 22:00 |
