# Minh chứng kiểm thử và triển khai (WP5 – M5)

**Phụ trách:** M5 – Khiếu Hoàng Nam Anh · **Cập nhật:** 16/11/2026 23:40 (GMT+7)

Thư mục này lưu log chạy test, kết quả JSON, file PDF mẫu, ảnh màn hình và video demo dùng làm minh chứng cho defect log (`docs/qa/defect-log.md`), chương Kiểm thử & Triển khai (`docs/report/M5-chuong-kiem-thu-trien-khai.md`) và Mini-PM Report.

Quy ước tên file: `<loại>-<yyyy-mm-dd>.<đuôi>`. File mới (từ 14/11) có dòng đầu ghi ngày giờ chạy và commit `master` đã kiểm. **Không lưu** file chứa bí mật (`.env*`, `.uat-credentials.local`, log có mật khẩu/token).

## Bản online

| Nội dung | Link |
|---|---|
| Video demo dự phòng (102 giây, quay 15/11 trên staging) | https://drive.google.com/file/d/1HE7ZnfLf49j5UMruRp-0IG11czHqGZjV/view |
| Sheet QA (tab "UAT pilot", "Defect log") | https://docs.google.com/spreadsheets/d/104KW7se8hVV37DPfD7vKPBYUGpkmSk94uUbg0KYrkb8/edit |

## Lần chạy mới nhất: 16/11/2026, `master` @ `f18a705`

Staging dựng lại sạch (`./scripts/staging-up.sh reset` rồi `./scripts/staging-up.sh`), nạp seed M3 `large_dataset_500_tasks.sql` cho tích hợp và hồi quy. Sau đó reset lần nữa và chạy `uat-seed.py` cho pilot UAT và môi trường UAT.

| File | Nội dung | Kết quả | Chứng minh cho |
|---|---|---|---|
| `staging-up-2026-11-16.txt` | Log dựng staging (build image, Flyway, healthcheck, smoke) | 3 container healthy | Thẻ 2 – môi trường demo |
| `staging-smoke-2026-11-16.txt` | `scripts/staging-smoke.sh` | **PASS** | 1.3, 2.3 |
| `staging-compose-ps-2026-11-16.txt` | `docker compose ps` của project `fairshare-staging` | 3 container Up (healthy) | Thẻ 2 |
| `integration-2026-11-16.txt` | `scripts/integration-sprint4.py` (JSON: `../integration-result-sprint4.json`) | **23/23 PASS** | 1.3, 2.3 |
| `regression-2026-11-16.txt` | `scripts/regression-sprint5.py` (JSON: `../regression-result-sprint5.json`) | **30/30 PASS**, PDF chậm nhất 0,064 s | 1.3, 2.3; G4 |
| `retest-2026-11-16.txt`, `retest-result-2026-11-16.json` | `scripts/retest-sprint6.py`: DEF-19, 38, 40, 41 | **2/9 PASS** (DEF-38 đạt; DEF-19, 40, 41, 42 còn lỗi) | 1.3; DEF-38, 40, 41, 42 |
| `../uat/uat-pilot-2026-11-16.txt`, `../uat/uat-pilot-result.json` | `scripts/uat-pilot.py` | **20/24 PASS** (4 FAIL: DEF-31, 32) | 1.3; DEF-31..37 |
| `../uat/uat-seed-2026-11-16.txt` | `scripts/uat-seed.py`: 12 tài khoản, nhóm A (id 2) | Đã tạo | 1.1 |
| `backend-unit-docker-2026-11-16.txt` | `mvn test` trong container Maven, Testcontainers chạy thật | **233 test, 0 lỗi, 0 skip** | 1.3; đóng DEF-27 |
| `frontend-unit-2026-11-16.txt` | Vitest trong container Node 20 (giống Frontend CI) | **20 file, 86/86 PASS** | 1.3 |

## Các lần chạy trước

| File | Ngày | Commit kiểm | Nội dung / kết quả |
|---|---|---|---|
| `staging-smoke-2026-11-15.txt` | 15/11 | `d2eab98` + script WP5 | Smoke PASS trên Windows (đóng DEF-30) |
| `integration-2026-11-15.txt` | 15/11 | `d2eab98` | Tích hợp 23/23 |
| `regression-2026-11-15.txt` | 15/11 | `d2eab98` | Hồi quy 30/30 |
| `report-team1-sprint4-2026-11-15.pdf`, `report-vietnamese-2026-11-15.pdf` | 15/11 | `d2eab98` | PDF mẫu dùng kiểm PDF-02..05 (đủ tên, có dấu tiếng Việt) |
| `backend-unit-docker-2026-11-15.txt` | 15/11 | `d2eab98` | 195 test, 0 skip, 4 lỗi (DEF-27); đóng DEF-01 |
| `backend-unit-2026-11-14.txt`, `frontend-unit-2026-11-14.txt` | 14/11 | `d2eab98` | BE 178 test (4 lỗi, 9 skip); FE 74/74 |
| `backend-unit-2026-11-10.txt`, `frontend-unit-2026-11-10.txt` | 10/11 | master 10/11 | BE 124 test (7 skip); FE |
| `integration-run-2026-11-09.txt`, `integration-run-2026-11-10.txt` | 09–10/11 | master 09–10/11 | Integration Log Sprint 4 |
| `regression-run-sprint5-master-2026-11-10.txt` | 10/11 | master 10/11 | Hồi quy Sprint 5 trên master (phát hiện DEF-20..26) |
| `regression-run-sprint5-pdf-patched-2026-11-10.txt`, `regression-result-sprint5-pdf-patched.json`, `pdf-sample-*-patched.pdf` | 10/11 | master + bản vá DEF-20 | Đo lại khi vá 1 dòng DEF-20 |
| `staging-smoke-2026-11-09.txt`, `-10.txt`; `staging-compose-ps-2026-11-09.txt`, `-10.txt` | 09–10/11 | master 09–10/11 | Staging lần đầu |

## Ảnh màn hình và video

| Đường dẫn | Nội dung | Dùng ở |
|---|---|---|
| `user-guide/01-dang-nhap.png` … `13-cham-cheo-duoi-nguong.png` (14 ảnh) | Chụp 15/11 bằng `scripts/capture-screens.ps1` trên staging, dữ liệu nhóm UAT A | `docs/deploy/user-guide.md` (16/11: đã kiểm, đủ 14/14 đường dẫn ảnh) |
| `demo/fairshare-demo-2026-11-15.avi` | Video demo dự phòng, 102 giây, quay bằng `scripts/record-demo.ps1` | **Không commit** (84 MB, `.gitignore`); bản online ở Google Drive (link trên) |

## Lưu ý

- `staging-up-2026-11-15.log` chỉ có trên máy M5 (đuôi `.log` bị `.gitignore`). Từ 16/11 log dựng staging lưu đuôi `.txt` sau khi đã kiểm không có bí mật.
- Số liệu trong tài liệu phải lấy từ file ở bảng "Lần chạy mới nhất". Khi chạy lại, thêm file mới theo ngày, không ghi đè file cũ.
