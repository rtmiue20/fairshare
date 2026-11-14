# MINI-PM REPORT – WP5 KIỂM THỬ & TRIỂN KHAI (BẢN NHÁP)

**Môn:** Quản lý dự án CNTT – UEH | **GVHD:** TS. Nguyễn Mạnh Tuấn | **Dự án:** FairShare
**Bản nháp:** 14/11/2026 (hạn nộp nháp 17/11, 23:00). Số liệu đến `master` @ `d2eab98`.
**Khung:** 7 mục theo `PCCV-Module.md` mục 10. Độ dài mục tiêu 3–5 trang.

> `<TODO: …>` = phần cần bổ sung sau UAT, release (18/11) và phần tự đánh giá cá nhân.

---

## 1. Thông tin chung

| | |
|---|---|
| Họ và tên | Khiếu Hoàng Nam Anh |
| MSSV | 31241022203 |
| Mã vị trí | M5 |
| Vai trò PM mini | PM QA & Deployment |
| Phân hệ phụ trách | WP5 – Kiểm thử & Triển khai: chiến lược và kế hoạch kiểm thử, CI/CD, Docker hóa, môi trường staging/demo, quản lý lỗi (Defect Log), kiểm thử tích hợp và hồi quy, phối hợp UAT |
| Nhánh Git | `nam-anh` (repo `rtmiue20/fairshare`) |

## 2. Mục tiêu phân hệ và tiêu chí hoàn thành

| Mục tiêu WP5 | Tiêu chí hoàn thành | Liên hệ mục tiêu dự án |
|---|---|---|
| Mọi thay đổi được kiểm tra tự động | CI chạy unit test, lint, build trên mọi nhánh và PR; `master` xanh | Giảm rủi ro R11 |
| Môi trường chạy giống thật, dựng lại nhanh | Docker Compose 3 service; staging dựng bằng 1 lệnh, có smoke test | Giảm rủi ro R13 |
| Kiểm chứng các cam kết cốt lõi | Ẩn danh (≥ 3 người chấm), chống gian lận, phân quyền, đúng luồng điểm đóng góp | Charter (yêu cầu cốt lõi) |
| Đạt G4 | Xuất PDF < 10 s (6 người, 4 sprint) | G4 |
| Hỗ trợ đạt G5 | UAT ≥ 10 người; ghi và phân loại lỗi UAT | G5 (M2 chủ trì) |
| Bàn giao | Release tag, bản demo, user guide, deployment guide, video dự phòng | Gói nghiệm thu tuần 8 |

## 3. Kế hoạch

### 3.1 Backlog theo sprint

| Giai đoạn | Công việc M5 (theo `docs/sprint*.md`) | Trạng thái |
|---|---|---|
| Sprint 1 | Chiến lược kiểm thử, tiêu chí chấp nhận; chọn môi trường triển khai; mẫu biên bản họp | ✅ |
| Sprint 2 | Test plan hoàn chỉnh; môi trường dev Docker Compose + MariaDB; CI cơ bản | ✅ |
| Sprint 3 | Test case auth/nhóm/board; bật CI chạy test; kiểm thử build đầu tiên | ✅ |
| Sprint 4 | Test tích hợp các module; CI/CD; staging Docker Compose; rà soát defect log | ✅ |
| Sprint 5 | Unit/integration/regression (luồng board → `ActivityEvent` → `ScoringEngine` → dashboard); đo hiệu năng PDF; defect log | ✅ |
| Sprint 6 | Bản UAT, tài khoản thử; ghi lỗi UAT; demo, user guide, video dự phòng; release; chương kiểm thử/triển khai | 🔄 Đang làm |
| Sprint 7 | Hoàn thiện báo cáo, Mini-PM Report, chuẩn bị bảo vệ | ⬜ |

Backlog chi tiết từng sprint được theo dõi trên Trello: board cá nhân "FairShare – WP5 QA & Deployment (M5)" và các card `[M5]` trên board nhóm "FairShare – QLDA CNTT".

### 3.2 Nguồn lực

- Con người: 1 người (M5), phối hợp với chủ module để sửa lỗi theo lát cắt dọc.
- Công cụ: GitHub Actions, Docker/Docker Compose, JUnit 5, Mockito, Testcontainers, Vitest, Python (script tích hợp), Trello.
- Môi trường: máy cá nhân của M5 làm staging. Nhóm chưa chốt máy chung (xem mục 6).

### 3.3 Rủi ro chính do WP5 phụ trách

| Mã | Rủi ro | Xác suất × Tác động | Biện pháp đã làm |
|---|---|---|---|
| **R11** | Tích hợp muộn, lỗi phát hiện trễ | 3 × 4 (Cao) | CI trên mọi nhánh từ Sprint 2; staging và test tích hợp từ Sprint 4; hồi quy trước mỗi Sprint Review |
| **R13** | Mất dữ liệu/code, mất truy cập hạ tầng | 2 × 5 (TB) | Git remote; staging dựng lại bằng 1 lệnh; lệnh sao lưu DB; mật khẩu sinh tự động, không commit; tài liệu triển khai |

## 4. Thực hiện

| Công việc | Kết quả / sản phẩm | Minh chứng |
|---|---|---|
| Docker hóa | Dockerfile backend (Maven → JRE 21 Alpine), frontend (Node 20 → Nginx), `docker-compose.yml` 3 service | PR #5 (merge 10/10), commit `252a4f5` |
| CI/CD | `backend-ci.yml`, `frontend-ci.yml`, `docker-ci.yml`; script chạy tay `scripts/ci-*.ps1` | Commit `7d51b53` (25/10), `18368ac` (02/11) |
| Test case & test Sprint 3 | 36 test case auth/user/frontend; báo cáo kiểm thử Sprint 3 | `docs/qa/test-cases-sprint3.md`, `test-report-sprint3.md` |
| Staging + tích hợp Sprint 4 | Staging 1 lệnh + smoke 11 kiểm tra; 23 ca tích hợp | Commit `a0d93d6` (09/11); `docs/deploy/staging.md`; `integration-log-sprint4.md` |
| Hồi quy + hiệu năng Sprint 5 | 30 ca hồi quy; đo PDF (G4) | Commit `c1b04be` (10/11); `test-report-sprint5.md`; PDF mẫu trong `docs/qa/evidence/` |
| Defect Log | 28 lỗi, mỗi lỗi có mức độ, người xử lý, bằng chứng, đề xuất sửa | `docs/qa/defect-log.md` |
| Sprint 6 (đến 14/11) | Rà soát mã nguồn 9 lỗi đã sửa; chạy lại unit test; phát hiện DEF-27, 28; user guide; nháp chương kiểm thử/triển khai | `docs/qa/evidence/*-2026-11-14.txt`, `docs/deploy/user-guide.md`, `docs/report/M5-chuong-kiem-thu-trien-khai.md` |
| UAT, demo, release | `<TODO: số lỗi UAT đã ghi; URL/video demo; release tag 18/11>` | `<TODO>` |

Tổng số commit của M5 trên repo: khoảng 22 (tác giả `Nvm4nh`, `Khiếu Hoàng Nam Anh`). `<TODO: chụp ảnh lịch sử commit/PR có ngày giờ>`

## 5. Kiểm thử

| Bộ test | Kết quả nổi bật |
|---|---|
| Unit backend | 26 test (02/11) → 124 (10/11) → **178 (14/11)**. 14/11 có 4 lỗi mới (DEF-27) |
| Unit frontend | 17 → 65 → **74/74 pass** |
| Tích hợp | 11/22 (09/11) → 18/23 (10/11) → **21/23** (11/11) |
| Hồi quy Sprint 5 | 13/30 → **20/30** (11/11); 25/30 khi vá DEF-20 |
| Hiệu năng PDF (G4) | Chậm nhất 0,109 s, mục tiêu < 10 s → **Đạt** |
| UAT | `<TODO: số phiếu, mức hài lòng G5 – M2 cung cấp 17/11>` |

**Lỗi tiêu biểu và cách xử lý:**
- **DEF-08/09 (High) – lộ điểm chấm chéo:** test tích hợp cho thấy điểm hiện ra khi mới có 1 lượt chấm, và một người chấm nhiều lần cũng được tính đủ ngưỡng. M5 báo kèm ca tái hiện, M4 sửa trong 1 ngày (PR #57). M5 chạy lại và đóng ngày 10/11.
- **DEF-11 (High) – giả mạo hoàn thành card:** client tự gửi tên cột "Done". Lỗi này ứng với rủi ro gian lận R05. M1 sửa, M5 đóng 11/11.
- **DEF-20 (High) – PDF luôn lỗi 500:** unit test dùng mock nên không phát hiện, chỉ test tích hợp mới bắt được. M5 thử bản vá 1 dòng để chứng minh nguyên nhân và đo hiệu năng trước, rồi giao M0 sửa chính thức.

## 6. Quản lý: một vấn đề đã xử lý

**Vấn đề:** Ngày 10–11/11, trước Sprint Review 12/11, hồi quy cho thấy chức năng xuất PDF (cần cho G4 và buổi demo) lỗi 100%, và 3 hạng mục DoD Sprint 5 chưa đạt (DEF-22, 24, 25).

**Cách xử lý theo góc độ quản lý dự án:**
1. **Đánh giá tác động:** xếp DEF-20 vào mức High vì nó chặn DoD và chặn demo. Ước lượng công sửa (1 dòng) bằng cách thử bản vá tạm trên staging, không commit.
2. **Truyền đạt:** ghi vào Defect Log bảng "theo người xử lý", kèm hạn (trước code freeze 11/11 17:00). Báo M0 trong Sprint Review để quyết định: sửa ngay, hoặc ghi Change Log / chuyển sang Sprint 6.
3. **Giảm rủi ro cho UAT:** đề xuất M2 tránh luồng PDF và dashboard nhóm khác khi chạy UAT cho tới khi lỗi được sửa.
4. **Kết quả:** DEF-24, 25 đóng 11/11. DEF-20, 22 được sửa trong code tới 14/11 và đang chờ retest. `<TODO: kết quả retest trước release>`

**Vấn đề thứ hai (đang xử lý):** staging chỉ chạy trên máy cá nhân M5. Ngày 14/11, máy kiểm thử thiếu Docker nên không retest được. Đây là rủi ro R13 đã xảy ra một phần. Biện pháp: ghi rõ 9 lỗi "Fixed – chờ retest" thay vì đóng sai; đề xuất M0 chốt máy chung; chuẩn bị video demo dự phòng. `<TODO: cập nhật kết quả>`

## 7. Tổng kết

**Khó khăn:**
- Kế hoạch kiểm thử ban đầu xoay quanh tích hợp Trello. Sau CR-02, phải viết lại các ca kiểm thử theo board nội bộ, và kiểm tra việc gỡ mã Trello không làm hỏng dữ liệu cũ.
- Lỗi phát hiện dồn vào cuối Sprint 4–5, vì staging có muộn (Sprint 4) so với kế hoạch.
- Môi trường kiểm thử phụ thuộc máy cá nhân (Docker, proxy SSL khi build).

**Bài học:**
- Nên dựng staging và test tích hợp sớm hơn, ngay khi có lát cắt dọc đầu tiên (Sprint 2–3).
- Mock trong unit test che giấu lỗi tầng CSDL. Mỗi luồng quan trọng cần ít nhất một test tích hợp gọi API thật.
- Chỉ đóng lỗi khi có ca kiểm thử chạy lại đạt. Đóng theo lời báo "đã sửa" từng dẫn tới đóng sai (DEF-07).

**Tự đánh giá đóng góp:** `<TODO: % tự đánh giá, số giờ ước tính, đối chiếu bảng đóng góp FairShare của nhóm>`

**Đề xuất cải thiện:**
- Chạy test tích hợp trong CI (`docker-ci.yml` + `integration-sprint4.py`) để không phụ thuộc máy cá nhân.
- Thêm test end-to-end giao diện (Playwright) cho 3 luồng chính: board, chấm chéo, xuất PDF.
