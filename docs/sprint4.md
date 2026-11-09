# SPRINT 4 – Bảng đóng góp và board/card hoàn thiện

**Thời gian:** Thứ 5, 30/10/2026 → Thứ 4, 05/11/2026 | **Tương ứng:** Tuần 4 (Sprint 4) | **Trạng thái sprint:** ✅ Hoàn thành (Đã nghiệm thu Review 05/11)

> **Căn cứ CR-02:** board/card là module nội bộ (không còn Trello API). Sprint 3 chỉ làm khung; Sprint 4 làm phần nâng cao (kéo thả, chi tiết card, log chống gian lận). Dữ liệu tổng hợp đóng góp từ nay lấy từ `ActivityEvent` nguồn `BOARD`.

## Mục tiêu sprint
- Hoàn thiện bảng đóng góp: tổng hợp theo người/sprint, truy vết đến sự kiện gốc, dashboard, bảng bằng chứng, khai báo thủ công có xác nhận.
- Hoàn thiện board/card (kéo thả, chi tiết card, story point, hạn) và ghi `ActivityEvent` đầy đủ (`CARD_CREATED`, `CARD_MOVED`, `CARD_COMPLETED` kèm `delay_days`, `is_on_time`), có log không sửa được để chống gian lận.
- Có API và form chấm chéo, môi trường staging, defect log đầu tiên.
- Quyết định tính năng có điều kiện (cảnh báo sớm, Google Docs) bằng Change Request (CR-04).

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 5, 30/10 |
| Daily | Hằng ngày |
| Họp quyết định tính năng có điều kiện (CR-04) | Thứ 2, 03/11 |
| Sprint Review + Retrospective | Thứ 4, 05/11 |

## Phân công công việc (lát cắt dọc)
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M3 | Đóng góp & Dashboard: routine tổng hợp đóng góp (`sp_calculate_contribution_scores`), API truy vết đến sự kiện gốc (`sp_get_evidence_traceability`), dashboard biểu đồ radar 4 chiều, bảng bằng chứng, bộ lọc dynamic theo sprint/người, mô hình ScoringEngine đa tầng | PR #43, #44, #45, #47, #49 | 04/11 | ✅ Hoàn thành |
| M1 | Board/card hoàn thiện: chi tiết card (người phụ trách, story point, hạn), giao diện kéo thả DnD (Kanban UI 1/3, 2/3, 3/3), ghi sự kiện hoàn thành/đúng hạn, log hoạt động không sửa được | PR #46, Commit `2379d6e` | 04/11 | ✅ Hoàn thành |
| M2 | Nhóm hoàn thiện + BA: quản lý thành viên/sprint (đổi vai trò, xóa thành viên); kiểm tra công thức với dữ liệu thật của nhóm (có đồng ý NĐ 13/2023/NĐ-CP), thu thập phản hồi, đề xuất CR-03 | Báo cáo kiểm tra công thức, CR-03, PR #39 | 04/11 | ✅ Hoàn thành |
| M4 | Chấm chéo: API mở/đóng đợt, nhận đánh giá; form chấm chéo; kiểm thử chống suy luận danh tính cơ bản | PR #31, Service/Controller PeerReview, ReviewForm | 04/11 | ✅ Hoàn thành |
| M5 | Tích hợp: test các module, CI/CD GitHub Actions, môi trường staging Docker Compose, rà soát defect log | Docker Compose, CI run pass, Defect log Sprint 4 | 04/11 | ✅ Hoàn thành |
| M0 | Rà việc tồn đọng Sprint 3, cập nhật Gantt thực tế, **quyết định tính năng có điều kiện** (CR-04), thông qua CR-03, điều phối họp Review/Retro | Sprint report, CR-04, Gantt cập nhật | 05/11 | ✅ Hoàn thành |

## Tiêu chí hoàn thành (DoD)
- [x] Dashboard hiển thị đóng góp theo sprint/người; bấm vào một chỉ số mở được danh sách sự kiện gốc (`/api/contributions/evidence`).
- [x] Kéo thả card giữa cột hoạt động mượt mà và sinh `ActivityEvent` nguồn `BOARD` đúng loại; card vào cột hoàn thành có `CARD_COMPLETED`, `delay_days` và `is_on_time` đúng theo hạn chót.
- [x] Không có API sửa/xóa `ActivityEvent`; xóa card không làm mất sự kiện đã ghi (đảm bảo tính bất biến).
- [x] Form chấm chéo gửi được đánh giá và lưu vào DB (kết nối `ReviewSubmission`).
- [x] Staging chạy được qua Docker Compose, CI test suite tự động đạt 100% pass.
- [x] Quyết định về cảnh báo sớm (Giữ) và Google Docs (Cắt) được chính thức ban hành qua CR-04 và đưa vào Change Log.

## Rủi ro theo dõi
| Rủi ro | Biện pháp | Kết quả thực tế |
|---|---|---|
| R02: phụ thuộc API ngoài | Đã loại bỏ nhờ CR-02 (board nội bộ); chính thức cắt Google Docs qua CR-04 | Đã triệt tiêu hoàn toàn rủi ro R02 |
| R19: M1 quá tải với giao diện kéo thả | M1 tập trung thư viện kéo thả nhẹ, hoàn tất cả 3 phần UI Kanban đúng hạn | Đã giải tỏa thành công qua PR #46 |
| R06: công thức bị cho là thiếu công bằng | M2 + M3 chạy thực nghiệm trên dữ liệu thật Sprint 1-3, đề xuất CR-03 điều chỉnh trọng số v1.1 | Đã giải quyết, biểu quyết thông qua tại Sprint Review |
| R05: gian lận dữ liệu (tạo/chia nhỏ card giả) | Nâng trọng số Story Points từ 1.5 lên 2.5, giảm Completed Cards từ 3.0 xuống 1.5 (CR-03); log không sửa được | Đã triệt tiêu động cơ cày card rác |
| Việc tồn đọng từ Sprint 3 | M0 liệt kê ngày 30/10, toàn bộ backlog Sprint 3 đã được giải quyết triệt để | Đã đóng toàn bộ nợ kỹ thuật Sprint 3 |

## Báo cáo cuối sprint (nghiệm thu họp Review)
- **Việc hoàn thành:** 
  1. **Module Task Board & Kanban (M1):** Đã hoàn thiện giao diện kéo thả trực quan (Kanban DnD), xem và chỉnh sửa modal chi tiết card (gán Story Points, assignee, hạn chót), tự động ghi nhận `ActivityEvent` chuẩn xác khi card hoàn thành.
  2. **Module Phân tích nghiệp vụ & Quản lý nhóm (M2):** Hoàn tất API và giao diện quản lý thành viên (chuyển vai trò Admin/Member, loại thành viên khỏi nhóm). Bàn giao Báo cáo kiểm nghiệm công thức với dữ liệu thực tế và khởi thảo thành công CR-03.
  3. **Module Đóng góp & Dashboard (M3):** Hoàn thành xuất sắc 2 Stored Procedures (`sp_calculate_contribution_scores`, `sp_get_evidence_traceability`), tích hợp biểu đồ Radar 4 chiều, bộ lọc động theo Sprint và thành viên, nâng cấp ScoringEngine v1.1.
  4. **Module Chấm chéo (M4):** Đã kết nối form chấm chéo và cấu trúc lưu trữ điểm đánh giá, chuẩn bị tích hợp sâu vào báo cáo tổng hợp ở Sprint 5.
  5. **Quản lý dự án & Chất lượng (M0 & M5):** Duy trì CI 100% pass, thông qua CR-03 (công thức v1.1) và CR-04 (loại bỏ Google Docs, giữ Cảnh báo sớm rule-based cho Sprint 5).
- **Việc tồn đọng chuyển sang Sprint 5:** 
  - Hoàn thiện thuật toán `AnonymityAggregator` với ngưỡng nghiêm ngặt (≥ 3 lượt đánh giá mới công bố điểm) và màn hình hiển thị kết quả chấm chéo (M4).
  - Xây dựng module Báo cáo PDF tổng hợp đa chiều có bằng chứng truy vết (M0).
  - Triển khai tính năng Cảnh báo sớm thành viên không hoạt động theo luật (M4 - theo CR-04).
  - Gỡ bỏ hoàn toàn mã nguồn và routes của Trello legacy (M1).
- **Bài học từ Retro:** 
  - *Keep:* Mô hình chia lát cắt dọc (Vertical Slice) giúp các thành viên độc lập tiến độ và giải phóng năng suất cực kỳ cao (Sprint 4 merge hơn 10 PRs chất lượng).
  - *Problem:* Việc xung đột số thứ tự Flyway migration (V13 bị trùng giữa 2 branch) cần được kiểm soát chặt chẽ bằng cách rebase develop trước khi push.
  - *Action:* Áp dụng quy ước đặt tên migration theo timestamp `V{YYYYMMDDHHMM}__ten.sql` từ Sprint 5 để triệt tiêu hoàn toàn xung đột version.
