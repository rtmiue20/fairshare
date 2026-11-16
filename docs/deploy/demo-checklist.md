# Checklist dựng bản demo – FairShare v1.0

**Soạn:** M5 · **Ngày:** 16/11/2026 · **Đã chạy thử:** 16/11 23:30 trên staging local (`master` @ `f18a705`): đủ các bước 1–3 và 5; bước 4 đã chạy phần khóa tài khoản DEF-40 (đăng nhập `demo@fairshare.io` → 401), phần LAN/tunnel chưa làm vì chưa chốt nơi chạy.
Nơi chạy: xem `docs/deploy/demo-hosting.md` (chờ M0 chốt).

## 1. Chuẩn bị (làm trước buổi demo ít nhất 2 giờ)

- [ ] Docker Desktop đang chạy (`docker info` không lỗi), máy còn ≥ 4 GB RAM trống, đã cắm sạc.
- [ ] `git fetch && git checkout <tag release>` (ví dụ `v1.0.0`), hoặc `master` nếu chưa có tag. Ghi lại commit: `git rev-parse --short HEAD`.
- [ ] Có file `.env.staging` (nếu chưa có, `staging-up.sh` tự sinh mật khẩu ngẫu nhiên).

## 2. Dựng sạch

```bash
./scripts/staging-up.sh reset      # xóa CSDL demo cũ
./scripts/staging-up.sh            # build + chạy + smoke test, phải in "SMOKE TEST: PASS"
```

## 3. Nạp dữ liệu demo

```bash
py -X utf8 scripts/demo-seed.py            # Windows; Linux/macOS: python3 scripts/demo-seed.py
```

- Kết quả: 5 tài khoản `demo01..demo05@fairshare.test`, nhóm "Nhóm 07 – FairShare (demo)" với 12 thẻ, đợt chấm chéo đang mở. Danh sách tài khoản: `docs/deploy/demo-accounts.md`. Mật khẩu: `.demo-credentials.local` (không commit, không chiếu lên màn hình).
- Cần cả môi trường UAT trên cùng CSDL thì chạy thêm `py -X utf8 scripts/uat-seed.py`.

## 4. Trước khi đưa web ra ngoài máy (LAN, tunnel, VPS)

- [ ] **DEF-40 chưa sửa:** xóa tài khoản demo do migration V23 tạo (mật khẩu đang công khai trong repo). Lệnh dưới chỉ đổi mật khẩu thành chuỗi ngẫu nhiên không đăng nhập được, để không đụng khóa ngoại:

```bash
docker compose -p fairshare-staging exec -T db sh -c 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE" -e "UPDATE users SET password = CONCAT(\"!disabled-\", UUID()) WHERE id BETWEEN 109 AND 113;"'
```

- [ ] Kiểm tra: đăng nhập `demo@fairshare.io` phải trả HTTP 401.
- [ ] LAN: mở tường lửa (PowerShell quyền admin) `New-NetFirewallRule -DisplayName "FairShare demo 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private`; xem IP bằng `ipconfig`; thử mở `http://<IP>:8081` từ điện thoại cùng Wi-Fi. Xong buổi thì xóa rule.
- [ ] Tunnel: `cloudflared tunnel --url http://localhost:8081`, lấy URL `https://….trycloudflare.com` in ra màn hình, thử mở bằng 4G. Tắt (Ctrl+C) ngay khi xong UAT/demo.

## 5. Kiểm tra trước giờ demo (5 phút)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | `./scripts/staging-smoke.sh` | `SMOKE TEST: PASS` |
| 2 | Đăng nhập `demo01` | Vào danh sách nhóm, thấy "Nhóm 07 – FairShare (demo)" |
| 3 | Mở Task Board | 4 cột To Do / In Progress / Review / Done, 12 thẻ |
| 4 | Mở Bảng đóng góp | 5 thành viên, tỷ lệ khác nhau (lần chạy thử 16/11: 42% / 28% / 21% / 8% / 1%) |
| 5 | Mở Chấm chéo bằng `demo01` | Thấy điểm trung bình (đủ 3 phiếu) |
| 6 | Mở Chấm chéo bằng `demo04` | Không thấy điểm (2 phiếu, dưới ngưỡng ẩn danh) |
| 7 | Xuất PDF bằng `demo01` | Tải được file PDF, tên tiếng Việt có dấu, dưới 10 giây (chạy thử 16/11: 0,23 s) |

## 6. Khi demo

- Kéo thẻ **một chiều** (In Progress → Review → Done). Không kéo qua lại (DEF-41), không dùng Khai báo đóng góp (DEF-31), không đổi tên thẻ đã review (DEF-42).
- Bỏ qua các số liệu mẫu cứng trên Dashboard và Lịch (DEF-39) nếu bị hỏi: lỗi đã biết, đã ghi trong defect log.
- Sự cố: chuyển sang video dự phòng https://drive.google.com/file/d/1HE7ZnfLf49j5UMruRp-0IG11czHqGZjV/view.

## 7. Sau demo

- [ ] Tắt tunnel / xóa rule tường lửa.
- [ ] `./scripts/staging-up.sh down` (giữ dữ liệu) hoặc `reset` (xóa).
- [ ] Ghi kết quả buổi demo vào `docs/qa/evidence/` (ảnh, ghi chú sự cố nếu có).
