# Flow test bản beta – Trưởng nhóm và Thành viên

**Soạn:** M5 – Khiếu Hoàng Nam Anh (QA & Deployment) · **Ngày:** 16/11/2026
**Bản beta:** https://fairshare-web-3iuo.onrender.com/
**Kịch bản liên quan:** `docs/M2-UAT-Scenarios.md` (UAT-FS-01..08)

## Trước khi test

- **Ứng dụng không có vai trò admin hệ thống.** Chỉ có 2 vai trò trong nhóm: Trưởng nhóm (`LEADER`) và Thành viên (`MEMBER`). Trong tài liệu này, "admin" nghĩa là Trưởng nhóm.
- **Chuẩn bị 5 tài khoản tự đăng ký:** 1 Trưởng nhóm, 4 Thành viên. Cần đủ 4 thành viên để mỗi người có ít nhất 3 người chấm chéo (ngưỡng ẩn danh). Mỗi tài khoản mở trong một cửa sổ ẩn danh riêng.
- **Không dùng nút "Đăng nhập demo".** Khi đăng nhập thất bại, nút này vẫn cho vào ứng dụng bằng token giả, nên không chứng minh được gì. Tài khoản `demo@fairshare.io` trên beta còn đăng nhập được bằng mật khẩu công khai (DEF-40), chưa nên gửi link beta cho người ngoài nhóm.
- **Thứ tự chạy:** Trưởng nhóm làm bước 1–7 → Thành viên làm Flow 2 → Trưởng nhóm làm tiếp bước 8–13.
- Cột **Kết quả** ghi `Đạt` / `Không đạt` / `Không thử`. Dòng nào "Không đạt" thì ghi lỗi theo mẫu ở cuối tài liệu.

## Flow 1: Trưởng nhóm

| # | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Mở link beta, bấm Đăng ký, nhập email chưa dùng, mật khẩu, họ tên | Đăng ký xong, vào được trang chính | |
| 2 | Đăng xuất, đăng nhập lại với mật khẩu sai | Báo sai email hoặc mật khẩu, vẫn ở trang đăng nhập | |
| 3 | Đăng nhập đúng. Vào **Nhóm**, tạo nhóm với tên để trống, rồi tạo lại với tên hợp lệ | Tên trống bị từ chối. Tạo xong thì người tạo là Trưởng nhóm, có mã mời 8 ký tự | |
| 4 | Mời 4 thành viên qua email, hoặc gửi mã mời cho họ | Thành viên xuất hiện trong danh sách với vai trò Thành viên | |
| 5 | Tạo sprint có ngày kết thúc trước ngày bắt đầu | Bị từ chối | |
| 6 | Tạo sprint hợp lệ | Sprint hiện trong danh sách, trạng thái đang mở | |
| 7 | Mở **Task Board**: thêm cột, tạo 4–5 thẻ, mỗi thẻ có story points, người phụ trách là một thành viên, hạn chót | Board có các cột To Do / In Progress / Review / Done; thẻ hiển thị đủ thông tin | |
| 8 | Sau khi thành viên xong Flow 2 bước 5, mở **Bảng đóng góp** | Có tỷ lệ đóng góp cho từng người; mở bằng chứng thấy sự kiện gốc, nguồn là BOARD | |
| 9 | Mở **Cảnh báo** | Thành viên không có hoạt động bị cảnh báo | |
| 10 | Mở **Chấm chéo**: tạo đợt chấm cho sprint, rồi mở đợt | Đợt chuyển sang trạng thái mở, thành viên thấy form chấm | |
| 11 | Sau khi thành viên xong Flow 2 bước 7, xem kết quả chấm chéo | Người có từ 3 người chấm trở lên: thấy điểm. Người có dưới 3: điểm bị ẩn | |
| 12 | Vào **Báo cáo**, xuất PDF của sprint | Tải được file trong dưới 10 giây; tên tiếng Việt có dấu; đủ thành viên | |
| 13 | Đóng đợt chấm, rồi đóng sprint | Trạng thái đổi sang đã đóng | |

## Flow 2: Thành viên

Mỗi thành viên (4 tài khoản) đều chạy flow này.

| # | Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|
| 1 | Đăng ký và đăng nhập | Vào được trang chính, chưa thuộc nhóm nào | |
| 2 | Nhập mã mời sai, rồi nhập mã đúng của Trưởng nhóm (bỏ qua nếu đã được mời qua email) | Mã sai bị từ chối; mã đúng thì vào nhóm với vai trò Thành viên | |
| 3 | Đồng ý chia sẻ dữ liệu (consent), rút lại, rồi đồng ý lại | Trạng thái đổi đúng sau mỗi lần | |
| 4 | Thử các thao tác của Trưởng nhóm: thêm cột, đổi tên board, mời người, tạo sprint, tạo đợt chấm | Đều bị chặn (nút bị ẩn hoặc báo không có quyền) | |
| 5 | Trên Task Board, kéo thẻ của mình theo một chiều: To Do → In Progress → Review → Done | Thẻ vào cột Done; tỷ lệ của mình trên Bảng đóng góp tăng | |
| 6 | Thử kéo thẻ của người khác | Bị chặn | |
| 7 | Vào **Chấm chéo**, chấm 3 đồng đội (thang 1–5, kèm nhận xét). Sau đó thử chấm lại một người đã chấm | Lần đầu lưu được; lần chấm trùng bị từ chối | |
| 8 | Xem kết quả chấm của mình | Chỉ thấy điểm khi có từ 3 người chấm trở lên; không thấy tên người chấm | |
| 9 | Sửa URL sang id của một nhóm khác (ví dụ `/teams/1`) | Không xem được dữ liệu của nhóm khác | |
| 10 | Bấm F5 trên một trang bất kỳ, rồi đăng xuất | Sau F5 vẫn đăng nhập; đăng xuất xong quay về trang đăng nhập | |

## Không làm trong lúc test (lỗi đã biết, chưa sửa)

| Không làm | Lý do | Lỗi |
|---|---|---|
| Dùng chức năng **Khai báo đóng góp** | Khai báo đứng tên người khác và tự duyệt được | DEF-31, DEF-32 |
| **Kéo thẻ qua lại** giữa các cột | Mỗi lần kéo cộng thêm điểm, tỷ lệ đóng góp bị đội lên | DEF-41 |
| Đổi tên thẻ đã có người kéo vào Review | Sinh thêm sự kiện review trùng | DEF-42 |

Không cần báo lại: số "1.248 hoạt động" trên Dashboard và việc mẫu trên Lịch là dữ liệu cứng (DEF-39).

## Báo lỗi

Ghi mỗi lỗi một dòng theo mẫu `docs/qa/uat/uat-feedback-template.md`: tài khoản, flow và bước (ví dụ "Flow 2 – bước 5"), thao tác đã làm, kết quả mong đợi, kết quả thực tế, ảnh chụp màn hình, giờ xảy ra. **Không ghi mật khẩu** vào phiếu hay ảnh. Gửi cho M5 để tái hiện và ghi vào `docs/qa/defect-log.md`.
