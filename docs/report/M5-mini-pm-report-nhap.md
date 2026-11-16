# MINI-PM REPORT – WP5 KIỂM THỬ & TRIỂN KHAI (BẢN NHÁP)

**Môn:** Quản lý dự án CNTT – UEH | **GVHD:** TS. Nguyễn Mạnh Tuấn | **Dự án:** FairShare
**Bản nháp:** 16/11/2026 (hạn nộp nháp 17/11, 23:00). Số liệu đến `master` @ `f18a705`, retest staging 16/11 lúc 23:00–23:30 (GMT+7).
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
| Defect Log | 42 lỗi (16/11: 33 Closed, 8 Open, 1 Rejected), mỗi lỗi có mức độ, người xử lý, bằng chứng, đề xuất sửa | `docs/qa/defect-log.md` |
| Sprint 6 (14–15/11) | Rà soát mã nguồn; chạy lại unit test; dựng staging trên Windows (sửa script, DEF-30); retest tích hợp 23/23, hồi quy 30/30; đóng 11 lỗi (gồm DEF-01, 18); chuẩn bị 12 tài khoản và dữ liệu UAT; pilot UAT 24 ca phát hiện DEF-31..37; quay video demo dự phòng (phát hiện DEF-38); 14 ảnh user guide; user guide; nháp chương kiểm thử/triển khai | `docs/qa/evidence/*-2026-11-1[45].*`, `docs/qa/defect-log.md`, `docs/deploy/user-guide.md`, `docs/report/M5-chuong-kiem-thu-trien-khai.md` |
| Sprint 6 (16/11) | Retest trên `master` @ `f18a705`: tích hợp 23/23, hồi quy 30/30, pilot UAT 20/24, unit BE 233/233, FE 86/86; đóng 7 lỗi (DEF-27, 33..38); phát hiện 3 lỗi mới bằng script retest mới (DEF-40, 41 High; DEF-42); khôi phục defect log bị merge ghi đè; bàn giao UAT cho M2; so sánh nơi chạy demo, checklist và script seed demo | Commit `8c4ee88`, `b3166ef`, `3ce0a9b`; `docs/qa/evidence/README.md`; `docs/qa/uat/uat-handoff-M2.md`; `docs/deploy/demo-hosting.md`, `demo-checklist.md` |
| UAT, demo, release | Môi trường UAT + 12 tài khoản (`scripts/uat-seed.py`); pilot UAT (`scripts/uat-pilot.py`); retest (`scripts/retest-sprint6.py`); tài khoản demo riêng (`scripts/demo-seed.py`); video demo 102 giây (`scripts/record-demo.ps1`); ảnh user guide (`scripts/capture-screens.ps1`). `<TODO: số lỗi UAT chính thức; release tag 18/11>` | `docs/qa/uat/`, `docs/deploy/`, `docs/qa/evidence/user-guide/`, video trên Google Drive |

Tổng số commit của M5 trên repo: 31 (tác giả `Nvm4nh`, `Khiếu Hoàng Nam Anh`, đếm 16/11, không tính merge). `<TODO: chụp ảnh lịch sử commit/PR có ngày giờ>`

## 5. Kiểm thử

| Bộ test | Kết quả nổi bật |
|---|---|
| Unit backend | 26 test (02/11) → 124 (10/11) → 178 (14/11) → 195, 4 lỗi (15/11) → **233, 0 lỗi, 0 skip (16/11, trong Docker)** |
| Unit frontend | 17 → 65 → 74 (14/11) → **86/86 pass** (16/11) |
| Tích hợp | 11/22 (09/11) → 18/23 (10/11) → 21/23 (11/11) → 23/23 (15/11) → **23/23** (16/11) |
| Hồi quy Sprint 5 | 13/30 (10/11) → 20/30 (11/11) → 30/30 (15/11) → **30/30** (16/11) |
| Hiệu năng PDF (G4) | Chậm nhất **0,064 s** trên `master` @ `f18a705` (16/11; 15/11: 0,078 s), mục tiêu < 10 s → **Đạt** |
| Pilot UAT (M5) | 14/24 (15/11) → **20/24** (16/11); 4 ca còn lỗi đều thuộc DEF-31, 32 |
| Retest Sprint 6 (script mới) | **2/9** (16/11): DEF-38 đạt; phát hiện DEF-40, 41 (High), DEF-42; DEF-19 chưa sửa |
| UAT chính thức | `<TODO: số phiếu, mức hài lòng G5 – M2 cung cấp 17/11>` |

**Lỗi tiêu biểu và cách xử lý:**
- **DEF-08/09 (High) – lộ điểm chấm chéo:** test tích hợp cho thấy điểm hiện ra khi mới có 1 lượt chấm, và một người chấm nhiều lần cũng được tính đủ ngưỡng. M5 báo kèm ca tái hiện, M4 sửa trong 1 ngày (PR #57). M5 chạy lại và đóng ngày 10/11.
- **DEF-11 (High) – giả mạo hoàn thành card:** client tự gửi tên cột "Done". Lỗi này ứng với rủi ro gian lận R05. M1 sửa, M5 đóng 11/11.
- **DEF-20 (High) – PDF luôn lỗi 500:** unit test dùng mock nên không phát hiện, chỉ test tích hợp mới bắt được. M5 thử bản vá 1 dòng để chứng minh nguyên nhân và đo hiệu năng trước, rồi giao M0 sửa chính thức. Đóng 15/11 sau retest.

## 6. Quản lý: một vấn đề đã xử lý

**Vấn đề:** Ngày 10–11/11, trước Sprint Review 12/11, hồi quy cho thấy chức năng xuất PDF (cần cho G4 và buổi demo) lỗi 100%, và 3 hạng mục DoD Sprint 5 chưa đạt (DEF-22, 24, 25).

**Cách xử lý theo góc độ quản lý dự án:**
1. **Đánh giá tác động:** xếp DEF-20 vào mức High vì nó chặn DoD và chặn demo. Ước lượng công sửa (1 dòng) bằng cách thử bản vá tạm trên staging, không commit.
2. **Truyền đạt:** ghi vào Defect Log bảng "theo người xử lý", kèm hạn (trước code freeze 11/11 17:00). Báo M0 trong Sprint Review để quyết định: sửa ngay, hoặc ghi Change Log / chuyển sang Sprint 6.
3. **Giảm rủi ro cho UAT:** đề xuất M2 tránh luồng PDF và dashboard nhóm khác khi chạy UAT cho tới khi lỗi được sửa.
4. **Kết quả:** DEF-24, 25 đóng 11/11. DEF-20, 22 đóng 15/11 sau retest; hồi quy đạt 30/30.

**Vấn đề thứ hai:** staging chỉ chạy trên máy cá nhân M5. Ngày 14/11, máy kiểm thử thiếu Docker nên không retest được. Đây là rủi ro R13 đã xảy ra một phần. Biện pháp: (1) ghi rõ 9 lỗi "Fixed – chờ retest" thay vì đóng sai; (2) cài Docker Desktop, sửa script staging để chạy được trên Windows (DEF-30); (3) retest ngày 15/11, đóng 9 lỗi. Việc còn lại: đề xuất M0 chốt máy chung cho demo, chuẩn bị video demo dự phòng.

**Vấn đề thứ ba (15/11): lỗ hổng chống gian lận phát hiện ngay trước UAT.** Pilot UAT và lúc quay video demo cho thấy 3 lỗi High (DEF-31, 33, 38): người dùng có thể làm sai tỷ lệ đóng góp, đúng phần cốt lõi mà UAT đánh giá. Cách xử lý:
1. Đánh giá tác động lên mục tiêu: nếu mở UAT ngay, dữ liệu G5 thu được về "đóng góp minh bạch" sẽ không tin cậy.
2. Đề xuất M2 hoãn UAT diện rộng, hoặc giới hạn chức năng người thử được dùng, và ghi giới hạn vào báo cáo UAT.
3. Giao lỗi theo lát cắt dọc (M1, M2, M3), kèm ca tái hiện tự động (`scripts/uat-pilot.py`) để chủ module tự kiểm sau khi sửa.
4. Kết quả retest 16/11: DEF-33 (M2) và DEF-38 (M1) đã sửa, retest đạt. DEF-31 (M3) chưa có bản sửa. Script retest mới phát hiện thêm 2 lỗi High: **DEF-41** (người phụ trách kéo thẻ qua lại tự nâng tỷ lệ 50% → 91,67%, cùng loại DEF-38) và **DEF-40** (migration seed tài khoản demo có mật khẩu công khai, ghi đè dữ liệu thật). Bàn giao UAT cho M2 kèm danh sách thao tác cần tránh; đề xuất M0 chấp nhận rủi ro có điều kiện nếu không sửa kịp trước release (`docs/qa/uat/uat-closure.md`). `<TODO: quyết định của M0 và kết quả retest 17–18/11>`

**Vấn đề thứ tư (16/11): defect log bị ghi đè khi merge.** Ba merge của thành viên khác vào `master` sửa trên bản cũ của `defect-log.md`, làm DEF-18, 20, 21 quay về Open và mất bảng tổng quan 15/11. Một số lỗi cũng được chính người sửa đánh dấu Closed trước khi M5 retest. Cách xử lý: dựng lại file từ bản 15/11, đối chiếu từng lỗi với kết quả retest 16/11, ghi lại quy ước "dev ghi Fixed – chờ retest, chỉ M5 chuyển Closed" ngay đầu file. Đề xuất M0 nhắc quy ước này trong Sprint Review.

## 7. Tổng kết

**Khó khăn:**
- Kế hoạch kiểm thử ban đầu xoay quanh tích hợp Trello. Sau CR-02, phải viết lại các ca kiểm thử theo board nội bộ, và kiểm tra việc gỡ mã Trello không làm hỏng dữ liệu cũ.
- Lỗi phát hiện dồn vào cuối Sprint 4–5, vì staging có muộn (Sprint 4) so với kế hoạch.
- Môi trường kiểm thử phụ thuộc máy cá nhân (Docker, proxy SSL khi build).

**Bài học:**
- Nên dựng staging và test tích hợp sớm hơn, ngay khi có lát cắt dọc đầu tiên (Sprint 2–3).
- Mock trong unit test che giấu lỗi tầng CSDL. Mỗi luồng quan trọng cần ít nhất một test tích hợp gọi API thật.
- Chỉ đóng lỗi khi có ca kiểm thử chạy lại đạt. Đóng theo lời báo "đã sửa" từng dẫn tới đóng sai (DEF-07).
- Script kiểm thử phải cập nhật theo thay đổi của sản phẩm. Ngày 15/11 có 10 ca fail giả, do backend đổi hành vi mà script chưa theo kịp.
- Unit test gọi service với tham số "đúng" nên không bắt được lỗi phân quyền ở tầng API. Cần thêm ca kiểm thử đóng vai kẻ xấu: dùng token người khác, gửi lặp lại.
- Sửa một lỗi gian lận chưa đủ, phải thử các biến thể của cùng hành vi. DEF-38 chặn được kéo lặp vào Review, nhưng kéo lặp giữa To Do và In Progress (DEF-41) hoặc đổi tên thẻ (DEF-42) vẫn tự cộng được điểm.
- Tài liệu dùng chung như defect log cần một người giữ. Merge từ nhiều nhánh dễ ghi đè lên bản mới.

**Tự đánh giá đóng góp:** `<TODO: % tự đánh giá, số giờ ước tính, đối chiếu bảng đóng góp FairShare của nhóm>`

**Đề xuất cải thiện:**
- Chạy test tích hợp trong CI (`docker-ci.yml` + `integration-sprint4.py`) để không phụ thuộc máy cá nhân.
- Thêm test end-to-end giao diện (Playwright) cho 3 luồng chính: board, chấm chéo, xuất PDF.
