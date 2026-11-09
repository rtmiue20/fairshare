# Hướng dẫn dựng môi trường Staging – FairShare

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh (WP5) | **Cập nhật:** 09/11/2026
**Mục đích:** một bản chạy đủ 3 thành phần (MariaDB, backend, frontend) để cả nhóm kiểm thử tích hợp, chạy UAT và demo Sprint Review. Nội dung này sẽ thành một chương trong Deployment Guide.

> **Nơi chạy staging:** chưa chốt với M0, tạm chạy trên máy local của M5. Khi có máy chung hoặc VPS, chạy đúng các lệnh dưới đây trên máy đó, chỉ thay địa chỉ: `<địa chỉ máy staging>`.

## 1. Yêu cầu

- Docker Engine 24+ và Docker Compose v2.24+ (cần cho cú pháp `!reset` / `!override` trong file override).
- Python 3 (script dùng để sinh mật khẩu và chạy test tích hợp).
- Còn trống cổng **8080** (backend) và **8081** (frontend). Cổng 3306 của DB **không** mở ra ngoài.

## 2. Các file

| File | Vai trò |
|---|---|
| `docker-compose.yml` | Cấu hình gốc 3 service (dùng chung cho dev) |
| `docker-compose.staging.yml` | Ghi đè cho staging: bắt buộc `JWT_SECRET`, ẩn cổng DB, healthcheck backend/frontend, giới hạn dung lượng log |
| `.env.staging.example` | Mẫu biến môi trường; bản thật `.env.staging` **không commit** (đã thêm vào `.gitignore`) |
| `scripts/staging-up.sh` | Sinh mật khẩu nếu còn trống → build → chạy → chờ healthy → smoke test |
| `scripts/staging-smoke.sh` | 11 kiểm tra: container healthy, Flyway, cổng DB, Nginx proxy, đăng ký/đăng nhập |
| `scripts/integration-sprint4.py` | 22 ca test tích hợp trên staging (xem `docs/qa/integration-log-sprint4.md`) |

## 3. Dựng staging

```bash
git pull origin master
./scripts/staging-up.sh
```
Lần đầu, script tạo `.env.staging` với `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET` ngẫu nhiên (64 ký tự hex). Những lần sau giữ nguyên mật khẩu cũ để không mất dữ liệu.

Kết quả mong đợi (bản chạy ngày 09/11/2026):
```
NAME                 IMAGE                        STATUS                   PORTS
fairshare-backend    fairshare-staging-backend    Up 3 minutes (healthy)   0.0.0.0:8080->8080/tcp
fairshare-db         mariadb:10.11                Up 3 minutes (healthy)   3306/tcp
fairshare-frontend   fairshare-staging-frontend   Up 3 minutes (healthy)   0.0.0.0:8081->80/tcp
...
SMOKE TEST: PASS
```
Mở trình duyệt: `http://localhost:8081` (hoặc `http://<địa chỉ máy staging>:8081`).

## 4. Lệnh vận hành

| Việc | Lệnh |
|---|---|
| Xem trạng thái | `docker compose -p fairshare-staging ps` |
| Xem log backend | `docker compose -p fairshare-staging logs -f backend` |
| Cập nhật code mới | `git pull && ./scripts/staging-up.sh` |
| Tắt (giữ dữ liệu) | `./scripts/staging-up.sh down` |
| Xóa sạch dữ liệu | `./scripts/staging-up.sh reset` |
| Chạy test tích hợp | `python3 scripts/integration-sprint4.py` |
| Sao lưu DB | `docker compose -p fairshare-staging exec -T db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" fairshare' > backup_$(date +%F).sql` |

Staging dùng project name `fairshare-staging` nên volume DB (`fairshare-staging_db_data`) tách khỏi bản dev (`docker compose up` thường).

## 5. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `Thiếu JWT_SECRET trong .env.staging` | File env thiếu biến | Chạy lại `./scripts/staging-up.sh`, script tự điền |
| Backend `unhealthy`, log có `Access denied for user` | Đổi `DB_PASSWORD` sau khi volume đã tạo | `./scripts/staging-up.sh reset` rồi chạy lại (mất dữ liệu staging) |
| Backend báo lỗi Flyway `checksum mismatch` | Ai đó sửa migration đã chạy | Không sửa migration cũ; tạo `V17__...`. Trên staging có thể `reset` |
| `/api/...` trả 502 | Backend chưa healthy | Xem `logs backend`, chờ healthcheck (tối đa khoảng 3 phút) |
| `Bind for 0.0.0.0:8081 failed` | Cổng đã bị chiếm | Đổi `FRONTEND_PORT` trong `.env.staging` |
| Build lỗi `PKIX path building failed` khi `mvn` tải thư viện | Mạng có proxy chặn SSL (gặp trên máy kiểm thử của M5) | Build jar trên máy (`./mvnw package -DskipTests`) rồi build image; hoặc chạy ở mạng khác |

## 6. Checklist nghiệm thu staging (thẻ "[M5] Môi trường staging")

- [x] Chốt nơi chạy staging: tạm máy local M5, chờ M0 xác nhận máy chung
- [x] Tạo `.env.staging`, không commit mật khẩu (`.gitignore` có `.env.staging`)
- [x] `docker compose up -d` chạy đủ 3 container `db`, `backend`, `frontend` (đều healthy)
- [x] Kiểm tra đăng nhập (smoke test), board và dashboard (test tích hợp IT-BRD-01..08) trên staging
