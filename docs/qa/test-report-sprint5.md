# Báo cáo kiểm thử Sprint 5 – Regression, luồng điểm đóng góp và hiệu năng PDF

**Dự án:** FairShare | **Phân hệ:** WP5 – Kiểm thử & Triển khai | **Người thực hiện:** M5 – Khiếu Hoàng Nam Anh
**Công việc Sprint 5 (docs/sprint5.md):** "Kiểm thử: unit/integration/regression (gồm luồng board → `ActivityEvent` → `ScoringEngine` → dashboard), defect log, đo hiệu năng PDF"
**Ngày chạy:** 10/11/2026, 20:00–20:12 (GMT+7) | **Mã nguồn:** `master` @ `0ed8f05` (repo không có nhánh `develop`, nên chạy trên `master`)
**Môi trường:** staging Docker Compose (Nginx → Spring Boot `prod` → MariaDB 10.11, 18 migration), nạp seed M3 `large_dataset_500_tasks.sql` (team 1, 6 thành viên, 500 sự kiện, 100 sự kiện/sprint × 5 sprint)

## 1. Kết luận nhanh

| Hạng mục Sprint 5 | Kết quả | Đạt DoD? |
|---|---|---|
| Unit test backend + frontend | BE 124 test, 0 lỗi, 7 skip · FE 65/65 | Đạt |
| Integration (board, chấm chéo) | 18/23 (`integration-log-sprint4.md`, chạy lại 10/11) | Đạt phần ẩn danh; còn DEF-11, 12, 16 |
| Luồng board → `ActivityEvent` → `ScoringEngine` | **8/8** | **Đạt** |
| → dashboard | **2/5**: dashboard gán cứng `teamId = 1` và gọi 2 API không tồn tại | **Không đạt** (DEF-22) |
| Phân quyền leader/thành viên trên board | **2/6**: chưa có phân quyền | **Không đạt** (DEF-24) |
| Gỡ Trello legacy | **0/3** trên `master` | **Không đạt** (DEF-25) |
| Xuất PDF + hiệu năng G4 | Trên `master`: **mọi lần xuất PDF trả HTTP 500**. Trên bản vá 1 dòng: chậm nhất **0,078 s** (mục tiêu < 10 s) | **Không đạt** trên `master` (DEF-20); hiệu năng đạt khi sửa |
| Defect log | Cập nhật 26 lỗi, thêm DEF-20..26, mỗi lỗi có người nhận | Đạt |

**Có dùng lại được kết quả ngày 09–10/11 không?** Dùng được cho phần unit test và integration (board, chấm chéo ẩn danh). Nhưng các kết quả đó **chưa đủ** cho Sprint 5 vì chưa kiểm tra `ScoringEngine` (`/calculate`), dashboard, phân quyền board, gỡ Trello và chưa đo PDF. Phần thiếu đã được bổ sung bằng `scripts/regression-sprint5.py` (30 ca).

## 2. Tổng hợp các bộ test (10/11/2026)

| # | Bộ test | Lệnh | Kết quả |
|---|---|---|---|
| 1 | Unit backend (JUnit 5, Mockito, Testcontainers) | `cd fairshare-backend && mvn test` | **124 chạy, 0 fail, 7 skip** (nhóm `AuthContract` còn `@Disabled` – DEF-01) |
| 2 | Unit frontend (Vitest) | `cd frontend && npx vitest run` | **15 file, 65/65 PASS** |
| 3 | Smoke staging | `./scripts/staging-smoke.sh` | **11/11 PASS** |
| 4 | Integration Sprint 4 (board, chấm chéo) | `python3 scripts/integration-sprint4.py` | **18/23 PASS** (2 lần, giống nhau) |
| 5 | Regression Sprint 5 (bản `master`) | `python3 scripts/regression-sprint5.py` | **13/30 PASS** |
| 6 | Regression Sprint 5 (bản vá PDF tạm, chỉ để đo) | như trên, backend vá 1 dòng | 18/30 PASS (PDF 5/8) |

## 3. Regression Sprint 5 – chi tiết (bản `master`)

Dữ liệu riêng: nhóm 6 người tên tiếng Việt có dấu (Ánh – trưởng nhóm, Bích, Cường, Dũng, Én, Phú) và 1 người ngoài nhóm. Card: Bích 3 SP đúng hạn, Cường 3 SP trễ 2 ngày, Dũng 8 SP chỉ tạo, Én 3 SP đúng hạn, Phú không có việc (sau đó thêm 5 SP).

### 3.1 Board → `ActivityEvent` → `ScoringEngine` (8/8)

| Mã | Ca kiểm thử | Mong đợi | Thực tế | KQ |
|---|---|---|---|---|
| SCR-01 | `POST /api/contributions/sprints/{id}/calculate` | 200, 6 thành viên | 200, 6 dòng | Pass |
| SCR-02 | Tổng tỷ lệ đóng góp | = 100% | 1,0000 (API trả dạng 0–1) | Pass |
| SCR-03 | Cùng 3 SP: đúng hạn > trễ hạn | Bích > Cường | 31,42 > 13,69 | Pass |
| SCR-04 | Không hoạt động không cao hơn người có card Done | Phú ≤ min | 4,08 | Pass |
| SCR-05 | Chỉ tạo card 8 SP ≤ hoàn thành 3 SP đúng hạn | Dũng ≤ Én | 15,30 ≤ 31,42 | Pass |
| SCR-06 | Điểm lưu DB và đọc lại (`GET /contributions/sprints/{id}`) | Khớp | 6 dòng, khớp | Pass |
| SCR-07 | Hồi quy đủ luồng: Phú hoàn thành card mới → tính lại | Điểm Phú tăng | 4,08 → 36,65 | Pass |
| SCR-08 | `ScoringEngine` và routine `/summary` cùng xếp người đứng đầu | Giống nhau | Cả hai: Phú | Pass |

Ghi chú SCR-05/08: `ScoringEngine` xử lý đúng ca "chỉ tạo card" (Dũng 15,30 < Én 31,42), nhưng routine `/summary` mà dashboard và PDF dùng lại cho Dũng 22,22% > Én 16,67%. Hai nguồn điểm vẫn chưa thống nhất → cập nhật DEF-17.

### 3.2 Dashboard (2/5)

| Mã | Ca kiểm thử | Mong đợi | Thực tế | KQ | Defect |
|---|---|---|---|---|---|
| DASH-01 | Dashboard dùng `teamId` của nhóm đang chọn | Không gán cứng | 4 lời gọi `contributionApi.*(1, …)` trong `ContributionDashboard.tsx` (dòng 404–406, 447) | **Fail** | DEF-22 |
| DASH-02 | `GET /api/teams/{teamId}/contributions` (frontend gọi) | 200 | **500** "No static resource" – backend không có endpoint này | **Fail** | DEF-22, DEF-23 |
| DASH-03 | `GET /api/contributions/summary` | 200, 6 dòng | 200, 6 dòng | Pass | |
| DASH-04 | `GET /api/contributions/evidence` | 200, có card | 200 | Pass | |
| DASH-05 | `GET /api/teams/{teamId}/contributions/{userId}/evidence` (frontend gọi) | 200 | **500**, không có endpoint | **Fail** | DEF-22, DEF-23 |

### 3.3 Phân quyền board (2/6)

| Mã | Ca kiểm thử | Mong đợi | Thực tế | KQ | Defect |
|---|---|---|---|---|---|
| PERM-01 | Thành viên tạo cột | 403 | 201 | **Fail** | DEF-24 |
| PERM-02 | Thành viên đổi tên board | 403 | 200 | **Fail** | DEF-24 |
| PERM-03 | Thành viên kéo card của người khác | 403 | 200 | **Fail** | DEF-24 |
| PERM-04 | Thành viên kéo card của mình | 200 | 200 | Pass | |
| PERM-05 | Leader tạo cột | 200/201 | 201 | Pass | |
| PERM-06 | Người ngoài nhóm kéo card | 403 | 200 | **Fail** | DEF-24 |

### 3.4 Gỡ Trello legacy – CR-02 (0/3)

| Mã | Ca kiểm thử | Mong đợi | Thực tế | KQ | Defect |
|---|---|---|---|---|---|
| TRL-01 | Đã xóa `integration/trello`, `TrelloClientTest`, `ConnectTrelloPage.tsx`, `integration.api.ts` | 0 còn lại | Còn **4/4** | **Fail** | DEF-25 |
| TRL-02 | Router, menu không còn route `integration` | 0 file | `router.tsx`, `Sidebar.tsx`, `AnimatedTopDock.tsx`, `ConnectTrelloPage.tsx` | **Fail** | DEF-25 |
| TRL-03 | Sự kiện nguồn `TRELLO` không làm lỗi summary/calculate/activities/PDF | 200 × 4 | 200, 200, 200, **500** (PDF lỗi do DEF-20, không do dữ liệu Trello) | **Fail** | DEF-20 |

### 3.5 PDF (1/8 trên `master`)

| Mã | Ca kiểm thử | Mong đợi | `master` | Bản vá tạm | Defect |
|---|---|---|---|---|---|
| PDF-01 | G4: 6 người, sprint 1–4 (100 sự kiện/sprint), 11 lần/sprint | 200, %PDF, < 10 s | **500 mọi lần** | Pass, chậm nhất 0,078 s | DEF-20 |
| PDF-02 | Đủ 6 thành viên trong PDF | Đủ 6 | Fail (500) | Pass | DEF-20 |
| PDF-03 | Có điểm chấm chéo khi đủ 3 người chấm | Có `x.x/5` | Fail (500) | Pass | DEF-20 |
| PDF-04 | Có bằng chứng chính | Có tên task | Fail (500) | Pass | DEF-20 |
| PDF-05 | Tên tiếng Việt có dấu | "Trần Thị Bích" | Fail (500) | **Fail**: "Trn Th Bích", "Phm c Dng" | DEF-21 |
| PDF-06 | Người ngoài nhóm tải PDF | 403 | 500 | **Fail**: 200 | DEF-12 |
| PDF-07 | Sprint không tồn tại | 404 | 404 | Pass | |
| PDF-08 | Ghép team 1 với sprint của nhóm khác | 400/404 | 500 | **Fail**: 200, vẫn xuất | DEF-26 |

## 4. Đo hiệu năng xuất PDF (mục tiêu G4 < 10 giây)

**Trên `master` @ `0ed8f05`: không đo được.** 100% yêu cầu `GET /api/reports/teams/{teamId}/sprints/{sprintId}/pdf` trả HTTP 500 "Transaction silently rolled back because it has been marked as rollback-only". Nguyên nhân: `PdfReportService.generateSprintReportPdf` có `@Transactional(readOnly = true)` nhưng gọi `sp_calculate_contribution_scores`, routine này ghi bảng điểm nên MariaDB từ chối ("Cannot execute statement in a READ ONLY transaction"). Unit test `PdfReportServiceTest` dùng mock nên không bắt được lỗi. Ghi nhận DEF-20.

**Đo tham khảo trên bản vá tạm** (chỉ đổi `@Transactional(readOnly = true)` → `@Transactional`, build riêng, không commit):
- Phương pháp: đo phía client qua Nginx. Mỗi sprint xuất 1 lần lạnh + 10 lần liên tiếp. Thời gian phía server lấy từ log `PdfReportService`.
- Dữ liệu: team 1 seed M3 (6 thành viên, 100 sự kiện mỗi sprint) + đợt chấm chéo sprint 4 với 3 người chấm.

| Sprint | Sự kiện | Lần đầu (s) | p50 (s) | p95 (s) | Chậm nhất (s) | Dung lượng | So với G4 (< 10 s) |
|---|---|---|---|---|---|---|---|
| 1 | 100 | 0,077 | 0,059 | 0,078 | 0,078 | 5,2 KB | Đạt |
| 2 | 100 | 0,056 | 0,043 | 0,059 | 0,059 | 5,2 KB | Đạt |
| 3 | 100 | 0,038 | 0,024 | 0,044 | 0,044 | 5,1 KB | Đạt |
| 4 | 100 | 0,047 | 0,033 | 0,040 | 0,040 | 5,1 KB | Đạt |

Phía server (51 lần xuất): nhanh nhất 10 ms, trung vị 27 ms, chậm nhất 204 ms.
**Kết luận:** sau khi sửa DEF-20, hiệu năng PDF dư sức đạt G4 (nhanh hơn mục tiêu khoảng 128 lần ở lần chậm nhất). Rủi ro "PDF chậm" coi như không còn. Rủi ro "lỗi font tiếng Việt" **đã xảy ra** (DEF-21).

Minh chứng: `docs/qa/evidence/pdf-sample-team1-sprint4-patched.pdf`, `pdf-sample-vietnamese-patched.pdf`, `regression-result-sprint5-pdf-patched.json`.

## 5. Defect phát sinh Sprint 5

| Mã | Mức độ | Tóm tắt | Người xử lý |
|---|---|---|---|
| DEF-20 | **High** | Xuất PDF luôn 500 (transaction readOnly gọi routine có ghi) | M0 |
| DEF-21 | Medium | PDF mất dấu tiếng Việt (font Helvetica không có Unicode) | M0 |
| DEF-22 | **High** | Dashboard gán cứng `teamId = 1` và gọi 2 endpoint không tồn tại | M3 |
| DEF-23 | Low | Đường dẫn API không tồn tại trả 500 thay vì 404 | M1 |
| DEF-24 | **High** | Chưa có phân quyền leader/thành viên trên board (DoD Sprint 5) | M1 |
| DEF-25 | Medium | Chưa gỡ Trello legacy (DoD Sprint 5) | M1 |
| DEF-26 | Medium | PDF xuất được khi sprint không thuộc team | M0 |

Chi tiết, bằng chứng và đề xuất sửa: `docs/qa/defect-log.md`.

## 6. Đề xuất trước code freeze (11/11, 17:00)

1. **M0 sửa DEF-20 ngay** (1 dòng). Nếu không, buổi demo PDF ở Sprint Review 12/11 sẽ lỗi. Sau đó M5 chạy lại `regression-sprint5.py` để có số đo chính thức trên `master`.
2. M3 sửa DEF-22 để dashboard hiển thị đúng nhóm. M1 trao đổi với M0 về phạm vi DEF-24, DEF-25: cả hai thuộc DoD Sprint 5, nếu không kịp thì ghi vào Change Log hoặc chuyển sang Sprint 6.
3. M2 lưu ý khi chạy UAT: tránh luồng xuất PDF và dashboard của nhóm khác team 1 cho tới khi DEF-20, DEF-22 được sửa.

## 7. Cách chạy lại

```bash
./scripts/staging-up.sh reset && ./scripts/staging-up.sh
docker compose -p fairshare-staging exec -T db sh -c 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' \
  < fairshare-backend/src/main/resources/seed/large_dataset_500_tasks.sql
python3 scripts/integration-sprint4.py
python3 scripts/regression-sprint5.py          # PDF_RUNS=10 mặc định
```
Seed phải nạp **trước** khi có tài khoản nào được đăng ký, vì seed dùng `users.id` 1–6.
