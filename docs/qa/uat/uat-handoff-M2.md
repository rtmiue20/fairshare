# Bàn giao môi trường UAT cho M2 – Sprint 6

**Từ:** M5 – Khiếu Hoàng Nam Anh (QA & Deployment) · **Cho:** M2 – Hà Ngọc Thiện (chủ trì UAT)
**Ngày:** 16/11/2026 (GMT+7) · **Bản build:** `master` @ `f18a705`, môi trường reset và seed lúc 16/11 23:24
**Kịch bản:** `docs/M2-UAT-Scenarios.md` (UAT-FS-01..08, bản CR-02 của M2)

## 1. Truy cập

| Mục | Giá trị |
|---|---|
| Địa chỉ | **Chưa chốt.** Hiện staging chạy trên máy M5 (`http://localhost:8081`), người ngoài chưa vào được. M5 gửi URL khi M0 chốt nơi chạy (`docs/deploy/demo-hosting.md`). |
| Trình duyệt | Chrome hoặc Edge bản mới, cửa sổ ẩn danh để không lẫn phiên đăng nhập giữa các tài khoản |
| Mật khẩu | Dùng chung cho 12 tài khoản. **M5 gửi riêng cho M2 qua tin nhắn**, không ghi vào tài liệu, Sheet hay nhóm chat chung |
| Kiểm tra trước khi giao (16/11 23:25) | `uat01` đăng nhập được, nhóm A có 5 thành viên, 10 thẻ trên board; `uat06` đăng nhập được, chưa thuộc nhóm nào |

## 2. Tài khoản và phân công kịch bản

Danh sách đầy đủ: `docs/qa/uat/uat-accounts.md`. Nhóm A ("UAT – Nhóm A (dữ liệu mẫu)") đã có sprint, board 10 thẻ, sự kiện đóng góp và một đợt chấm chéo đang mở.

| Người thử | Tài khoản | Vai trò | Kịch bản |
|---|---|---|---|
| 1 | `uat01@fairshare.test` | Leader nhóm A | UAT-FS-04 (tạo cột, thẻ), FS-06 (xem kết quả chấm chéo), FS-07 (xuất PDF), FS-08 (phía Leader) |
| 2–5 | `uat02` … `uat05@fairshare.test` | Thành viên nhóm A | UAT-FS-05 (kéo thẻ của mình tới Done, xem Dashboard), FS-06 (chấm chéo), FS-08 (phía Member) |
| 6 | `uat06@fairshare.test` | Leader nhóm mới B | UAT-FS-01 (tạo nhóm, lấy mã mời), FS-03 (tạo/đóng sprint) |
| 7–8 | `uat07`, `uat08@fairshare.test` | Thành viên nhóm B | UAT-FS-01 (tham gia bằng mã mời), FS-02 (consent, rút consent) |
| 9 | `uat09@fairshare.test` | Leader nhóm mới C | UAT-FS-01 (mời qua email), FS-03 |
| 10–12 | `uat10` … `uat12@fairshare.test` | Thành viên nhóm C | UAT-FS-01, FS-02 |

Kịch bản cũ UAT-M2-01..05 tương ứng FS-01 (M2-01, 02), FS-02 (M2-03, 04), FS-03 (M2-05). Pilot của M5 ngày 16/11 đạt toàn bộ các ca M2-01..05 (`docs/qa/uat/uat-pilot-2026-11-16.txt`).

## 3. Giới hạn khi thử (lỗi đã biết, chưa sửa trên bản build này)

Người thử **không** làm các thao tác dưới đây, vì chúng làm sai dữ liệu đóng góp của cả đợt UAT. Nếu lỡ làm, ghi lại vào phiếu, không cần báo thành lỗi mới.

| Không làm | Lý do | Lỗi |
|---|---|---|
| Dùng chức năng **Khai báo đóng góp** (khai báo, duyệt) | API không xác thực người gọi: khai báo đứng tên người khác, tự duyệt được | DEF-31 (High), DEF-32 |
| **Kéo thẻ qua lại** giữa To Do, In Progress (hoặc kéo ra vào Review nhiều lần). Chỉ kéo một chiều To Do → In Progress → Review → Done | Mỗi lần kéo cộng điểm cho người kéo, tỷ lệ đóng góp bị đội lên (thử 10 vòng: 50% → 91,67%) | DEF-41 (High), DEF-42 |
| Đổi tên thẻ sau khi đã có người kéo vào Review | Sinh thêm sự kiện review trùng | DEF-42 |

**Đã sửa, được thử bình thường:** Mời thành viên (chỉ Leader mời được, DEF-33), xem board/sprint của nhóm khác bị chặn (DEF-34, 35), ngày kết thúc sprint trước ngày bắt đầu bị từ chối (DEF-36), mã mời 8 ký tự (DEF-37).

**Biết trước, không cần báo lại:**
- Dashboard hiện dòng "1.248 hoạt động chia cho 4 người" và Lịch công việc hiện việc mẫu ("Submit Final Screens", "Prototype Testing") không phải dữ liệu nhóm (DEF-39).
- Thành viên thường tạo đợt chấm chéo nhận thông báo lỗi chung chung (DEF-19).

## 4. Báo lỗi về M5

1. Người thử ghi vào phiếu theo mẫu `docs/qa/uat/uat-feedback-template.md` (M2 có thể chép sang Google Form/Sheet, giữ nguyên các cột).
2. Mỗi lỗi một dòng: tài khoản, kịch bản, các bước, kết quả mong đợi, kết quả thực tế, ảnh chụp màn hình (nếu có), giờ xảy ra.
3. **Không ghi mật khẩu** vào phiếu hay ảnh chụp.
4. M2 gom phiếu, gửi M5 **trước 17/11 17:00** (file hoặc link Sheet). M5 tái hiện trên staging, gộp trùng, ghi vào `docs/qa/defect-log.md` từ DEF-43 trở đi và giao người xử lý theo lát cắt dọc.
5. Lỗi chặn luồng chính (không đăng nhập được, trang trắng, mất dữ liệu): nhắn M5 ngay, không chờ cuối buổi.
