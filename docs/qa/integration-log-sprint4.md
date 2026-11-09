# Integration Log – Sprint 4

**Dự án:** FairShare | **Phân hệ:** WP5 – Kiểm thử & Triển khai | **Người thực hiện:** M5 – Khiếu Hoàng Nam Anh
**Ngày chạy:** 09/11/2026, 16:50 (GMT+7) | **Mã nguồn:** `master` @ `c32a069` (Merge PR #54)
**Môi trường:** Staging Docker Compose (`fairshare-staging`): Nginx → Spring Boot (profile `prod`) → MariaDB 10.11, Flyway áp dụng đủ 16 migration (V1–V16)
**Công cụ:** `scripts/integration-sprint4.py` (gọi API thật qua Nginx, kiểm tra thêm bằng SQL trong container DB)
**Kết quả máy đọc:** `docs/qa/integration-result-sprint4.json` | **Log đầy đủ:** `docs/qa/evidence/integration-run-2026-11-09.txt`

## 1. Tóm tắt

| Luồng | Số ca | Pass | Fail | Kết luận |
|---|---|---|---|---|
| 1. Board → ActivityEvent → API tổng hợp đóng góp / truy vết | 11 | 7 | 4 | Luồng chính chạy đúng; có lỗ hổng chống gian lận và phân quyền |
| 2. Chấm chéo → DB → kết quả ẩn danh | 11 | 4 | 7 | **Chưa đạt**: cơ chế ẩn danh bị lộ điểm khi dưới 3 lượt, đếm sai số người chấm |
| **Tổng** | **22** | **11** | **11** | 11 ca fail ứng với 8 defect mới; thêm DEF-14 (thiếu API mở đợt chấm) và DEF-17 (điểm cần M3 xác nhận) phát hiện trong lúc chạy. Xem `docs/qa/defect-log.md` |

Kết quả lặp lại giống nhau qua 2 lần chạy trên dữ liệu mới (mỗi lần tạo team, sprint, 5 tài khoản riêng).

## 2. Dữ liệu kiểm thử

Mỗi lần chạy, script tự tạo dữ liệu mới, không dùng dữ liệu thật của nhóm:
- 5 tài khoản: A (trưởng nhóm), B, C, D (thành viên), **E (người ngoài nhóm)**.
- 1 team, 1 sprint (từ hôm nay −3 đến +4 ngày), 1 board với 4 cột mặc định `To Do / In Progress / Review / Done`.
- 3 card: B – 3 SP, hạn +2 ngày (đúng hạn); C – 2 SP, hạn −1 ngày (trễ); D – 5 SP (dùng cho ca giả mạo).
- 1 đợt chấm chéo `min_submissions_required = 3`, tạo bằng SQL vì backend **chưa có API mở đợt** (xem DEF-14).

## 3. Luồng 1 – Board → ActivityEvent → đóng góp

| Mã | Ca kiểm thử | Mong đợi | Thực tế | KQ | Defect |
|---|---|---|---|---|---|
| IT-BRD-01 | Tạo 3 card | 3 `CARD_CREATED`, `source=BOARD`, gắn đúng sprint | 3 sự kiện, source BOARD, đúng sprint | Pass | |
| IT-BRD-02 | Kéo card To Do → In Progress | Sinh `CARD_MOVED` | 1 `CARD_MOVED` của B | Pass | |
| IT-BRD-03 | Card vào Done trước hạn | `CARD_COMPLETED`, `is_on_time=true`, `delay_days=0`, SP=3 | (true, 0.0, 3.0) | Pass | |
| IT-BRD-04 | Card vào Done trễ 1 ngày | `is_on_time=false`, `delay_days≈1` | (false, 1.0) | Pass | |
| IT-BRD-05 | `GET /api/contributions/summary` (gọi `sp_calculate_contribution_scores`) | HTTP 200, B và C có `finalPct > 0` | 200; B 50.0, C 22.22, D 27.78, A 0.0 | Pass | Ghi chú: xem DEF-17 |
| IT-BRD-06 | `GET /api/contributions/evidence` của B | Có sự kiện hoàn thành card | 3 mục, có card của B | Pass | |
| IT-BRD-07 | Nguồn bằng chứng theo CR-02 | `sourceType = BOARD` | `sourceType = TRELLO` | **Fail** | DEF-16 |
| IT-BRD-08 | Xóa card đã hoàn thành | Sự kiện đã ghi không mất | Trước 2, sau 2 `CARD_COMPLETED` | Pass | |
| IT-BRD-09 | Kéo card vào **In Progress** nhưng gửi `toColumnName: "Done"` | Không sinh `CARD_COMPLETED` | Sinh 1 `CARD_COMPLETED` giả cho D | **Fail** | DEF-11 |
| IT-BRD-10 | Người ngoài nhóm (E) xem bảng đóng góp | HTTP 403 | HTTP 200, thấy điểm cả nhóm | **Fail** | DEF-12 |
| IT-BRD-11 | Người ngoài nhóm (E) xem log hoạt động nhóm | HTTP 403 | HTTP 200, lộ 7 sự kiện | **Fail** | DEF-12 |

**Nhận xét:** DoD Sprint 4 về board ("kéo thả sinh `ActivityEvent` đúng loại; card vào Done có `CARD_COMPLETED`, `delay_days`, `is_on_time` đúng"; "xóa card không làm mất sự kiện") **đạt**. Tuy nhiên mục tiêu chống gian lận (rủi ro R05) chưa đạt vì client tự khai tên cột đích (IT-BRD-09).

## 4. Luồng 2 – Chấm chéo → DB → ẩn danh

| Mã | Ca kiểm thử | Mong đợi | Thực tế | KQ | Defect |
|---|---|---|---|---|---|
| IT-PR-01 | `GET /api/review-rounds/sprint/{id}` | HTTP 200, có đợt chấm | HTTP 500 "Could not initialize proxy … no session" | **Fail** | DEF-13 |
| IT-PR-02 | A gửi đánh giá cho C | HTTP 200 và lưu 1 dòng | **Dòng đã lưu** nhưng API trả HTTP 500 | **Fail** | DEF-13 |
| IT-PR-03 | Response không chứa danh tính người chấm | Không có `reviewer`/email | Không có (do response là lỗi 500) | Pass* | *Cần chạy lại sau khi sửa DEF-13 |
| IT-PR-04 | C xem kết quả khi mới có **1** lượt | Không lộ điểm, nhận xét | `averageScore = 4.0`, `submissionCount = 1` → **lộ đúng điểm của người chấm duy nhất** | **Fail** | DEF-08 |
| IT-PR-05 | Tự chấm chính mình | HTTP 400 | HTTP 400 | Pass | |
| IT-PR-06 | Điểm 9 (ngoài thang 1–5) | HTTP 400 lỗi validation | HTTP 500 (bị CHECK constraint ở DB chặn) | **Fail** | DEF-15 |
| IT-PR-07 | Người ngoài nhóm (E) chấm thành viên | HTTP 403/400, không lưu | HTTP 500 nhưng **đã lưu 1 dòng vào DB** | **Fail** | DEF-10 |
| IT-PR-08 | B chấm D **3 lần** | Không được coi là đủ 3 lượt | `isAnonymousSafe = true`, hiện 3 nhận xét (đều của B) | **Fail** | DEF-09 |
| IT-PR-09 | 3 người khác nhau (A, B, D) chấm C | `isAnonymousSafe=true`, avg 4.0, 3 nhận xét, không lộ danh tính | Đúng như mong đợi | Pass | |
| IT-PR-10 | Trigger `PEER_REVIEW_SUFFICIENT` khi đủ 3 người | 1 alert | 1 alert | Pass | |
| IT-PR-11 | Người ngoài nhóm xem kết quả chấm của C | HTTP 403 | HTTP 200, thấy điểm trung bình | **Fail** | DEF-12 |

**Nhận xét:** DoD "Form chấm chéo gửi được đánh giá và lưu vào DB" **đạt ở tầng DB** nhưng API báo lỗi 500, nên người dùng sẽ thấy "gửi thất bại" và có thể gửi lại (làm trầm trọng DEF-09). Yêu cầu cốt lõi của đề tài, "chỉ hiện kết quả khi ≥ 3 lượt đánh giá", **chưa đạt** (DEF-08, DEF-09).

## 5. Môi trường & cách chạy lại

```bash
./scripts/staging-up.sh                         # dựng staging + smoke test (11 kiểm tra)
python3 scripts/integration-sprint4.py          # 22 ca tích hợp, ghi JSON kết quả
```
Smoke test staging cùng ngày: **11/11 PASS**, ổn định 5/5 lần chạy liên tiếp (`docs/qa/evidence/staging-smoke-2026-11-09.txt`).

## 6. Việc tiếp theo

1. Gửi defect log cho M1, M3, M4 (người xử lý đã ghi trong defect log), ưu tiên 4 lỗi High trước Sprint Review 10/11.
2. Chạy lại `integration-sprint4.py` sau mỗi PR sửa lỗi; ca chuyển Pass thì cập nhật bảng trên và đóng defect.
3. Đưa script vào GitHub Actions (job sau `docker-ci.yml`) để chặn hồi quy. Dự kiến làm ở Sprint 5.
