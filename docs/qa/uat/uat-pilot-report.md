# Báo cáo chạy thử UAT (pilot) – Sprint 6

**Người thực hiện:** M5 – Khiếu Hoàng Nam Anh (WP5) | **Ngày:** 15/11/2026 | **Gửi:** M2 (chủ trì UAT), M0 (PM)
**Môi trường:** staging Docker Compose trên máy M5, `master` @ `d2eab98` + bản sửa script WP5, `http://localhost:8081`
**Mục đích:** M5 chạy thử kịch bản UAT trước khi mời ≥ 10 sinh viên ngoài nhóm (mục tiêu G5), để bắt lỗi chặn luồng sớm. Đây **không phải** kết quả UAT chính thức. Kết quả chính thức do M2 thu từ phiếu người thử.

## 1. Môi trường và tài khoản đã chuẩn bị

| Hạng mục | Chi tiết |
|---|---|
| Tài khoản | 12 tài khoản `uat01..uat12@fairshare.test`, dùng chung một mật khẩu. Danh sách: `docs/qa/uat/uat-accounts.md`. Mật khẩu M5 gửi riêng cho M2, **không có trong repo** |
| Nhóm A (dữ liệu mẫu) | Leader `uat01`, thành viên `uat02..uat05` (đã đồng thuận). Board 10 thẻ: 4 Done (1 trễ hạn), 2 In Progress, 4 To Do. 1 khai báo đóng góp chờ duyệt. 1 đợt chấm chéo đang mở, `uat01` đã có đủ 3 phiếu |
| Tài khoản trống | `uat06..uat12` chưa vào nhóm nào: dùng cho kịch bản UAT-M2-01..05 (tạo nhóm, mời, consent, sprint) |
| Tạo lại từ đầu | `./scripts/staging-up.sh reset && ./scripts/staging-up.sh` rồi `py -X utf8 scripts/uat-seed.py` (khoảng 5 phút) |
| Truy cập từ máy khác | **Chưa có.** Staging chỉ mở trên máy M5 (`localhost`). Cần M0 chốt máy chung/VPS, hoặc cho người thử dùng chung mạng LAN qua địa chỉ IP máy M5 (cần mở tường lửa cổng 8081) |

## 2. Kết quả chạy thử (24 ca, `scripts/uat-pilot.py`)

**14/24 PASS.** Minh chứng: `docs/qa/uat/uat-pilot-result.json`, `uat-pilot-2026-11-15.txt`.

| Nhóm | Ca | Kết quả | Ghi chú |
|---|---|---|---|
| UAT-M2-01 Tạo nhóm | Để trống tên → 400 | PASS | |
| | Sinh mã mời 6–8 ký tự | **FAIL** | Mã 12 ký tự → DEF-37 |
| UAT-M2-02 Mời / tham gia | Leader mời qua email | PASS | |
| | Tham gia bằng mã mời | PASS | |
| | Mã mời sai bị từ chối | PASS | 404 |
| | Thành viên thường không mời được | **FAIL** | → DEF-33 |
| UAT-M2-03 Consent | Ký consent | PASS | |
| UAT-M2-04 Rút consent | Rút consent | PASS | |
| UAT-M2-05 Sprint | Leader tạo sprint | PASS | |
| | Ngày kết thúc trước ngày bắt đầu bị từ chối | **FAIL** | → DEF-36 |
| | Thành viên không đóng được sprint | PASS | 403 |
| | Leader đóng sprint | PASS | `CLOSED` |
| Luồng chính | Dashboard có tỷ lệ cho 5 thành viên | PASS | |
| | Chấm chéo đủ 3 phiếu → hiện điểm | PASS | 4,33 |
| | Chấm chéo dưới 3 phiếu → ẩn điểm | PASS | |
| | Leader xuất PDF | PASS | |
| Phân quyền / chống gian lận | Người ngoài xem sprint nhóm khác | **FAIL** | → DEF-35 |
| | Người ngoài xem board nhóm khác | **FAIL** | → DEF-34 |
| | Người ngoài xem khai báo đóng góp | **FAIL** | → DEF-32 |
| | Khai báo đứng tên người khác | **FAIL** | → DEF-31 |
| | Tự duyệt khai báo của mình (giả `reviewerId`) | **FAIL** | → DEF-31 |
| | Người ngoài duyệt khai báo | **FAIL** | → DEF-31 |
| | Người ngoài xuất PDF nhóm khác | PASS | 403 |
| | Người ngoài tự thêm mình làm LEADER | **FAIL** | → DEF-33 |

Ngoài 24 ca trên, khi quay video demo còn phát hiện **DEF-38 (High)**: kéo thẻ vào cột Review nhiều lần sẽ tự cộng điểm cho người kéo. Khi chụp ảnh user guide phát hiện **DEF-39 (Low)**: giao diện hiện số liệu mẫu cứng.

## 3. Lỗi mới và đề xuất

| Mã | Mức | Tóm tắt | Người xử lý |
|---|---|---|---|
| DEF-31 | **High** | API khai báo đóng góp không xác thực người gọi: giả danh, tự duyệt, người ngoài duyệt | M3 |
| DEF-33 | **High** | Ai cũng thêm được thành viên vào nhóm, kể cả tự thêm mình làm LEADER | M2 |
| DEF-38 | **High** | Kéo thẻ vào Review lặp lại → cộng điểm `REVIEW_CARD` không giới hạn | M1, M3 |
| DEF-32 | Medium | Người ngoài xem được khai báo đóng góp của nhóm | M3 |
| DEF-34 | Medium | Người ngoài xem được board của nhóm | M1 |
| DEF-35 | Low | Người ngoài xem được danh sách sprint | M2 |
| DEF-36 | Low | Sprint nhận ngày kết thúc trước ngày bắt đầu | M2 |
| DEF-37 | Low | Mã mời 12 ký tự, giao diện ghi 6–8 | M2 |
| DEF-39 | Low | Giao diện hiện số liệu/việc mẫu cứng | M0 |

## 4. Khuyến nghị cho đợt UAT với người thử thật

1. **Chưa mở UAT diện rộng** cho tới khi DEF-31, 33, 38 được sửa. Ba lỗi này cho phép người thử (cố ý hay vô tình) làm sai tỷ lệ đóng góp, tức là sai đúng chức năng cốt lõi đang được đánh giá.
2. Nếu vẫn phải chạy UAT trước khi sửa: hướng dẫn người thử **không** dùng *Khai báo đóng góp*, *Mời thành viên* và không kéo thẻ qua lại cột Review. Ghi rõ giới hạn này trong báo cáo UAT.
3. Kịch bản UAT-M2-01..05 cần cập nhật theo CR-02: bỏ các bước Trello (đồng bộ Trello, checkbox "cho phép đọc dữ liệu Trello"), thay bằng Task Board nội bộ.
4. Chốt cách người thử truy cập staging (máy chung, VPS hoặc LAN) trước khi gửi lời mời.
