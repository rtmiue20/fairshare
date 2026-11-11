# Integration Log – Sprint 4

**Dự án:** FairShare | **Phân hệ:** WP5 – Kiểm thử & Triển khai | **Người thực hiện:** M5 – Khiếu Hoàng Nam Anh
**Thẻ Trello:** "[M5] Tích hợp: Test các module"
**Môi trường:** Staging Docker Compose (`fairshare-staging`): Nginx → Spring Boot (profile `prod`) → MariaDB 10.11
**Công cụ:** `scripts/integration-sprint4.py` (gọi API thật qua Nginx, đối chiếu dữ liệu bằng SQL trong container DB)
**Kết quả máy đọc:** `docs/qa/integration-result-sprint4.json` | **Log:** `docs/qa/evidence/integration-run-2026-11-10.txt`

## 1. Các lần chạy

| Lần | Ngày giờ (GMT+7) | Mã nguồn | Migration | Smoke staging | Unit test BE / FE | Tích hợp | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | 09/11/2026 16:50 | `master` @ `c32a069` | 16 (V1–V16) | 11/11 PASS | (chưa chạy) | **11/22 PASS** | Lần đầu, phát hiện DEF-08..18 |
| 2 | **10/11/2026 20:03** | `master` @ `0ed8f05` (sau PR #56, #57, #59, #61) | 18 (V1–V18) | **11/11 PASS** | **124 test, 0 lỗi, 7 skip / 65/65 PASS** | **18/23 PASS** | Chạy lại sau khi M4 sửa chấm chéo (PR #57). Lặp 2 lần, kết quả giống hệt |

Lần 2 có thêm ca **IT-PR-00** vì PR #57 bổ sung API tạo/mở đợt chấm (trước đây phải tạo đợt bằng SQL).

## 2. Tóm tắt lần chạy 10/11

| Luồng | Số ca | Pass | Fail | So với 09/11 | Kết luận |
|---|---|---|---|---|---|
| 1. Board → ActivityEvent → API tổng hợp đóng góp / truy vết | 11 | 7 | 4 | Không đổi | Luồng chính đạt DoD; còn lỗ hổng chống gian lận và phân quyền |
| 2. Chấm chéo → DB → kết quả ẩn danh | 12 | 11 | 1 | 4/11 → **11/12** | **Đạt** yêu cầu ẩn danh (≥ 3 người chấm khác nhau); chỉ còn lỗi phân quyền xem kết quả |
| **Tổng** | **23** | **18** | **5** | 11/22 → **18/23** | 5 ca fail ứng với 3 defect còn mở: DEF-11, DEF-12, DEF-16 |

## 3. Dữ liệu kiểm thử

Mỗi lần chạy, script tự tạo dữ liệu riêng, không dùng dữ liệu thật của nhóm:
- 5 tài khoản: A (trưởng nhóm), B, C, D (thành viên), **E (người ngoài nhóm)**.
- 1 team, 1 sprint (từ hôm nay −3 đến +4 ngày), 1 board với 4 cột mặc định `To Do / In Progress / Review / Done`.
- 3 card: B – 3 SP, hạn +2 ngày (đúng hạn); C – 2 SP, hạn −1 ngày (trễ); D – 5 SP (dùng cho ca giả mạo).
- 1 đợt chấm chéo tạo bằng API, ngưỡng ẩn danh mặc định 3.

## 4. Luồng 1 – Board → ActivityEvent → đóng góp

| Mã | Ca kiểm thử | Mong đợi | Thực tế 10/11 | 09/11 | 10/11 | Defect |
|---|---|---|---|---|---|---|
| IT-BRD-01 | Tạo 3 card | 3 `CARD_CREATED`, `source=BOARD`, gắn đúng sprint | 3 sự kiện, source BOARD, đúng sprint | Pass | **Pass** | |
| IT-BRD-02 | Kéo card To Do → In Progress | Sinh `CARD_MOVED` | 1 `CARD_MOVED` của B | Pass | **Pass** | |
| IT-BRD-03 | Card vào Done trước hạn | `is_on_time=true`, `delay_days=0`, SP=3 | (true, 0.0, 3.0) | Pass | **Pass** | |
| IT-BRD-04 | Card vào Done trễ 1 ngày | `is_on_time=false`, `delay_days≈1` | (false, 1.0) | Pass | **Pass** | |
| IT-BRD-05 | `GET /api/contributions/summary` | HTTP 200, B và C có `finalPct > 0` | 200; B 50.0, C 22.22, D 27.78, A 0.0 | Pass | **Pass** | Ghi chú DEF-17 |
| IT-BRD-06 | `GET /api/contributions/evidence` của B | Có sự kiện hoàn thành card | 3 mục, có card của B | Pass | **Pass** | |
| IT-BRD-07 | Nguồn bằng chứng theo CR-02 | `sourceType = BOARD` | `sourceType = TRELLO` | Fail | **Fail** | DEF-16 |
| IT-BRD-08 | Xóa card đã hoàn thành | Sự kiện đã ghi không mất | Trước 2, sau 2 `CARD_COMPLETED` | Pass | **Pass** | |
| IT-BRD-09 | Kéo card vào In Progress nhưng gửi `toColumnName: "Done"` | Không sinh `CARD_COMPLETED` | Sinh 1 `CARD_COMPLETED` giả | Fail | **Fail** | DEF-11 |
| IT-BRD-10 | Người ngoài nhóm xem bảng đóng góp | HTTP 403 | HTTP 200 | Fail | **Fail** | DEF-12 |
| IT-BRD-11 | Người ngoài nhóm xem log hoạt động | HTTP 403 | HTTP 200, lộ 7 sự kiện | Fail | **Fail** | DEF-12 |

## 5. Luồng 2 – Chấm chéo → DB → ẩn danh

| Mã | Ca kiểm thử | Mong đợi | Thực tế 10/11 | 09/11 | 10/11 | Defect |
|---|---|---|---|---|---|---|
| IT-PR-00 | Trưởng nhóm tạo + mở đợt; thành viên thường thử tạo | Tạo 201, mở 200 (OPEN); thành viên → 4xx | 201, 200 (OPEN); B → 400 | (chưa có API) | **Pass** | DEF-14 đóng · ghi chú DEF-19 |
| IT-PR-01 | Liệt kê đợt chấm theo sprint | HTTP 200, có đợt chấm | HTTP 200, có đợt | Fail | **Pass** | DEF-13 đóng |
| IT-PR-02 | A gửi đánh giá cho C | HTTP 200 và lưu 1 dòng | HTTP 200; DB có đúng 1 dòng | Fail | **Pass** | DEF-13 đóng |
| IT-PR-03 | Response không chứa danh tính người chấm | HTTP 200, không có `reviewer`/email | Không có | Pass* | **Pass** | |
| IT-PR-04 | Xem kết quả khi mới có 1 lượt | Không lộ điểm, nhận xét | `averageScore = 0`, nhận xét rỗng, `isAnonymousSafe = false` | Fail | **Pass** | DEF-08 đóng |
| IT-PR-05 | Tự chấm chính mình | HTTP 400 | HTTP 400 | Pass | **Pass** | |
| IT-PR-06 | Điểm 9 (ngoài thang 1–5) | HTTP 400 | HTTP 400 | Fail | **Pass** | DEF-15 đóng |
| IT-PR-07 | Người ngoài nhóm chấm thành viên | 4xx và không lưu | HTTP 400, 0 dòng trong DB | Fail | **Pass** | DEF-10 đóng |
| IT-PR-08 | B chấm D 3 lần | Lần 2, 3 bị từ chối; chưa đủ ngưỡng | 200 / 400 / 400; `isAnonymousSafe = false` | Fail | **Pass** | DEF-09 đóng |
| IT-PR-09 | 3 người khác nhau chấm C | Hiện avg 4.0, 3 nhận xét, không lộ danh tính | Đúng như mong đợi | Pass | **Pass** | |
| IT-PR-10 | Trigger `PEER_REVIEW_SUFFICIENT` | 1 alert | 1 alert | Pass | **Pass** | |
| IT-PR-11 | Người ngoài nhóm xem kết quả chấm của C | HTTP 403 | HTTP 200, thấy avg 4.0 | Fail | **Fail** | DEF-12 |

\* Lần 1 ca này "pass" chỉ vì API trả lỗi 500. Lần 2 đã kiểm tra trên response 200 thật.

## 6. Unit test (chạy cùng ngày 10/11)

| Bộ test | Lệnh | Kết quả | Ghi chú |
|---|---|---|---|
| Backend (JUnit 5, Mockito, Testcontainers MariaDB) | `cd fairshare-backend && mvn test` | **124 chạy, 0 fail, 0 error, 7 skip**, BUILD SUCCESS | 7 skip là nhóm `AuthApiTest.AuthContract` vẫn `@Disabled` (DEF-01). Còn 2 test giả `assertTrue(true)` (DEF-07) |
| Frontend (Vitest + Testing Library) | `cd frontend && npx vitest run` | **15 file, 65/65 PASS** | |

## 7. Cách chạy lại

```bash
./scripts/staging-up.sh                         # dựng staging + smoke test (11 kiểm tra)
python3 scripts/integration-sprint4.py          # 23 ca tích hợp, ghi JSON kết quả
```

## 8. Việc tiếp theo

1. M1: sửa DEF-11 (giả mạo cột Done) và hàm kiểm tra thành viên dùng chung cho DEF-12. M3, M4 áp dụng hàm đó cho module của mình.
2. M3: sửa DEF-16 (nguồn bằng chứng) và xác nhận DEF-17 (công thức điểm).
3. M5: bật lại `AuthContract` (DEF-01), xóa `TrelloClientTest` (DEF-07), chạy lại script sau mỗi PR sửa lỗi.
