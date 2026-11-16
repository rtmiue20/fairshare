# Chọn nơi chạy demo – FairShare v1.0

**Soạn:** M5 – Khiếu Hoàng Nam Anh · **Ngày:** 16/11/2026 · **Người quyết định:** M0 – Nguyễn Văn Minh Triều
**Cần chốt trước:** 17/11 12:00 (để kịp dựng và chạy thử trước Sprint Review 19/11)

## Bối cảnh

- Bản demo là stack Docker Compose (Nginx + Spring Boot + MariaDB), dựng bằng `./scripts/staging-up.sh`, chạy ở cổng 8081. Hiện chạy trên laptop M5 (Windows 11, Docker Desktop), dựng sạch mất khoảng 5 phút khi đã có image, 10–15 phút khi build lần đầu.
- Cần phục vụ 2 việc: (1) **demo trình chiếu** ở Sprint Review 19/11; (2) **UAT 17/11**, người thử phải mở được web từ máy của họ.
- Ràng buộc bảo mật: còn 3 lỗi High (DEF-31, 40, 41). Riêng **DEF-40** tạo sẵn tài khoản demo có mật khẩu công khai trong repo. Phương án nào đưa web ra Internet thì phải xóa các tài khoản đó trên CSDL demo trước (bước 4 trong `demo-checklist.md`) hoặc chờ M0 sửa.
- Video dự phòng (102 giây) đã có trên Google Drive, dùng khi mọi phương án đều hỏng.

## So sánh

| | A. Máy chung trong lớp | B. VPS | C. LAN qua IP máy M5 | D. Tunnel tạm (Cloudflare Quick Tunnel) |
|---|---|---|---|---|
| **Các bước** | Cài Docker Desktop (cần quyền admin), clone repo, tạo `.env.staging`, `staging-up.sh`, `demo-seed.py` | Thuê VPS Ubuntu ≥ 2 vCPU/4 GB, cài Docker, clone, `staging-up.sh`, mở cổng 80/8081, (tuỳ chọn) gắn tên miền + HTTPS | Laptop M5 chạy stack như hiện nay; mở tường lửa Windows cho cổng 8081 (một lệnh `New-NetFirewallRule`, cần admin); gửi `http://<IP-M5>:8081` | Laptop M5 chạy stack; cài `cloudflared`, chạy `cloudflared tunnel --url http://localhost:8081`, gửi URL `https://<ngẫu-nhiên>.trycloudflare.com` |
| **Thời gian dựng** | 1–2 giờ (cài Docker, tải image ~1,5 GB qua Wi-Fi lớp) | 1–2 giờ | 15 phút | 10 phút |
| **Chi phí** | 0 | ~100–250 nghìn đồng/tháng (hoặc tài khoản dùng thử) | 0 | 0 |
| **Truy cập cho UAT** | Chỉ người ngồi trong lớp/LAN | Mọi nơi | Chỉ cùng mạng Wi-Fi/LAN với M5 | Mọi nơi, khi laptop M5 bật |
| **Rủi ro khi demo** | Máy chung không cho cài Docker hoặc thiếu RAM (cần ~3 GB); không ai quen máy; Wi-Fi lớp chậm khi tải image | Phải đưa lên Internet khi còn DEF-31/40/41; tốn thời gian cấu hình; cần thẻ thanh toán | Wi-Fi lớp thường chặn máy-tới-máy (client isolation); IP đổi mỗi lần vào mạng; phụ thuộc pin/laptop M5 | URL đổi mỗi lần chạy lại; phụ thuộc Internet; web công khai khi đang chạy; Quick Tunnel chỉ dành cho thử nghiệm, không cam kết ổn định |
| **Ổn định cho trình chiếu** | Trung bình | Cao (nếu dựng xong sớm) | Cao khi trình chiếu ngay trên laptop M5 | Cao khi trình chiếu ngay trên laptop M5 (tunnel chỉ dùng cho người xem từ xa) |

## Đề xuất

**Trình chiếu trên laptop M5 bằng `localhost:8081` (dữ liệu từ `demo-seed.py`), cộng thêm tunnel tạm (D) chỉ trong khung giờ UAT 17/11. Video Drive làm dự phòng.**

Lý do:
1. Demo trình chiếu không cần mạng ngoài nên ít điểm hỏng nhất. Stack đã chạy ổn định trên máy này qua nhiều lần dựng (smoke PASS 09, 10, 15, 16/11).
2. UAT cần người thử truy cập từ máy riêng. Tunnel dựng trong 10 phút và không phụ thuộc Wi-Fi lớp, nên hợp hơn LAN. Bật tunnel đúng khung giờ UAT rồi tắt để giảm thời gian web lộ ra Internet khi còn lỗi High.
3. VPS tốn thời gian và chi phí, và chỉ đáng làm khi cần URL cố định sau ngày 19/11. Nhóm có thể làm sau release nếu giảng viên yêu cầu.
4. Trước khi bật tunnel phải xóa tài khoản demo của DEF-40 trên CSDL demo (`demo-checklist.md` bước 4). M5 tự làm được việc này trên dữ liệu, không cần sửa code.

Nếu M0 muốn có URL cố định để gửi giảng viên trước ngày 19/11 thì chọn B và cần quyết định thêm: ai trả phí, ai giữ quyền quản trị VPS.

## Tin nhắn soạn sẵn cho M0 (M5 tự gửi)

> Triều ơi, Anh cần chốt nơi chạy demo trước trưa 17/11. Đề xuất: demo 19/11 trình chiếu trên laptop của Anh (localhost, đã chạy ổn định, smoke test đạt 16/11), video Drive làm dự phòng. Riêng UAT 17/11, Anh mở tunnel Cloudflare tạm trong khung giờ test để các bạn vào từ máy riêng, test xong tắt. Không thuê VPS vì còn 3 lỗi High (DEF-31, 40, 41) chưa nên đưa web lên Internet lâu dài. Bảng so sánh 4 phương án ở `docs/deploy/demo-hosting.md`. Triều đồng ý phương án này hay muốn VPS để có URL cố định?
>
> Thêm 1 việc gấp: migration V23 (commit "Update Peer") đang tạo tài khoản demo có mật khẩu ghi trong repo và ghi đè nhóm id 1 ở mọi CSDL (DEF-40, High). Triều xem giúp trước khi gắn tag release 18/11.
