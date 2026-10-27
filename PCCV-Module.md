# PHÂN CÔNG CÔNG VIỆC – FairShare (phiên bản chia theo lát cắt dọc)

**Môn:** Quản lý dự án CNTT – UEH | **Nhóm:** 6 thành viên | **Đề tài:** FairShare
**Phiên bản:** 2.0 – chuyển từ chia theo tầng (Backend/Frontend/Database riêng) sang **chia theo module dọc**: mỗi người sở hữu một module từ CSDL, backend đến giao diện.

> Điền tên, MSSV vào các chỗ `[ ]`. Có thể hoán đổi module theo thế mạnh từng người, nhưng phải ghi Change Log.

---

## 1. Nguyên tắc chia dọc

- Mỗi thành viên là "PM mini" của **một phân hệ (work package)** và trực tiếp làm từ migration/entity/API đến màn hình của phân hệ đó. Đúng quy định môn học: mỗi phân hệ có người chịu trách nhiệm chính, mọi việc có người phụ trách, thời hạn, trạng thái, minh chứng.
- Các vai trò quản lý còn lại (BA, Database/Data, QA & Deployment, PM chung) được **gắn thêm** cho các chủ module để mỗi người đều có minh chứng cho Mini-PM Report.
- **Phần nền tảng chung làm trước:** xác thực, `BaseEntity`, xử lý lỗi, layout giao diện chung do M1 làm trong 2–3 ngày đầu Sprint 1, để các module khác không bị chặn.
- **Hợp đồng giữa các module chốt ở Tuần 3** (bảng `ActivityEvent`, danh sách API, kiểu dữ liệu dùng chung). Sau đó mỗi người làm độc lập, tích hợp qua `service` của module khác, không đọc thẳng `repository`/`entity` của module khác.

---

## 2. Danh sách thành viên, module và vai trò

| TT | Họ tên                              | MSSV | Phân hệ (Work package) | Vai trò PM mini (theo quy định môn) | Package backend phụ trách | Màn hình frontend phụ trách |
|---|-------------------------------------|---|---|---|---|---|
| M0 | Nguyễn Văn Minh Triều (Nhóm trưởng) | 31241027455 | WP0 – Quản lý dự án + Báo cáo PDF | **PM hệ thống chung** | `report` | Nút/trang xuất PDF |
| M1 | Nguyễn Phúc Vương                   | 31241025017 | WP1 – Nền tảng & Tích hợp Trello | **PM Backend/API & Tích hợp** | `auth`, `user`, `common`, `config`, `integration/*`, `activity` | Đăng nhập/đăng ký, layout chung, kết nối Trello, trạng thái đồng bộ |
| M2 | Hà Ngọc Thiện                       | 31241021658 | WP2 – Nhóm, Sprint & Consent | **PM phân tích nghiệp vụ (BA)** | `team`, `sprint` | Danh sách/chi tiết nhóm, mời thành viên, consent, quản lý sprint |
| M3 | Ngô Trọng Phúc                      | 31241020074 | WP3 – Đóng góp & Dashboard | **PM Database/Data** | `contribution` (gồm `ScoringEngine`) | Dashboard biểu đồ, bảng bằng chứng truy vết, khai báo đóng góp thủ công |
| M4 | Triệu Nguyễn Huỳnh Khang            | 31241022785 | WP4 – Chấm chéo ẩn danh & Cảnh báo | **PM Web/Feature (chấm chéo)** | `peerreview` (gồm `AnonymityAggregator`), `alert` | Form chấm chéo, kết quả tổng hợp, danh sách cảnh báo |
| M5 | Khiếu Hoàng Nam Anh                 | 31241022203 | WP5 – Kiểm thử & Triển khai | **PM QA & Deployment** | Test toàn hệ thống, CI/CD, Docker | Kiểm thử giao diện, tài liệu hướng dẫn, môi trường demo |

**Vai trò gắn thêm (ghi rõ để làm minh chứng):**
- **M2 kiêm BA:** khảo sát, yêu cầu, Use Case/BPMN, kịch bản UAT, mẫu consent và chính sách dữ liệu.
- **M3 kiêm Database/Data:** giữ ERD tổng, quy ước đặt tên bảng, dữ liệu mẫu, chất lượng dữ liệu; cùng M2 chốt công thức đóng góp.
- **M5 kiêm Deployment:** Docker Compose, GitHub Actions, môi trường staging/demo.
- **M0 kiêm hỗ trợ code:** module `report` (PDF), và hỗ trợ module nhẹ nhất khi cần.

> Mức tải dự kiến (nặng → nhẹ): M1 (nặng nhất, tích hợp API ngoài) > M3 ≈ M4 > M2 > M5 ≈ M0. Người mạnh code nhất nên nhận M1. Nếu nhóm có người quen Spring Boot hơn, giao M1 cho người đó.

---

## 3. Bản đồ module – phụ thuộc

```
auth/user/common (M1) ──► team/sprint (M2) ──► peerreview (M4)
        │                      │
        ▼                      ▼
integration/trello + activity (M1) ──► contribution (M3) ──► report (M0)
                                               │
                                               └──► alert (M4, có điều kiện)
```

| Module | Phụ thuộc vào | Ai chờ ai |
|---|---|---|
| `team`, `sprint` | `auth`, `user` | M2 chờ khung xác thực của M1 (ngày 2–3 Sprint 1); trong lúc chờ M2 làm migration, entity và màn hình bằng dữ liệu giả |
| `integration`, `activity` | `auth`, `team` | M1 tự làm được khung Trello độc lập, nối với `team` khi M2 xong |
| `contribution` | `activity`, `team`, `sprint` | M3 dùng bảng `ActivityEvent` đã chốt ở Tuần 3 + dữ liệu mẫu để làm trước khi Trello đồng bộ xong |
| `peerreview` | `team`, `sprint` | M4 làm độc lập sau khi M2 có `Team/TeamMember/Sprint` |
| `report` | `contribution`, `peerreview` | M0 làm cuối Sprint 3, dùng API của M3 và M4 |

---

## 4. Quy ước làm việc cho chia dọc

**Git**
- Nhánh: `main` (ổn định) ← `develop` ← `feature/<module>-<mô-tả>` (ví dụ `feature/team-invite-member`).
- Mỗi module một nhánh riêng, merge vào `develop` qua Pull Request, **ít nhất 1 người review** (người ở module liền kề trong sơ đồ phụ thuộc).
- Commit nhỏ, thường xuyên, có tiền tố `feat/fix/docs/test(<module>)`.

**Flyway – tránh đụng số phiên bản**
- Không dùng V1, V2, V3 tuần tự. Dùng **số phiên bản theo ngày giờ**: `V202610121530__create_teams.sql`.
- Mỗi người chỉ tạo/sửa migration của module mình. File đã merge vào `develop` thì **không sửa**, muốn đổi thì thêm file mới.
- Nếu máy bạn báo lỗi migration sau khi kéo code mới: xóa và tạo lại DB local (dữ liệu dev là dữ liệu mẫu).

**Hợp đồng API (chốt Tuần 3, cập nhật qua Change Request)**
- Danh sách đường dẫn, JSON request/response, mã lỗi cho từng module. Frontend của chính chủ module dùng hợp đồng này, không đoán.
- Dùng Swagger UI làm tài liệu sống.

**Giao diện chung**
- Layout, router, component dùng chung (`Button`, `Card`, `Modal`...) do M1 tạo ở đầu Sprint 1; các module chỉ thêm trong thư mục `features/<module>/` của mình.

**Định nghĩa hoàn thành (DoD) cho một lát dọc**
Một chức năng chỉ được tính là xong khi có đủ: migration + entity, API có validation, màn hình dùng được, unit/integration test tối thiểu, cập nhật task Trello và log công việc, demo được trên `develop`.

---

## 5. Ma trận RACI (rút gọn)

R = Thực hiện, A = Chịu trách nhiệm cuối, C = Tham vấn, I = Được thông báo

| Công việc | M0 PM | M1 | M2 BA | M3 Data | M4 | M5 QA |
|---|---|---|---|---|---|---|
| Project Charter, Stakeholder, Gantt, RACI, Risk, Change Log | A/R | C | C | C | C | C |
| Khảo sát, yêu cầu, Use Case/BPMN, UAT | C | I | A/R | C | C | R |
| Công thức đóng góp, tiêu chí chấm chéo | C | C | A/R | R | R | I |
| ERD tổng, quy ước CSDL, dữ liệu mẫu | I | C | C | A/R | C | C |
| Kiến trúc, nền tảng, xác thực | C | A/R | I | C | C | C |
| Module nhóm/sprint/consent | I | C | A/R | C | C | C |
| Tích hợp Trello, activity | I | A/R | C | C | I | C |
| Module đóng góp, dashboard | I | C | C | A/R | I | C |
| Module chấm chéo, cảnh báo | I | I | C | C | A/R | C |
| Xuất báo cáo PDF | A/R | I | I | C | C | C |
| Test plan, test case, defect log, CI/CD, triển khai | C | C | C | C | C | A/R |
| Báo cáo tuần/sprint | A/R | C | C | C | C | C |
| Báo cáo cuối kỳ, slide, demo | A/R | R | R | R | R | R |
| Mini-PM Report | Mỗi người tự làm phần của mình, M0 kiểm tra | | | | | |

---

## 6. Phân công chi tiết theo tuần

### Tuần 1 – Khởi động
| Người | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| M0 | Kick-off, Project Charter, Team Charter, tạo Trello, thư mục Drive | Charter, Team Charter, task board | [ ] |
| M2 | Stakeholder sơ bộ, soạn khảo sát (Google Form) | Stakeholder list, form khảo sát | [ ] |
| M1 | Tạo repository GitHub, quy ước nhánh/commit, README, khung Spring Boot/Vite | Repo, README | [ ] |
| M3 | Tìm hiểu cấu trúc dữ liệu Trello (board, card, member, action) | Ghi chú | [ ] |
| M4 | Tìm hiểu giao diện các công cụ chấm đánh giá tương tự, phương pháp đánh giá 360 | Ghi chú tham khảo | [ ] |
| M5 | Chọn môi trường triển khai, kênh giao tiếp, mẫu biên bản họp | Kênh chat, mẫu biên bản | [ ] |

### Tuần 2 – Phân tích nghiệp vụ & phạm vi
| Người | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| M2 | Chạy khảo sát, yêu cầu chức năng/phi chức năng, Use Case, BPMN, MVP | Requirement list, Use Case, BPMN, báo cáo khảo sát | [ ] |
| M2 + M3 | Bản nháp công thức đóng góp và tiêu chí chấm chéo | Công thức v0.1 | [ ] |
| M0 | Scope Statement, WBS, backlog (ước lượng story point cùng nhóm) | Scope, WBS, backlog | [ ] |
| M1 | Ước lượng kỹ thuật, đọc Trello API | Ghi chú kỹ thuật | [ ] |
| M4 | Wireframe sơ bộ form chấm chéo và màn hình kết quả | Wireframe v0.1 | [ ] |
| M5 | Chiến lược kiểm thử, tiêu chí chấp nhận | Khung test plan | [ ] |

### Tuần 3 – Lập kế hoạch & thiết kế
| Người | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| M0 | Gantt, RACI, Risk Register, Communication Plan | Gantt, RACI, Risk Register, Comm Plan | [ ] |
| M1 | Kiến trúc hệ thống; **spike** Trello API (và Google Docs nếu còn thời gian); thiết kế bảng `ActivityEvent` | Sơ đồ kiến trúc, kết quả spike, thiết kế bảng | [ ] |
| M3 | ERD tổng (tổng hợp từ cả nhóm), quy ước CSDL, kế hoạch dữ liệu mẫu | ERD, quy ước | [ ] |
| M2 | Mẫu consent, chính sách dữ liệu, kịch bản UAT | Consent form, chính sách dữ liệu | [ ] |
| M4 | Prototype tương tác cho module chấm chéo và cảnh báo | Prototype | [ ] |
| M5 | Test plan hoàn chỉnh, môi trường dev, CI cơ bản, Docker Compose MariaDB | Test plan, pipeline CI | [ ] |
| Cả nhóm | **Chốt hợp đồng API và bảng dùng chung** giữa các module | Tài liệu API contract | [ ] |

### Sprint 1 (Tuần 4) – Nền tảng, nhóm, tích hợp Trello (khung)
| Người | Lát cắt dọc | Việc cụ thể | Minh chứng |
|---|---|---|---|
| M1 | Nền tảng + Trello | Ngày 1–3: xác thực/JWT, `BaseEntity`, xử lý lỗi, layout chung, trang đăng nhập/đăng ký. Ngày 3–5: kết nối Trello, đồng bộ board/card/member/action vào `ActivityEvent` | Commit, API log, demo đồng bộ |
| M2 | Nhóm/Sprint/Consent | Migration + entity + API tạo nhóm, mời thành viên, consent, sprint; màn hình nhóm và consent | Commit, demo UI |
| M3 | Đóng góp (khung) | Migration `contribution`, công thức v1 cùng M2, `ScoringEngine` bản đầu (unit test với dữ liệu mẫu), dữ liệu mẫu `ActivityEvent` | Commit, test, tài liệu công thức v1 |
| M4 | Chấm chéo (khung) | Migration + entity `ReviewRound/Submission/Criterion`, thiết kế cơ chế ẩn danh, tiêu chí | Commit, thiết kế ẩn danh |
| M5 | Kiểm thử/CI | Test case Sprint 1, bật CI chạy test, kiểm thử đồng bộ Trello | Test case, kết quả test |
| M0 | Quản lý | Sprint Planning, burndown, báo cáo tuần, cập nhật Risk; khung module `report` | Sprint report, burndown |

### Sprint 2 (Tuần 5) – Bảng đóng góp
| Người | Lát cắt dọc | Việc cụ thể | Minh chứng |
|---|---|---|---|
| M3 | Đóng góp & Dashboard | API tổng hợp đóng góp, truy vết đến sự kiện gốc; dashboard biểu đồ, bảng bằng chứng, bộ lọc theo sprint/người; khai báo thủ công có xác nhận | Commit, API doc, demo |
| M1 | Trello hoàn thiện | Đồng bộ định kỳ/thủ công, xử lý lỗi và rate limit, mã hóa token | Commit, test |
| M2 | Nhóm hoàn thiện + BA | Hoàn thiện quản lý thành viên/sprint; kiểm tra công thức với dữ liệu thật của nhóm (có đồng ý), thu thập phản hồi | Báo cáo kiểm tra công thức |
| M4 | Chấm chéo | API mở/đóng đợt, nhận đánh giá; form chấm chéo | Commit, demo |
| M5 | Tích hợp | Test tích hợp các module, ghi defect, môi trường staging | Integration log, defect log |
| M0 | Quản lý | Cập nhật Gantt thực tế, **quyết định tính năng có điều kiện** (CR) | Sprint report, CR |

### Sprint 3 (Tuần 6) – Chấm chéo, PDF, kiểm thử
| Người | Lát cắt dọc | Việc cụ thể | Minh chứng |
|---|---|---|---|
| M4 | Chấm chéo hoàn thiện | `AnonymityAggregator` (ngưỡng ≥ 3 lượt), kết quả tổng hợp, kiểm tra không lộ danh tính; (có điều kiện) cảnh báo sớm | Commit, kiểm tra ẩn danh |
| M0 | Báo cáo PDF | `report`: tổng hợp đóng góp, điểm chấm chéo, bằng chứng chính; nút xuất | Commit, demo PDF |
| M3 | Đóng góp hoàn thiện | Tối ưu truy vấn, kiểm thử dữ liệu lớn hơn, chỉnh dashboard theo phản hồi | Commit, kết quả đo |
| M1 | Hoàn thiện nền tảng | Bảo mật cơ bản, phân quyền theo vai trò nhóm, sửa lỗi tích hợp | Commit |
| M2 | BA + nhóm | Chuẩn bị UAT: kịch bản, danh sách người thử, phiếu phản hồi | Kịch bản UAT |
| M5 | Kiểm thử | Unit/integration/regression test, defect log, đo hiệu năng PDF | Test results, defect log |

### Sprint 4 (Tuần 7) – UAT và triển khai
| Người | Việc | Minh chứng |
|---|---|---|
| M0 | Khóa phạm vi, theo dõi sửa lỗi, báo cáo sprint | Sprint report |
| M1, M3, M4 | Sửa lỗi trong module của mình theo defect log; (có điều kiện) Google Docs bản đơn giản (M1) | Commit |
| M2 | Tiến hành UAT (≥ 10 người), tổng hợp phản hồi, đo mức hài lòng (G5) | Kết quả UAT |
| M5 | Triển khai bản demo, hướng dẫn cài đặt/sử dụng, tài khoản demo, bằng chứng triển khai | Release, user guide, URL/video demo |

### Tuần 8 – Đóng dự án
| Người | Công việc | Sản phẩm/minh chứng |
|---|---|---|
| M0 | Tổng hợp báo cáo cuối, đánh giá G1–G6, lessons learned, kiểm tra link Drive/định dạng/đạo văn | Final report, closure checklist |
| M2 | Chương I, kết quả khảo sát/UAT, kết luận có số liệu | Nội dung chương |
| M1 | Kiến trúc, tích hợp, kết quả kỹ thuật | Nội dung chương |
| M3 | ERD, dữ liệu, công thức đóng góp, kết quả đo | Nội dung chương |
| M4 | Chấm chéo, ẩn danh, giới hạn | Nội dung chương |
| M5 | Kiểm thử, triển khai, kết quả đo; demo cuối | Nội dung chương, demo |
| Cả 6 người | Mini-PM Report cá nhân (3–5 trang), bảng đánh giá mức độ tham gia, chuẩn bị thuyết trình (ai cũng phải trình bày) | Mini-PM Report |

---

## 7. Trách nhiệm chung của mọi thành viên

- Cập nhật task Trello đúng trạng thái, đúng hạn, gắn minh chứng (link commit, ảnh, tài liệu).
- Ghi log công việc hằng tuần (ngày, việc, thời gian, minh chứng).
- Chủ module chịu trách nhiệm cả migration, API, giao diện và test của module mình; không để một tầng "chờ người khác".
- Review Pull Request của người liền kề trong sơ đồ phụ thuộc trong vòng 24 giờ.
- Báo cáo rủi ro/vấn đề sớm cho M0 và đề xuất Change Request khi cần thay đổi hợp đồng API hoặc phạm vi.
- Sẵn sàng mở source code, công cụ quản lý, test log, database khi GV yêu cầu chứng minh phần việc (báo cáo online).
- Tự làm Mini-PM Report của mình, không sao chép của người khác.

---

## 8. Rủi ro riêng của cách chia dọc (đã thêm vào Risk Register)

| ID | Rủi ro | Mức độ | Owner | Biện pháp |
|---|---|---|---|---|
| R16 | Module phía dưới chờ nền tảng của M1 | Cao | M1, M0 | M1 giao khung xác thực trong 2–3 ngày đầu Sprint 1; M2/M3/M4 làm với dữ liệu giả trong lúc chờ |
| R17 | Mỗi người làm giao diện/API một kiểu, khó thống nhất | TB | M1, M0 | Layout/component chung do M1 tạo, API contract chốt Tuần 3, review chéo PR |
| R18 | Đụng migration Flyway, lệch schema giữa các máy | TB | M3 | Phiên bản theo ngày giờ, mỗi người chỉ sửa migration của module mình, M3 giữ ERD tổng |
| R19 | M1 quá tải (nền tảng + tích hợp Trello) | Cao | M0 | Giao người mạnh code nhất; M0 hỗ trợ sau Sprint 1; cắt Google Docs nếu trễ |
| R20 | Thành viên chưa quen một tầng (ví dụ ít làm React) | TB | Từng người, M0 | Pair programming, mẫu component chung, hỗ trợ lẫn nhau, ghi vào Mini-PM Report như một khó khăn đã xử lý |

---

## 9. Bảng theo dõi mức độ tham gia (dùng cho báo cáo cuối kỳ)

| Thành viên | Phân hệ | Công việc chính đã làm | Thời gian (giờ) | Minh chứng (link) | % tự đánh giá | % nhóm đánh giá |
|---|---|---|---|---|---|---|
| [ ] (M0) | PM chung + Report | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] (M1) | Nền tảng + Trello | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] (M2) | Nhóm/Sprint + BA | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] (M3) | Đóng góp + Data | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] (M4) | Chấm chéo + Cảnh báo | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] (M5) | QA + Deployment | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## 10. Mini-PM Report – khung mỗi thành viên cần chuẩn bị

1. Thông tin chung: họ tên, MSSV, vai trò, phân hệ phụ trách
2. Mục tiêu phân hệ và tiêu chí hoàn thành
3. Kế hoạch: backlog/sprint plan, timeline, nguồn lực, rủi ro chính
4. Thực hiện: công việc đã làm, trạng thái, minh chứng (commit theo module của mình, log, screenshot có thời gian)
5. Kiểm thử: test case, kết quả, lỗi và cách xử lý
6. Quản lý: một vấn đề hoặc thay đổi đã xử lý theo góc độ quản lý dự án
7. Tổng kết: khó khăn, bài học, tự đánh giá đóng góp, đề xuất cải thiện

---

## 11. Quy tắc điều chỉnh phân công

- Muốn đổi module hoặc chuyển việc: nêu lý do, đánh giá tác động đến tiến độ, ghi vào Change Log, M0 duyệt.
- Thành viên quá tải hoặc trễ việc 2 lần liên tiếp: họp xử lý, chia lại việc hoặc hỗ trợ.
- Mọi thay đổi phải được cập nhật vào WBS, Gantt và RACI.
