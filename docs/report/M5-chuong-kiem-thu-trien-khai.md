# CHƯƠNG: KIỂM THỬ VÀ TRIỂN KHAI (BẢN NHÁP 1)

**Người viết:** M5 – Khiếu Hoàng Nam Anh (MSSV 31241022203), PM QA & Deployment, WP5
**Bản nháp:** 16/11/2026, cập nhật 18/11 (kết quả UAT chính thức). Số liệu kiểm thử tự động đến `master` @ `f18a705` (retest staging, pilot UAT, unit test ngày 16/11, 23:00–23:30 GMT+7) | **Nộp cho M0 ghép báo cáo bản 1:** hạn 18/11/2026, 21:00
**Nguồn số liệu:** `docs/qa/` (test case, test report, integration log, defect log, evidence), `docs/deploy/staging.md`, `.github/workflows/`

> Các chỗ `<TODO: …>` là số liệu **chưa có**: lần chạy cuối trên bản release, release tag và URL/video demo (18/11). Bản nháp này không tự điền các số liệu đó.

> **Lưu ý CR-02:** Kế hoạch ban đầu thu thập dữ liệu từ Trello qua API/Webhook. Theo Change Request **CR-02**, nhóm đã thay bằng **Task Board nội bộ**. Vì vậy mọi ca kiểm thử từ Sprint 4 trở đi kiểm tra luồng *board nội bộ → sự kiện hoạt động → điểm đóng góp*, không còn kiểm thử tích hợp Trello. Mã tích hợp Trello cũ đã được gỡ (DEF-25, đóng 11/11).

---

## 1. Chiến lược và kế hoạch kiểm thử

### 1.1 Mục tiêu

Kiểm thử nhằm chứng minh hệ thống đạt các mục tiêu chất lượng trong Project Charter, đặc biệt:
- **Ẩn danh trong chấm chéo:** điểm chỉ hiện khi có từ 3 người chấm khác nhau.
- **Chống gian lận và phân quyền:** không giả được trạng thái hoàn thành; người ngoài nhóm không xem hay sửa được dữ liệu nhóm.
- **Đúng luồng ghi nhận đóng góp:** board → sự kiện → `ScoringEngine` → dashboard và PDF.
- **G4 (hiệu năng):** xuất PDF dưới 10 giây cho nhóm 6 người, dữ liệu 4 sprint.
- **G5 (hài lòng):** UAT với ít nhất 10 sinh viên ngoài nhóm (M2 chủ trì, M5 ghi lỗi).

### 1.2 Các mức kiểm thử

| Mức | Phạm vi | Công cụ | Ai viết | Khi nào chạy |
|---|---|---|---|---|
| Unit backend | Service, controller, thuật toán (`ScoringEngine`, `AnonymityAggregator`) | JUnit 5, Mockito, AssertJ | Chủ module + M5 | Mỗi push/PR (CI) |
| Repository / API backend | Truy vấn thật trên MariaDB, hợp đồng API auth | Testcontainers (MariaDB 10.11), MockMvc | M5 | Mỗi push/PR (CI có Docker) |
| Unit frontend | Component, store, hàm gọi API | Vitest, Testing Library | Chủ module + M5 | Mỗi push/PR (CI) |
| Tích hợp | Gọi API thật qua Nginx trên staging, đối chiếu dữ liệu bằng SQL | `scripts/integration-sprint4.py` | M5 | Sau mỗi đợt merge lớn |
| Hồi quy | Luồng điểm đóng góp, dashboard, phân quyền board, gỡ Trello, PDF | `scripts/regression-sprint5.py` (30 ca) | M5 | Trước Sprint Review, trước release |
| Smoke | Container healthy, Flyway, Nginx proxy, đăng ký/đăng nhập | `scripts/staging-smoke.sh` (11 kiểm tra) | M5 | Mỗi lần dựng staging |
| Hiệu năng | Thời gian xuất PDF | Đo phía client qua Nginx và log server | M5 | Sprint 5 |
| Chấp nhận (UAT) | Kịch bản người dùng thật | Kịch bản `docs/M2-UAT-Scenarios.md`, phiếu phản hồi | M2 (chủ trì), M5 | Sprint 6 (14–17/11) |

### 1.3 Môi trường

| Môi trường | Thành phần | Dùng cho |
|---|---|---|
| Local / CI | Java 21, Maven 3.9, Node 20/22, MariaDB qua Testcontainers | Unit test, build |
| Staging | Docker Compose `fairshare-staging`: Nginx → Spring Boot (profile `prod`) → MariaDB 10.11 | Tích hợp, hồi quy, hiệu năng, UAT, demo |

### 1.4 Tiêu chí đạt

- Unit test: 0 fail trên `master`. CI xanh trước khi merge.
- Mọi lỗi **High** phải đóng, hoặc có quyết định chấp nhận rủi ro ghi trong Change Log, trước release.
- Mỗi defect chỉ được đóng khi có: PR sửa, ca kiểm thử chạy lại đạt, và ngày đóng.
- UAT đạt khi có ≥ 10 phiếu và không còn lỗi chặn luồng.

`<TODO: dẫn link Test Plan bản đầy đủ (Sprint 2) nếu nhóm lưu ngoài repo>`

---

## 2. Tự động hóa và CI/CD

| Workflow | Kích hoạt | Nội dung |
|---|---|---|
| `backend-ci.yml` | Push mọi nhánh, PR | `mvn -B verify`: unit + Testcontainers. Tải lên báo cáo Surefire, in bảng tóm tắt pass/fail |
| `frontend-ci.yml` | Push mọi nhánh, PR | `npm ci` → ESLint → Vitest (xuất JUnit XML) → `tsc` + `vite build` |
| `docker-ci.yml` | PR vào `master`, push `master`, chạy tay | Build 3 image, `compose up`, chờ DB healthy, kiểm tra Flyway, backend và Nginx |

**Trạng thái CI ngày 16/11 (`master` @ `f18a705`):** Frontend CI và Docker Compose smoke test chạy trên chính commit này, đều xanh. Backend CI chỉ chạy khi `fairshare-backend/` thay đổi. Lần xanh gần nhất có cùng mã backend là push `026e74d` lên `nam-anh` (16/11 23:02); `mvn test` chạy tay cùng ngày cũng đạt 233/233.

Kèm theo là các script chạy tay trên Windows (`scripts/ci-*.ps1`) và script tóm tắt kết quả (`summarize-backend.py`, `summarize-frontend.py`). Nhờ đó các thành viên chạy được cùng bộ kiểm tra trên máy mình trước khi mở PR.

**Tác dụng với rủi ro R11 (tích hợp muộn, lỗi phát hiện trễ):** CI chạy trên mọi nhánh, nên lỗi build hoặc test của một module lộ ra ngay khi push, trước khi merge. Ví dụ ngày 14/11: unit test phát hiện 4 lỗi do một commit mới (DEF-27) ngay trong ngày commit.

---

## 3. Kết quả kiểm thử

### 3.1 Diễn biến unit test

| Ngày | Mã nguồn | Backend | Frontend | Ghi chú |
|---|---|---|---|---|
| 02/11 (Sprint 3) | `master` @ `3b1086f` | 26 test: 19 pass, 7 pending | 17/17 pass | Auth backend chưa hiện thực |
| 10/11 (Sprint 5) | `master` @ `0ed8f05` | 124 test: 0 lỗi, 7 skip | 65/65 pass (15 file) | 7 skip: nhóm `AuthContract` còn `@Disabled` (DEF-01) |
| 14/11 (Sprint 6) | `master` @ `d2eab98` | 178 test: 165 pass, 4 lỗi, 9 skip | **74/74 pass (17 file)** | 4 lỗi mới (DEF-27). 9 skip là test Testcontainers (máy chạy không có Docker) |
| **15/11 (Sprint 6)** | `master` @ `d2eab98` | **195 test: 191 pass, 4 lỗi, 0 skip** | – | Chạy `mvn test` trong container Maven có Docker: `AuthApiTest` và các test Testcontainers chạy thật và đạt (đóng DEF-01). 4 lỗi vẫn là DEF-27 |
| **16/11 (Sprint 6)** | `master` @ `f18a705` | **233 test: 233 pass, 0 lỗi, 0 skip** | **86/86 pass (20 file)** | Trong Docker như 15/11. DEF-27 đã sửa (đóng). Frontend chạy bằng Node 20 như CI |

Số test backend tăng từ 26 lên 233 sau bốn sprint. Phần lớn là test phân quyền, chấm chéo và đóng góp mà các chủ module bổ sung sau mỗi lần sửa lỗi.

Minh chứng: `docs/qa/evidence/backend-unit-docker-2026-11-16.txt`, `frontend-unit-2026-11-16.txt` và các file cùng loại ngày 10/11, 14/11, 15/11 (mục lục: `docs/qa/evidence/README.md`).

### 3.2 Test case Sprint 3 (auth, user, frontend)

36 test case: 11 auth API, 5 repository user, 15 frontend, 5 khác. Chi tiết trong `docs/qa/test-cases-sprint3.md`, kết quả trong `docs/qa/test-report-sprint3.md`.

### 3.3 Kiểm thử tích hợp (Sprint 4–5)

| Lần chạy | Mã nguồn | Kết quả | Thay đổi chính |
|---|---|---|---|
| 09/11 | `c32a069` | 11/22 pass | Lần đầu. Phát hiện DEF-08..18 (lộ điểm khi < 3 người chấm, đếm lượt thay vì đếm người, người ngoài nhóm chấm được…) |
| 10/11 | `0ed8f05` | **18/23 pass** | Sau khi M4 sửa (PR #57): luồng chấm chéo 11/12, **đạt yêu cầu ẩn danh** |
| 11/11 | `8b51f18` | 21/23 pass | Đóng DEF-11 (giả mạo hoàn thành card), DEF-24 (phân quyền board) |
| 15/11 | `d2eab98` | 23/23 pass | Lần đầu đạt trọn. Đóng DEF-12 (người ngoài nhóm xem kết quả chấm chéo), DEF-16 (nguồn bằng chứng) |
| **16/11** | `f18a705` | **23/23 pass** | Giữ nguyên sau 39 commit mới (PR #78–#92), staging dựng sạch |

### 3.4 Kiểm thử hồi quy Sprint 5 (30 ca)

| Nhóm ca | 10/11 trên `master` | 11/11 trên `master` | 15/11 trên `master` | **16/11 trên `master`** |
|---|---|---|---|---|
| Board → sự kiện → `ScoringEngine` | **8/8** | 8/8 | 8/8 | **8/8** |
| Dashboard | 2/5 (DEF-22) | – | 5/5 | **5/5** |
| Phân quyền board | 2/6 (DEF-24) | **6/6** | 6/6 | **6/6** |
| Gỡ Trello legacy (CR-02) | 0/3 (DEF-25) | 2/3 (TRL-03 lỗi do DEF-20) | 3/3 | **3/3** (**) |
| PDF | 1/8 (DEF-20) | – | 8/8 (*) | **8/8** |
| **Tổng** | **13/30** | **20/30** (25/30 khi vá tạm DEF-20) | **30/30** | **30/30** |

(*) Ngày 15/11, PDF-02..05 kiểm nội dung bằng cách trích text từ file PDF thật (lưu ở `docs/qa/evidence/report-*-2026-11-15.pdf`), vì script chưa đọc được `pdftotext` trên Windows. Hai thay đổi của sản phẩm sau 11/11 đã làm script cũ báo fail giả, nên M5 cập nhật script trước khi chạy: backend tự tạo "Sprint 1" khi tạo nhóm, và API báo cáo chặn người ngoài nhóm. Ngày 16/11 script đọc `pdftotext` bằng UTF-8 nên PDF-02..05 chạy tự động.

(**) Ngày 16/11, TRL-02 báo fail giả vì đường dẫn `/integration` được dùng lại cho trang mới `MultidimensionalVectorPage` (không liên quan Trello). M5 sửa ca kiểm thử cho đúng mục đích (không còn tham chiếu trang/API kết nối Trello) rồi chạy lại.

`<TODO: lần chạy trên bản release 18/11>`

### 3.5 Hiệu năng xuất PDF (mục tiêu G4 < 10 giây)

Đo trên dữ liệu mẫu M3 (6 thành viên, 100 sự kiện mỗi sprint), mỗi sprint 1 lần lạnh và 10 lần liên tiếp:

| Sprint | p50 (s) | p95 (s) | Chậm nhất (s) | So với G4 |
|---|---|---|---|---|
| 1 | 0,059 | 0,078 | 0,078 | Đạt |
| 2 | 0,043 | 0,059 | 0,059 | Đạt |
| 3 | 0,024 | 0,044 | 0,044 | Đạt |
| 4 | 0,033 | 0,040 | 0,040 | Đạt |

Phía server (51 lần): trung vị 27 ms, chậm nhất 204 ms. Lần đo lại ngày 11/11: chậm nhất 0,109 s. Như vậy **G4 đạt**, nhanh hơn mục tiêu hơn 90 lần.
**Đo lại chính thức ngày 15/11 trên `master`** (đã có bản sửa DEF-20): 11 lần × 4 sprint, mọi lần HTTP 200, file khoảng 70 KB, **chậm nhất 0,078 s**, p50 từ 0,031 đến 0,041 s.
**Đo lại ngày 16/11 trên `master` @ `f18a705`:** 11 lần × 4 sprint, mọi lần HTTP 200, file 71–72 KB, **chậm nhất 0,064 s**, p50 từ 0,034 đến 0,041 s (`docs/qa/evidence/regression-2026-11-16.txt`).

### 3.6 Kiểm thử chấp nhận người dùng (UAT)

**Chạy thử (pilot) trước UAT – 15/11.** M5 chuẩn bị môi trường UAT bằng `scripts/uat-seed.py`: 12 tài khoản thử, nhóm A có dữ liệu mẫu. Sau đó chạy thử 24 ca bằng `scripts/uat-pilot.py`, gồm 5 kịch bản UAT-M2-01..05, các luồng chính, và phân quyền/chống gian lận. Kết quả **14/24 đạt**, phát hiện **7 lỗi mới (DEF-31..37), trong đó 2 lỗi High**: khai báo đóng góp giả danh/tự duyệt (DEF-31), người ngoài tự thêm mình làm Leader (DEF-33). Khi quay video demo, phát hiện thêm **DEF-38 (High)**: kéo thẻ vào cột Review lặp lại thì tự cộng điểm. Khuyến nghị M2 chưa mở UAT diện rộng khi 3 lỗi High chưa sửa. Chi tiết: `docs/qa/uat/uat-pilot-report.md`.

Điểm đáng chú ý: cả 3 lỗi High đều **không bị unit test phát hiện**, vì unit test gọi thẳng service với tham số đúng. Chỉ khi thử như người dùng thật (gọi API bằng token của người khác, thao tác lặp lại) thì lỗi mới lộ ra.

**Pilot lần 2 – 16/11** trên `master` @ `f18a705`, môi trường dựng sạch: **20/24 đạt**. Các ca của M2 (UAT-M2-01..05) và phân quyền board/sprint đã đạt sau bản sửa DEF-33..37 (PR #81) và DEF-34 (PR #84). 4 ca còn lỗi đều thuộc chức năng Khai báo đóng góp (DEF-31, 32, chưa sửa). M5 viết thêm `scripts/retest-sprint6.py` (9 ca) để thử các biến thể gian lận: DEF-38 đạt, nhưng phát hiện **DEF-41 (High)** (người phụ trách kéo thẻ của mình qua lại giữa To Do và In Progress 10 vòng, tỷ lệ đóng góp tăng từ 50% lên 91,67%) và DEF-42 (đổi tên thẻ vượt bản sửa DEF-38). Môi trường UAT được bàn giao cho M2 kèm danh sách thao tác cần tránh (`docs/qa/uat/uat-handoff-M2.md`).

**UAT chính thức – 14 đến 17/11** (M2 chủ trì). Người thử dùng bản Render `https://fairshare-web-3iuo.onrender.com` (nhánh `deploy/render` @ `29945fe`, đã gộp `master` @ `be7e441`) và trả lời phiếu Google Form gồm 10 câu SUS và 1 câu CSAT. Kết quả do M2 tổng hợp ngày 17/11, M5 tính lại từ tệp CSV và ra cùng số liệu:

| Chỉ tiêu | Ngưỡng | Kết quả | Đánh giá |
|---|---|---|---|
| Số phiếu hợp lệ | ≥ 10 | 10 (1 Leader, 9 Member) | Đạt |
| SUS trung bình | ≥ 75 | 47,0 (thấp nhất 32,5, cao nhất 62,5) | Chưa đạt |
| CSAT (G5) | ≥ 80% chọn 4–5 | 60% (6/10), trung bình 3,5/5 | Chưa đạt |

Khi kiểm chứng bản Render, M2 ghi nhận 2 lỗi mới: **DEF-43 (High)** API bằng chứng `GET /api/contributions/evidence` trả HTTP 500, bảng Audit Trail trống; **DEF-44 (Low)** chuông thông báo không mở. Cả hai thuộc M3; bản sửa có trên nhánh `TrongPhuc` (18/11) nhưng chưa merge, chưa retest. Theo M2, SUS thấp chủ yếu vì người dùng mới khó hiểu các chỉ số thống kê trên Dashboard (8/10 phiếu đồng ý câu "cần hỗ trợ kỹ thuật"); đề xuất thêm chú thích cho chỉ số D1–D4.

Hai điểm hạn chế của đợt UAT: (1) UAT không chạy trên môi trường UAT do M5 chuẩn bị, nên M5 không đối chiếu được dữ liệu đóng góp của người thử, ví dụ lọc thao tác kéo thẻ bất thường (DEF-41); (2) nhánh Render có migration V23–V25, nên CSDL Render nhiều khả năng có tài khoản demo với mật khẩu công khai (DEF-40). Nguồn: `uat-formal-report.md` và `uat-responses-2026-11-17.csv` trên thẻ Trello của M2; kết luận chốt UAT: `docs/qa/uat/uat-closure.md` mục 5.

---

## 4. Quản lý lỗi (Defect Log)

### 4.1 Quy trình

`Open` → `In Progress` → `Fixed` (dev đã sửa) → `Closed` (M5 chạy lại ca kiểm thử đạt). Mỗi lỗi có mức độ (High/Medium/Low), người xử lý theo lát cắt dọc, bằng chứng và đề xuất sửa. M5 cập nhật `docs/qa/defect-log.md` sau mỗi lần chạy tích hợp hoặc hồi quy.

### 4.2 Số liệu (16/11/2026, sau retest trên `master` @ `f18a705`)

| Mức độ | Open | In Progress | Fixed – chờ retest | Closed | Tổng |
|---|---|---|---|---|---|
| High | 3 | 0 | 0 | 12 | 15 |
| Medium | 1 | 0 | 0 | 10 | 11 |
| Low | 4 | 0 | 0 | 11 | 15 (+1 bị rút: DEF-29) |
| **Tổng** | **8** | **0** | **0** | **33** | **41 (+1 rút)** |

Theo nguồn phát hiện: Sprint 3 (DEF-01..07), tích hợp Sprint 4 (DEF-08..19), hồi quy Sprint 5 (DEF-20..26), Sprint 6 (DEF-27..42, trong đó pilot UAT và quay demo tìm được DEF-31..39, retest 16/11 tìm được DEF-40..42). Ngày 16/11 đóng 7 lỗi (DEF-27, 33..38). UAT chính thức (17/11) tìm thêm DEF-43, 44. Tính đến 18/11, 4 lỗi High đang mở: DEF-31 (M3, chưa sửa), DEF-40 (M0), DEF-41 (M1 + M3), DEF-43 (M3, bản sửa chưa merge). DEF-29 bị rút vì M5 ghi nhầm. Đề xuất chấp nhận rủi ro cho các lỗi High còn mở, chờ M0 quyết định: `docs/qa/uat/uat-closure.md`.

### 4.3 Các lỗi đáng chú ý

| Lỗi | Vì sao quan trọng | Xử lý |
|---|---|---|
| DEF-08, 09 | Lộ điểm chấm chéo khi dưới 3 người chấm; đếm số lượt thay vì số người, nên một người chấm 3 lần cũng vượt ngưỡng. Vi phạm cam kết ẩn danh cốt lõi | M4 sửa `AnonymityAggregator` (PR #57). Đóng 10/11 |
| DEF-11 | Client tự gửi tên cột "Done", giả được việc hoàn thành card (rủi ro R05 – gian lận) | M1 dùng tên cột thật. Đóng 11/11 |
| DEF-20 | Xuất PDF luôn lỗi 500 (transaction chỉ đọc gọi routine có ghi). Unit test dùng mock nên không phát hiện, chỉ test tích hợp mới bắt được | M0 sửa. Đóng 15/11 |
| DEF-27 | Commit mới làm hỏng 4 unit test, CI backend đỏ ngay trước release | Bổ sung mock trong test. Đóng 16/11 (233/233) |
| DEF-31, 33 | API tin tham số `userId`/`reviewerId`/`role` từ client, không đọc người dùng từ token → giả danh, tự duyệt, tự làm Leader | DEF-33: M2 sửa (PR #81), đóng 16/11. DEF-31: M3 chưa sửa, khuyến nghị không dùng Khai báo đóng góp khi UAT/demo |
| DEF-38, 41, 42 | Kéo thẻ lặp lại để tự cộng điểm: vào Review (DEF-38), qua lại To Do ↔ In Progress (DEF-41, 50% → 91,67%), đổi tên thẻ để né bản sửa (DEF-42) | DEF-38: M1 sửa, đóng 16/11. DEF-41, 42 phát hiện khi M5 thử biến thể của DEF-38; giao M1, M3 |
| DEF-40 | Migration Flyway chèn tài khoản demo có mật khẩu công khai và ghi đè dữ liệu nhóm id 1 ở mọi CSDL | Giao M0. M5 khóa 5 tài khoản trên CSDL demo/UAT (checklist demo bước 4) |

### 4.4 Bài học từ quản lý lỗi

- Test dùng mock cho kết quả "xanh" nhưng không phản ánh lỗi thật với CSDL (DEF-20). Vì vậy nhóm cần thêm tầng tích hợp gọi API thật.
- Ghi "Closed" khi chưa chạy lại test dẫn tới đóng sai (DEF-07 từng bị ghi Closed khi còn 1/5 test giả). Quy tắc mới: chỉ M5 đóng lỗi, và phải có ca kiểm thử chạy lại.
- Rà soát chỉ bằng đọc code cũng có thể sai: DEF-29 (14/11) bị rút ngày 15/11 vì endpoint nằm ở controller khác chỗ M5 tìm. Vì vậy lỗi chỉ nên ghi sau khi đã chạy thử.
- Với lỗi gian lận, retest phải thử cả biến thể, không chỉ đúng bước tái hiện cũ. Bản sửa DEF-38 đạt bước cũ nhưng vẫn để lọt DEF-41, 42.
- Ngày 16/11, ba merge vào `master` ghi đè `defect-log.md` bằng bản cũ (DEF-18, 20, 21 quay về Open), và một số lỗi được người sửa tự đánh dấu Closed. M5 dựng lại file từ bản 15/11 và nhắc lại quy ước: dev ghi "Fixed – chờ retest", chỉ M5 đóng.

---

## 5. Triển khai

### 5.1 Đóng gói bằng Docker

| Thành phần | Dockerfile | Ghi chú |
|---|---|---|
| Backend | Build nhiều tầng: `maven:3.9-eclipse-temurin-21-alpine` build jar → `eclipse-temurin:21-jre-alpine` | Image chỉ chứa JRE 21 và jar |
| Frontend | Build nhiều tầng: `node:20-alpine` build Vite → `nginx:alpine` | Nginx phục vụ file tĩnh và chuyển tiếp `/api` sang backend |
| CSDL | MariaDB 10.11 | Schema do Flyway quản lý (23 migration, V1–V23, tính đến 16/11) |

`docker-compose.yml` dựng 3 service trên mạng `fairshare-network`. Bản staging (`docker-compose.staging.yml`) bổ sung: bắt buộc `JWT_SECRET`, ẩn cổng DB, healthcheck, giới hạn dung lượng log.

### 5.2 Môi trường staging

Dựng bằng một lệnh `./scripts/staging-up.sh`: tự sinh mật khẩu, build, chạy, chờ healthy, rồi chạy smoke test. Ngày 15/11, M5 sửa script để chạy được cả trên Windows (DEF-30: dò lệnh Python, bỏ CRLF, healthcheck dùng `127.0.0.1` thay vì `localhost` vì `localhost` trong Alpine phân giải ra IPv6). Staging dùng cho tích hợp (09–11/11), Sprint Review 12/11 và UAT. Hướng dẫn: `docs/deploy/staging.md`, `docs/deploy/user-guide.md`.

**Tác dụng với rủi ro R13 (mất dữ liệu/môi trường):** dựng lại được bằng một lệnh; có lệnh sao lưu DB; mật khẩu không nằm trong Git; dữ liệu staging tách khỏi dữ liệu dev (project name riêng).

### 5.3 Phát hành (release)

| Hạng mục | Kết quả |
|---|---|
| Release tag | `<TODO: tag, commit, ngày – 18/11>` |
| URL demo | `<TODO: chờ M0 chốt>`. Đề xuất (`docs/deploy/demo-hosting.md`): trình chiếu trên máy M5 (`http://localhost:8081`), mở tunnel tạm chỉ trong giờ UAT; so sánh 4 phương án máy chung / VPS / LAN / tunnel |
| Tài khoản demo | 5 tài khoản riêng `demo01..demo05@fairshare.test` do `scripts/demo-seed.py` tạo: nhóm 12 thẻ, tỷ lệ đóng góp khác nhau, chấm chéo có cả trường hợp đủ và dưới ngưỡng ẩn danh. Danh sách: `docs/deploy/demo-accounts.md`, mật khẩu ngẫu nhiên lưu ngoài Git. Đã chạy thử 16/11. UAT dùng riêng 12 tài khoản `uat01..uat12` |
| Quy trình dựng demo | `docs/deploy/demo-checklist.md`: dựng sạch, seed, khóa tài khoản lỗi DEF-40, kiểm tra 7 bước trước giờ demo |
| Release notes | Bản nháp `docs/deploy/release-notes-v1.0.0.md`: tính năng, thay đổi CR-02, lỗi đã sửa, lỗi còn tồn tại và cách né, hướng dẫn chạy |
| Video demo dự phòng | Đã quay 15/11 bằng `scripts/record-demo.ps1` (102 giây, có chú thích từng bước). File 84 MB nên không đưa vào Git; bản online: https://drive.google.com/file/d/1HE7ZnfLf49j5UMruRp-0IG11czHqGZjV/view |
| Smoke test trên bản release | `<TODO>` |

---

## 6. Hạn chế và hướng cải thiện

- **Môi trường staging phụ thuộc máy cá nhân của M5.** Nhóm chưa chốt máy chung hoặc VPS. Ngày 14/11 máy M5 chưa có Docker nên phải lùi retest sang 15/11. Đề xuất: chốt một máy chung, hoặc chạy `docker-ci.yml` kèm script tích hợp trên GitHub Actions.
- **Dữ liệu mẫu nằm trong migration.** Migration V23 chèn tài khoản và dữ liệu demo vào mọi CSDL (DEF-40). Dữ liệu mẫu nên tách khỏi Flyway: để trong `seed/` nạp tay hoặc chỉ bật ở profile `dev`, giống cách `uat-seed.py`, `demo-seed.py` tạo dữ liệu qua API.
- **Script kiểm thử phải đi theo thay đổi của sản phẩm.** Ngày 15/11 có 10 ca fail giả, do backend đổi hành vi (tự tạo sprint, siết quyền báo cáo) mà script chưa cập nhật. Cần đọc kỹ ca fail trước khi ghi defect.
- **Chưa có test end-to-end giao diện** (ví dụ Playwright). Luồng UI hiện chỉ kiểm thử qua UAT thủ công.
- Kế hoạch kiểm thử ban đầu có tích hợp Trello. Sau CR-02, toàn bộ phần này được thay bằng kiểm thử board nội bộ.
