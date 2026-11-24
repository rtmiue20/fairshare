# Báo cáo UAT tổng hợp – FairShare

**Soạn:** M5 – Khiếu Hoàng Nam Anh (QA & Deployment), phối hợp M2 – Hà Ngọc Thiện (chủ trì UAT) · **Cập nhật:** 24/11/2026 22:00 (GMT+7)
**Thẻ Trello:** "[S7] Báo cáo UAT tổng hợp (phối hợp M2) – đối chiếu mục tiêu G5"
**Phạm vi:** toàn bộ hoạt động nghiệm thu người dùng từ 15/11 đến 24/11/2026: pilot của M5, UAT chính thức của M2, buổi kiểm soát chéo (PCG) 19/11 và pilot lại trên bản cuối.

> Phân công: M2 chịu trách nhiệm kịch bản, mời người thử, thu phiếu và phần nhận xét (mục 3). M5 chịu trách nhiệm môi trường, kiểm thử trước khi mời, ghi lỗi và tính lại số liệu (mục 2, 4, 5). Số SUS/CSAT lấy từ `uat-formal-report.md` và `uat-responses-2026-11-17.csv` của M2 (đính kèm thẻ Trello của M2, không có trong repo); M5 đã tính lại từ CSV và khớp (`defect-log.md`, mục "Thay đổi 18/11").

## 1. Tóm tắt

| Mục | Kết quả |
|---|---|
| Số người thử ngoài nhóm | **10 phiếu hợp lệ** (1 Leader, 9 Member), đạt chỉ tiêu tối thiểu 10 của G5 |
| SUS trung bình | **47,0/100** (thấp nhất 32,5, cao nhất 62,5; 0/10 phiếu ≥ 75). Ngưỡng nghiệm thu: 75 → **chưa đạt** |
| CSAT (tỷ lệ chọn 4–5) | **60%** (6/10; trung bình 3,5/5). Ngưỡng G5: ≥ 80% → **chưa đạt** |
| **Kết luận G5** | **Chưa đạt.** Đạt về số lượng người thử, chưa đạt về mức hài lòng |
| Lỗi phát hiện từ UAT và PCG | 12 lỗi: 2 từ UAT chính thức (DEF-43 High, DEF-44 Low), 10 từ PCG (DEF-45..54) |
| Trạng thái 12 lỗi đó (24/11) | Closed 3 (DEF-43, 44, 45) · Fixed – chờ retest 5 (DEF-46, 48, 49, 51, 52) · Open 4 (DEF-47, 50, 53, 54) |
| Pilot API trên bản cuối (24/11, `master` @ `677a9be`) | **22/24 PASS** (15/11: 14/24; 16/11: 20/24) |

## 2. Các đợt kiểm thử chấp nhận

| Đợt | Ngày | Người thực hiện | Môi trường | Kết quả | Minh chứng |
|---|---|---|---|---|---|
| Pilot lần 1 (API, 24 ca) | 15/11 | M5 | Staging M5, `master` @ `d2eab98` | 14/24 PASS; ghi 7 lỗi DEF-31..37 (2 High) | `uat/uat-pilot-report.md`, `uat/uat-pilot-2026-11-15.txt` |
| Pilot lần 2 | 16/11 | M5 | Staging, `master` @ `f18a705` | 20/24 PASS; đóng DEF-33..37 | `uat/uat-pilot-2026-11-16.txt` |
| **UAT chính thức** | 14–17/11 (đóng 17/11) | M2 | Bản Render `deploy/render` @ `29945fe` | 10 phiếu; SUS 47,0; CSAT 60%; ghi DEF-43, 44 | Thẻ Trello của M2, `uat-formal-report.md`; `uat/uat-closure.md` mục 5 |
| Kiểm soát chéo (PCG) | 19/11 | PCG (M0, M3 ghi lại) | Bản Render `deploy/render` @ `ae92a1d` | 17 góp ý: 10 lỗi (DEF-45..54), 5 yêu cầu thay đổi, 1 việc kiểm thử | `uat/pcg-feedback-2026-11-19.md` |
| Pilot lần 3 | 19/11 | M5 | Staging, `master` @ `adb33ad` | 20/24 PASS | `evidence/uat-pilot-2026-11-19.txt` |
| **Pilot trên bản cuối** | 24/11 | M5 | Staging dựng sạch, `master` @ `677a9be` | **22/24 PASS** | `evidence/uat-pilot-2026-11-24.txt`, `uat/uat-pilot-result.json` |

Ghi chú về môi trường: UAT chính thức chạy trên bản Render chứ không chạy trên staging của M5 (12 tài khoản `uat01..uat12`), vì staging chỉ mở trên máy M5. Vì vậy M5 không truy cập được CSDL của đợt UAT để đối chiếu dữ liệu người thử (xem mục 5).

## 3. Kết quả UAT chính thức (M2)

### 3.1. Người thử

10 sinh viên ngoài nhóm, đúng nhóm đối tượng ở `docs/M2-UAT-Scenarios.md` mục 4: 1 người đóng vai Leader, 9 người đóng vai Member. Người thử dùng mã mời hoặc tài khoản mẫu trên bản Render.

### 3.2. Mức độ hài lòng

| Chỉ số | Kết quả | Ngưỡng | Đạt? |
|---|---|---|---|
| Số phiếu hợp lệ | 10 | ≥ 10 | Đạt |
| SUS trung bình | 47,0 (32,5 – 62,5) | ≥ 75 | Chưa đạt |
| Phiếu có SUS ≥ 75 | 0/10 | – | – |
| CSAT chọn mức 4–5 | 60% (6/10) | ≥ 80% (G5) | Chưa đạt |
| CSAT trung bình | 3,5/5 | – | – |
| Góp ý tự do | Không phiếu nào ghi | – | – |

### 3.3. Lỗi người thử gặp

| Mã | Mức | Mô tả | Trạng thái 24/11 |
|---|---|---|---|
| DEF-43 | High | `GET /api/contributions/evidence` trả HTTP 500 trên bản Render, bảng Audit Trail trống | Closed 20/11 (staging và Render trả 200) |
| DEF-44 | Low | Nút chuông thông báo không mở popover | Closed 20/11 |

## 4. Góp ý của PCG (19/11)

PCG không điền phiếu SUS/CSAT, nên **không cộng vào G5**. M5 phân loại 17 góp ý thành 10 lỗi, 5 yêu cầu thay đổi (M0 quyết định vì đã khóa phạm vi 18/11) và 1 việc kiểm thử kết nối CSDL.

| Mã | Mức | Góp ý | Trạng thái 24/11 |
|---|---|---|---|
| DEF-45 | High | Chuông thông báo hiện thông báo của tài khoản khác | Closed (20/11) |
| DEF-46 | Medium | Cảnh báo giả cho nhóm mới | Fixed – chờ retest (trường hợp API lỗi) |
| DEF-47 | Medium | Không gán được nhiều người cho một thẻ | Open (M0 quyết sửa hay đưa vào Change Log) |
| DEF-48 | Low | Ô tìm kiếm trong thẻ không hoạt động | Fixed – chờ retest (đã bỏ ô) |
| DEF-49 | Low | Nút "Hồ sơ chi tiết" về Dashboard | Fixed – chờ retest |
| DEF-50 | Medium | Tab Nghị định 13: 4 quyền theo một cờ đồng ý | Open |
| DEF-51 | Low | Mô tả tích hợp GitHub không có thật | Fixed – chờ retest |
| DEF-52 | Low | Nhãn "Sprint {id}" sai ngữ cảnh | Fixed – chờ retest |
| DEF-53 | Medium | "Thành viên tiêu biểu" và hồ sơ dùng số liệu mẫu | Open |
| DEF-54 | Low | Trang Báo cáo trùng tab | Open |

Khi rà mã ngày 24/11, M5 ghi thêm **DEF-68** (Low) cùng loại với DEF-50, 51: trang Đăng nhập và ghi chú trang Báo cáo vẫn nói hệ thống thu thập "Git commits".

## 5. Pilot API trên bản cuối (24/11)

`scripts/uat-pilot.py`, 24 ca, chạy trên staging dựng sạch từ `master` @ `677a9be` (sau khi nạp `uat-seed.py`).

| Nhóm ca | Kết quả | Ghi chú |
|---|---|---|
| UAT-M2-01..05 (tạo nhóm, mời, consent, sprint) | 12/12 PASS | |
| Luồng chính (Dashboard, chấm chéo đủ/dưới 3 phiếu, xuất PDF) | 4/4 PASS | Ẩn danh ≥ 3 người chấm vẫn đúng |
| Phân quyền, chống gian lận (UAT-SEC-01..08) | 6/8 PASS | UAT-SEC-04, 05 FAIL **chỉ theo mã trạng thái**: API bỏ qua `userId` giả và ghi khai báo cho chính người gọi (201); tự duyệt bị chặn bằng 400. Mục tiêu chống gian lận đạt, nên DEF-31 đã đóng 24/11 |
| **Tổng** | **22/24** | |

## 6. Phân tích: vì sao G5 chưa đạt

Các nguyên nhân dưới đây là nhận định của M5 dựa trên số liệu, cần M2 đối chiếu với phần phân tích trong `uat-formal-report.md` mục 4:

1. **Người thử gặp lỗi chặn chức năng cốt lõi:** Audit Trail trống (DEF-43) đúng lúc người thử cần xem bằng chứng truy vết, là phần làm nên "minh bạch" mà G5 hỏi tới.
2. **Giao diện có dữ liệu mẫu cứng** (DEF-39, 46, 53) làm người thử khó tin số liệu là thật.
3. **Chỉ số D1–D4 chưa có chú thích:** M2 đề xuất bổ sung chú thích trên Dashboard và báo cáo (đề xuất cải thiện trong `uat-formal-report.md` mục 4).
4. **Môi trường Render miễn phí khởi động chậm (cold start):** lần vào đầu tiên mất nhiều giây, ảnh hưởng cảm nhận "dễ dùng" của SUS.
5. **Cỡ mẫu nhỏ** (10 phiếu) và không có góp ý tự do, nên không tách được ảnh hưởng của từng yếu tố.

## 7. Hạn chế của đợt UAT

- M5 không truy cập được CSDL Render, nên **không lọc được** người thử có số `CARD_MOVED` bất thường (biện pháp cho DEF-41 ở `uat/uat-closure.md`). SUS/CSAT không bị ảnh hưởng (lấy từ phiếu), nhưng số liệu đóng góp trên bản Render chưa được kiểm chứng.
- Bản Render nhiều khả năng có 6 tài khoản demo với mật khẩu công khai (DEF-40, vẫn Open).
- Chưa đo lại SUS/CSAT sau khi sửa lỗi; các con số ở mục 3 phản ánh bản Render ngày 14–17/11.

## 8. Đề xuất

| # | Đề xuất | Người | Thời điểm |
|---|---|---|---|
| 1 | Ghi G5 "chưa đạt" trong báo cáo cuối kèm số liệu thật (10 phiếu, SUS 47,0, CSAT 60%) và nguyên nhân ở mục 6; không làm tròn hay bỏ bớt | M0, M2 | Báo cáo cuối 25/11 |
| 2 | Nếu còn thời gian sau nộp bài: chạy lại UAT ngắn (≥ 10 người) trên bản đã sửa DEF-43, 45, 46, có chú thích D1–D4, để so sánh trước/sau | M2, M5 | Sau 26/11 |
| 3 | Ghi bài học: chạy pilot và sửa lỗi High **trước** khi mời người thử; UAT chính thức nên chạy trên môi trường mà QA truy cập được CSDL | M5 | Mini-PM Report, lessons learned |
| 4 | M0 trả lời PCG 5 yêu cầu thay đổi (chữ ký điện tử, tag tự nhập, thanh công cụ trang Tích hợp, thanh video, ô tìm kiếm) | M0 | Trước nộp bài |

## 9. Ký xác nhận

| Vai trò | Người | Xác nhận |
|---|---|---|
| Chủ trì UAT | M2 – Hà Ngọc Thiện | ☐ Đồng ý số liệu mục 1, 3 · Ngày: ____ |
| QA | M5 – Khiếu Hoàng Nam Anh | ☑ Đã đối chiếu số liệu với Defect Log 24/11 |
| PM | M0 – Nguyễn Văn Minh Triều | ☐ Đã đọc kết luận G5 · Ngày: ____ |
