# MINI-PM REPORT – WP5 KIỂM THỬ & TRIỂN KHAI (BẢN CUỐI)

**Môn:** Quản lý dự án CNTT – UEH | **GVHD:** TS. Nguyễn Mạnh Tuấn | **Dự án:** FairShare
**Bản cuối:** 24/11/2026, hoàn thiện từ bản nháp 16/11 (`M5-mini-pm-report-nhap.md`). Số liệu đến `master` @ `677a9be`, lần kiểm thử cuối 24/11 lúc 21:45–22:00 (GMT+7).
**Khung:** 7 mục theo `PCCV-Module.md` mục 10. Độ dài mục tiêu 3–5 trang.

> `<cần bổ sung: …>` là phần chỉ tác giả hoặc M0 điền được (tự đánh giá, quyết định của M0). Bản này không tự điền.

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

## 2. Mục tiêu phân hệ và mức độ đạt

| Mục tiêu WP5 | Tiêu chí hoàn thành | Kết quả 24/11 | Đạt? |
|---|---|---|---|
| Mọi thay đổi được kiểm tra tự động | CI chạy unit test, lint, build trên mọi nhánh và PR; `master` xanh | 3 workflow (backend, frontend, docker) xanh trên `master` @ `677a9be` | Đạt |
| Môi trường chạy giống thật, dựng lại nhanh | Docker Compose 3 service; staging 1 lệnh, có smoke test | Dựng sạch 24/11, smoke PASS; volume ảnh tải lên (DEF-55) | Đạt |
| Kiểm chứng các cam kết cốt lõi | Ẩn danh (≥ 3 người chấm), chống gian lận, phân quyền, luồng điểm đóng góp | Tích hợp 23/23; 42/68 lỗi đã đóng; còn 3 High Open (DEF-40, 41, 65), 1 In Progress (DEF-66) | Đạt một phần |
| Đạt G4 | Xuất PDF < 10 s (6 người, 4 sprint) | Chậm nhất 0,110 s (500 sự kiện), 0,237 s (nhóm demo) | Đạt |
| Hỗ trợ đạt G5 | UAT ≥ 10 người; ghi và phân loại lỗi UAT | 10 phiếu (đạt số lượng); SUS 47,0, CSAT 60% → **G5 chưa đạt** | WP5 đạt phần việc; G5 chưa đạt |
| Bàn giao | Release tag, bản demo, user guide, deployment guide, video dự phòng | Có user guide, deployment guide, checklist demo, video, release notes. **Chưa gắn tag** (chờ M0) | Đạt một phần |

## 3. Kế hoạch

### 3.1 Backlog theo sprint

| Giai đoạn | Công việc M5 (theo `docs/sprint*.md`) | Trạng thái |
|---|---|---|
| Sprint 1 | Chiến lược kiểm thử, tiêu chí chấp nhận; chọn môi trường triển khai; mẫu biên bản họp | ✅ |
| Sprint 2 | Test plan; môi trường dev Docker Compose + MariaDB; CI cơ bản | ✅ |
| Sprint 3 | Test case auth/nhóm/board; bật CI chạy test; kiểm thử build đầu tiên | ✅ |
| Sprint 4 | Test tích hợp các module; staging Docker Compose; defect log | ✅ |
| Sprint 5 | Unit/integration/regression (board → `ActivityEvent` → `ScoringEngine` → dashboard); hiệu năng PDF | ✅ |
| Sprint 6 | Môi trường UAT, tài khoản thử; ghi lỗi UAT; demo, user guide, video dự phòng; ứng viên release; nháp chương | ✅ (trừ gắn tag) |
| Sprint 7 | Chốt Defect Log; Báo cáo UAT tổng hợp; Final Test Report; release cuối; chương bản cuối; gom minh chứng; Mini-PM Report | ✅ (trừ gắn tag) |

Backlog chi tiết được theo dõi trên Trello: board cá nhân "FairShare – WP5 QA & Deployment (M5)" (list theo từng sprint, mỗi card có ngày, thời lượng, hạn, đầu ra, checklist) và các card `[M5]`, `[Sprint 7 - M5]` trên board nhóm "FairShare – QLDA CNTT".

### 3.2 Nguồn lực

- Con người: 1 người (M5), phối hợp với chủ module để sửa lỗi theo lát cắt dọc.
- Công cụ: GitHub Actions, Docker/Docker Compose, JUnit 5, Mockito, Testcontainers, Vitest, Python (script kiểm thử qua API), Trello.
- Môi trường: máy cá nhân của M5 làm staging; bản Render của nhóm (nhánh `deploy/render`) dùng cho UAT chính thức.

### 3.3 Rủi ro chính do WP5 phụ trách

| Mã | Rủi ro | Xác suất × Tác động | Biện pháp đã làm | Kết quả |
|---|---|---|---|---|
| **R11** | Tích hợp muộn, lỗi phát hiện trễ | 3 × 4 (Cao) | CI trên mọi nhánh từ Sprint 2; staging và test tích hợp từ Sprint 4; hồi quy trước mỗi Sprint Review; script retest mới sau mỗi đợt merge lớn | Rủi ro **vẫn xảy ra một phần**: sau khóa phạm vi (18/11 17:00) còn 6 PR tính năng được merge (#105, #107, #108, #109, #112, #113); đợt kiểm thử 20/11 ghi 13 lỗi mới. CI và script giúp phát hiện trong 1–2 ngày thay vì lúc bảo vệ |
| **R13** | Mất dữ liệu/code, mất truy cập hạ tầng | 2 × 5 (TB) | Git remote; staging dựng lại 1 lệnh; sao lưu DB; mật khẩu sinh tự động, không commit; deployment guide; video demo dự phòng | Xảy ra 2 lần (14/11 máy thiếu Docker; 16/11 defect log bị merge ghi đè), đều khôi phục trong ngày. Volume `uploads_data` (24/11) tránh mất ảnh khi tạo lại container |

## 4. Thực hiện

| Công việc | Kết quả / sản phẩm | Minh chứng |
|---|---|---|
| Docker hóa | Dockerfile backend (Maven → JRE 21 Alpine), frontend (Node 20 → Nginx), `docker-compose.yml` 3 service | PR #5 (merge 10/10), commit `252a4f5` |
| CI/CD | `backend-ci.yml`, `frontend-ci.yml`, `docker-ci.yml`; script chạy tay `scripts/ci-*.ps1` | Commit `7d51b53` (25/10), `18368ac` (02/11) |
| Test case Sprint 3 | 36 test case auth/user/frontend | `docs/qa/test-cases-sprint3.md`, `test-report-sprint3.md` |
| Staging + tích hợp Sprint 4 | Staging 1 lệnh + smoke; 23 ca tích hợp | Commit `a0d93d6` (09/11); `docs/deploy/staging.md`; `integration-log-sprint4.md` |
| Hồi quy + hiệu năng Sprint 5 | 30 ca hồi quy; đo PDF (G4) | Commit `c1b04be` (10/11); `test-report-sprint5.md` |
| Sprint 6 (14–19/11) | Retest nhiều vòng; 12 tài khoản UAT; pilot UAT 24 ca (`uat-pilot.py`); retest gian lận 9 ca (`retest-sprint6.py`); video demo; 14 ảnh user guide; bàn giao UAT cho M2; tính lại SUS/CSAT; phân loại 17 góp ý PCG; ứng viên release 19/11 | `docs/qa/evidence/*-2026-11-1[4-9].*`, `docs/qa/uat/`, `docs/deploy/` |
| Kiểm thử PR #102–#109 (20/11) | Kiểm trên staging và bản Render; ghi 13 lỗi mới DEF-55..67 (5 High) | Commit `03ccb68` |
| **Sprint 7 (24/11)** | Kiểm thử cuối trên `master` @ `677a9be` (unit 243 + 99, tích hợp 23/23, hồi quy 26/30, pilot 22/24); script mới `retest-sprint7.py` (13 ca); **tự sửa DEF-55, 56, 57** (Dockerfile, compose, Nginx) và retest; chốt Defect Log (đóng 6 lỗi, ghi DEF-68); Báo cáo UAT tổng hợp; Final Test Report; release notes; chương bản cuối; mục lục minh chứng | `docs/qa/defect-log.md`, `docs/qa/uat-report.md`, `docs/qa/test-report-final.md`, `docs/qa/evidence/*-2026-11-24.*` |

Số commit của M5 trên repo: **42** đến 21/11 (không tính merge, từ 10/10), cộng commit chốt Sprint 7 ngày 24/11; **9 PR** từ nhánh `nam-anh` đã merge vào `master` (đếm 24/11). `<cần bổ sung: ảnh chụp lịch sử commit/PR có ngày giờ>`

## 5. Kiểm thử

| Bộ test | Diễn biến | Kết quả cuối (24/11) |
|---|---|---|
| Unit backend | 26 (02/11) → 124 (10/11) → 195, 4 lỗi (15/11) → 233 (16/11) → 238 (20/11) | **243/243, 0 skip** |
| Unit frontend | 17 → 65 → 74 → 86 → 96 | **99/99** |
| Tích hợp | 11/22 (09/11) → 18/23 → 21/23 → 23/23 (15/11 trở đi) | **23/23** |
| Hồi quy Sprint 5 | 13/30 (10/11) → 20/30 → 30/30 (15–16/11) → 26/30 (19/11, do dữ liệu DEF-40) | **26/30** |
| Hiệu năng PDF (G4) | 0,078 s (15/11) → 0,064 s (16/11) → 0,061 s (19/11) | **0,237 s** (nhóm demo), **đạt** |
| Pilot UAT (M5) | 14/24 (15/11) → 20/24 (16–20/11) | **22/24** |
| Retest gian lận | `retest-sprint6.py` 2/9 (16/11 trở đi) | 2/9; `retest-sprint7.py` 7/13 |
| UAT chính thức (M2) | 10 phiếu, 17/11 | SUS 47,0; CSAT 60% → G5 chưa đạt |

**Defect Log cuối:** 68 lỗi, **42 Closed** (62,7% lỗi hợp lệ; High 18/22), 18 Open, 6 Fixed – chờ retest, 1 In Progress, 1 Rejected. 55/67 lỗi hợp lệ do M5 tìm qua kiểm thử.

**Lỗi tiêu biểu và cách xử lý:**
- **DEF-08/09 (High) – lộ điểm chấm chéo:** điểm hiện khi mới 1 lượt chấm, một người chấm nhiều lần vẫn đủ ngưỡng. M5 báo kèm ca tái hiện, M4 sửa trong 1 ngày (PR #57), đóng 10/11.
- **DEF-20 (High) – PDF luôn lỗi 500:** unit test dùng mock nên không phát hiện. M5 thử bản vá 1 dòng để chứng minh nguyên nhân, giao M0 sửa; đóng 15/11.
- **DEF-31, 64 (High) – giả danh qua tham số client:** API tin `userId`/`reviewerId` do client gửi. Script pilot và retest tái hiện tự động; chủ module sửa; M5 đóng 24/11 sau khi chạy lại.
- **DEF-55, 56, 57 – bản Docker không lưu/hiển thị ảnh:** lỗi thuộc phần M5 phụ trách, chỉ lộ ra khi test đúng image phát hành. M5 tự sửa và retest trong ngày 24/11.

## 6. Quản lý: các vấn đề đã xử lý

**Vấn đề 1 (10–11/11): chức năng xuất PDF lỗi 100% trước Sprint Review.** Đánh giá DEF-20 là High vì chặn DoD và demo; ước lượng công sửa bằng bản vá thử trên staging; ghi hạn trước code freeze 11/11 17:00 vào bảng "theo người xử lý"; báo M0 tại Sprint Review để chọn sửa ngay hay ghi Change Log. Kết quả: đóng 15/11, hồi quy 30/30.

**Vấn đề 2 (14/11): staging phụ thuộc máy cá nhân.** Máy kiểm thử thiếu Docker nên không retest được (R13 xảy ra một phần). Ghi 9 lỗi "Fixed – chờ retest" thay vì đóng sai; cài Docker, sửa script để chạy được trên Windows (DEF-30); retest 15/11 và đóng 9 lỗi.

**Vấn đề 3 (15–16/11): lỗ hổng chống gian lận phát hiện ngay trước UAT.** Pilot và quay video cho thấy 3 lỗi High (DEF-31, 33, 38) làm sai tỷ lệ đóng góp, đúng phần UAT đánh giá. Đề xuất M2 giới hạn chức năng người thử dùng và ghi giới hạn vào báo cáo UAT; giao lỗi theo lát cắt dọc kèm ca tái hiện tự động; soạn mẫu chấp nhận rủi ro cho M0 (`uat-closure.md`). Kết quả: DEF-33, 38 đóng 16/11, DEF-31 đóng 24/11; script retest mới phát hiện thêm DEF-40, 41.

**Vấn đề 4 (16/11): defect log bị merge ghi đè.** Ba merge sửa trên bản cũ, làm DEF-18, 20, 21 quay về Open. Dựng lại file từ bản 15/11, đối chiếu với retest 16/11, ghi quy ước "dev ghi Fixed – chờ retest, chỉ M5 chuyển Closed" ở đầu file.

**Vấn đề 5 (18–24/11): tính năng mới tiếp tục vào sau khi khóa phạm vi.** Sau giờ khóa phạm vi 18/11 17:00 vẫn có 6 PR tính năng được merge (#105, #107, #108, #109, #112, #113); riêng đợt kiểm thử 20/11 (PR #102–#109) ghi 13 lỗi mới, gồm 5 High. Cách xử lý: kiểm thử ngay sau mỗi đợt merge (20/11, 24/11) bằng script tự động, tách lỗi theo người xử lý, tự sửa phần thuộc WP5 (DEF-55..57) để không chờ người khác, và nêu rõ trong Final Test Report rằng bản cuối **chưa đạt tiêu chí release** nếu M0 chưa quyết định chấp nhận rủi ro cho 4 lỗi High. Quyết định của M0: `<cần bổ sung: chấp nhận rủi ro hay sửa DEF-40, 41, 65, 66 trước tag v1.0.0>`

## 7. Tổng kết

**Khó khăn:**
- Kế hoạch kiểm thử ban đầu xoay quanh tích hợp Trello; sau CR-02 phải viết lại các ca kiểm thử theo board nội bộ.
- Staging có muộn (Sprint 4) nên lỗi dồn vào cuối Sprint 4–5.
- UAT chính thức chạy trên bản Render, nơi M5 không truy cập được CSDL, nên không kiểm chứng được dữ liệu đóng góp của người thử.
- Tính năng vẫn được thêm sau khóa phạm vi, làm số lỗi mở tăng ngay trước release.

**Bài học:**
1. Dựng staging và test tích hợp ngay khi có lát cắt dọc đầu tiên, không đợi Sprint 4.
2. Mock trong unit test che giấu lỗi tầng CSDL; mỗi luồng quan trọng cần ít nhất một test gọi API thật (DEF-20).
3. Chỉ đóng lỗi khi có ca kiểm thử chạy lại đạt (DEF-07 từng bị đóng sai).
4. Kiểm thử phân quyền phải đóng vai kẻ xấu: token người khác, tham số giả, tham số thiếu, thao tác lặp (DEF-31, 38, 41, 64, 66).
5. Kiểm thử trước release phải chạy đúng image sẽ phát hành (DEF-55..57 không lộ ra khi chạy bằng IDE hay trên Render).
6. UAT nên chạy trên môi trường mà QA truy cập được CSDL, và chỉ mở sau khi lỗi High đã sửa.
7. Tài liệu dùng chung như defect log cần một người giữ.

**Tự đánh giá đóng góp:** `<cần bổ sung: % tự đánh giá, số giờ, đối chiếu bảng mức độ tham gia và bảng đóng góp FairShare của nhóm>`

**Đề xuất cải thiện:**
- Chạy test tích hợp và retest trong CI (`docker-ci.yml` + các script) để không phụ thuộc máy cá nhân.
- Thêm test end-to-end giao diện (Playwright) cho board, chấm chéo, xuất PDF; hiện 10 lỗi giao diện chỉ được rà mã.
- Sau khóa phạm vi chỉ nhận PR sửa lỗi; mỗi PR tính năng cần ca kiểm thử API đi kèm.
