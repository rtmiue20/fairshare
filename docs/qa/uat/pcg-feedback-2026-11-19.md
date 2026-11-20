# Phản hồi góp ý của PCG – buổi họp 19/11/2026

**Bối cảnh:** nhóm kiểm soát chéo (PCG) mở bản Render `https://fairshare-web-3iuo.onrender.com` (`deploy/render` @ `ae92a1d`) và test trực tiếp trong buổi họp 19/11/2026. M0 (Triều) và M3 (Phúc) ghi lại 17 góp ý.
**Người tổng hợp:** M5 – Khiếu Hoàng Nam Anh (QA). **Người gửi PCG và quyết định yêu cầu thay đổi:** M0 – Nguyễn Văn Minh Triều.
**Cách phân loại:** chỗ ứng dụng chạy sai hoặc hiển thị sai được ghi thành lỗi trong `docs/qa/defect-log.md`. Chỗ muốn đổi cách làm là yêu cầu thay đổi, M0 quyết định vì nhóm đã khóa phạm vi ngày 18/11.

## 1. Lỗi đã ghi vào Defect Log (10 lỗi, DEF-45..54)

| # | Góp ý của PCG | Mã lỗi | Mức | Nguyên nhân (đọc mã nguồn) | Người sửa | Hạn | Trạng thái |
|---|---|---|---|---|---|---|---|
| 1 | Chuông thông báo dính dữ liệu của các tài khoản khác nhau | DEF-45 | High | Thông báo lưu chung trong trình duyệt, không theo tài khoản, không xóa khi đăng xuất | M3 | [M0 chốt] | Open |
| 2 | Cảnh báo còn dính dữ liệu, tài khoản mới tạo vẫn bị cảnh báo chưa làm việc | DEF-46 | Medium | Trang Cảnh báo dùng dữ liệu mẫu khi nhóm chưa có thẻ | M4 | [M0 chốt] | Open |
| 3 | Không thêm được 2–3 thành viên cùng làm một task | DEF-47 | Medium | Thẻ chỉ lưu được 1 người phụ trách | M1, M3 | [M0 chốt] | Open |
| 4 | Sửa chức năng tìm kiếm trong dự án | DEF-48 | Low | Ô "Search task…" không gắn xử lý | M1 | [M0 chốt] | Open |
| 5 | Sửa nút chia sẻ trang cá nhân | DEF-49 | Low | Trỏ tới đường dẫn không tồn tại | M3 | [M0 chốt] | Open |
| 6 | Nút "Hồ sơ chi tiết" chuyển qua hồ sơ, không ra Dashboard | DEF-49 | Low | Như mục 5 | M3 | [M0 chốt] | Open |
| 7 | Sửa trang Nghị định 13 cho hợp lý | DEF-50 | Medium | Một lần đồng ý hiện thành 4/4 quyền, có quyền Git không tồn tại | M2 | [M0 chốt] | Open |
| 8 | Xóa dòng "Đồng bộ… GitHub Webhook" | DEF-51 | Low | Mô tả tính năng không có | M1 | [M0 chốt] | Open |
| 9 | Đổi chữ "Sprint 3" trong thẻ đóng góp thành "Khai báo đóng góp" | DEF-52 | Low | Nhãn hiện mã số sprint trong CSDL | M3 | [M0 chốt] | Open |
| 10 | Xem lại logic thành viên tiêu biểu | DEF-53 | Medium | Số liệu và chữ mẫu cứng; gán điểm chấm chéo 4,5 khi chưa có phiếu | M3 | [M0 chốt] | Open |
| 11 | Trang Báo cáo bị trùng các tab | DEF-54 | Low | 7/10 mục menu cùng mở một tab | M0 | [M0 chốt] | Open |

## 2. Yêu cầu thay đổi (M0 quyết định)

| # | Góp ý của PCG | Nếu làm, giao cho | Quyết định của M0 | Lý do / hạn |
|---|---|---|---|---|
| 12 | Thêm chức năng chữ ký điện tử cho báo cáo | M0 | [Làm / Sprint 7 / Không làm] | |
| 13 | Khi tạo task, cho người dùng tự nhập tag, phù hợp nhiều loại dự án, không chỉ IT | M1 | [Làm / Sprint 7 / Không làm] | |
| 14 | Bấm "Chi tiết" ở trang Tích hợp thì ẩn thanh công cụ phía trên (kính lúp, +, −) | M3 | [Làm / Sprint 7 / Không làm] | |
| 15 | Sửa thanh xem video cho logic: video chạy hết thì các thẻ vừa hiện xong | M3 | [Làm / Sprint 7 / Không làm] | |
| 16 | Xóa nút tìm kiếm trong thẻ | M1 | [Làm / Sprint 7 / Không làm] | Nếu xóa thì DEF-48 coi như đã xử lý |

## 3. Việc kiểm thử bổ sung

| # | Góp ý của PCG | Người làm | Đầu ra |
|---|---|---|---|
| 17 | Check thêm checklist lỗi kết nối DB | M5 | Kết quả kiểm tra mất kết nối, CSDL khởi động chậm, sai mật khẩu, healthcheck trên staging và bản Render; lỗi phát hiện ghi thành DEF mới |

## 4. Câu hỏi M0 cần chốt trước khi sửa

1. DEF-50: trang Nghị định 13 chưa hợp lý ở điểm nào theo PCG.
2. DEF-53: tiêu chí chọn "thành viên tiêu biểu".
3. DEF-47: sửa trước release hay chuyển Change Log.
4. DEF-48 và mục 16: xóa ô tìm kiếm hay làm tìm kiếm thật.

**Ghi chú:** PCG test trực tiếp nhưng không điền phiếu SUS/CSAT, nên góp ý này không tính vào số liệu UAT (G5). Các lỗi chưa được M5 tái hiện trên trình duyệt; bằng chứng hiện tại là vị trí mã nguồn trong Defect Log. Trạng thái sẽ cập nhật khi chủ module sửa và M5 kiểm thử lại.
