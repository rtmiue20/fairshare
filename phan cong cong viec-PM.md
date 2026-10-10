# PHÂN CÔNG CÔNG VIỆC – FairShare

**Môn:** Quản lý dự án CNTT – UEH | **Nhóm:** 6 thành viên | **Đề tài:** FairShare

> Điền tên, MSSV vào các chỗ `[ ]`. Phân công dưới đây dựa trên cơ cấu vai trò của quy định môn học (mỗi người là "PM mini" của một phân hệ, đồng thời trực tiếp làm việc chuyên môn). Có thể hoán đổi vai trò theo thế mạnh thực tế, nhưng phải ghi lại bằng Change Log.

---

## 1. Danh sách thành viên và vai trò

| TT | Họ tên | MSSV | Vai trò (PM mini) | Phân hệ/Work package chính | Công việc chuyên môn trực tiếp |
|---|---|---|---|---|---|
| 1 | [ ] (Nhóm trưởng) | [ ] | **PM hệ thống chung** | WP0 – Quản lý dự án | Charter, WBS, Gantt, tổng hợp báo cáo, quản lý rủi ro/thay đổi, điều phối; đồng thời hỗ trợ code module báo cáo PDF |
| 2 | [ ] | [ ] | **PM phân tích nghiệp vụ (BA)** | WP1 – Yêu cầu & Công thức đóng góp | Khảo sát, yêu cầu, Use Case/BPMN, backlog, thiết kế công thức đóng góp và tiêu chí chấm chéo, tài liệu chính sách dữ liệu |
| 3 | [ ] | [ ] | **PM Backend/API & Tích hợp** | WP2 – Backend, tích hợp Trello/Google | API, xác thực, đồng bộ Trello, (có điều kiện) Google Docs, tính điểm đóng góp |
| 4 | [ ] | [ ] | **PM Web Frontend** | WP3 – Giao diện web | UI/UX, dashboard, biểu đồ, giao diện chấm chéo, tích hợp API |
| 5 | [ ] | [ ] | **PM Database/Data** | WP4 – CSDL & Dữ liệu | ERD, schema, dữ liệu mẫu, truy vấn tổng hợp, chất lượng dữ liệu, cơ chế ẩn danh ở tầng dữ liệu |
| 6 | [ ] | [ ] | **PM QA & Deployment** | WP5 – Kiểm thử & Triển khai | Test plan, test case, defect log, UAT, CI/CD, triển khai demo, hướng dẫn chạy |

> Gợi ý cân bằng tải: Backend/API là phân hệ nặng nhất (tích hợp 2 API ngoài). Người số 3 nên là người mạnh nhất về lập trình. Người số 1 (PM) và số 5 có thể hỗ trợ code ở Sprint 2–3 khi có buffer.

---

## 2. Ma trận RACI theo nhóm công việc

R = Thực hiện, A = Chịu trách nhiệm cuối, C = Tham vấn, I = Được thông báo

| Công việc / Sản phẩm | PM chung | BA | Backend | Frontend | Database | QA & Deploy |
|---|---|---|---|---|---|---|
| Project Charter, Stakeholder Register | A/R | C | I | I | I | I |
| Khảo sát người dùng, yêu cầu, Use Case/BPMN | C | A/R | C | C | I | I |
| Scope Statement, WBS, Backlog | A | R | C | C | C | C |
| Gantt, RACI, Communication Plan | A/R | C | I | I | I | I |
| Risk Register, Change Log, Issue Log | A/R | C | C | C | C | C |
| Công thức đóng góp, tiêu chí chấm chéo | C | A/R | R | C | C | I |
| Kiến trúc hệ thống | C | C | A/R | C | C | C |
| ERD, schema, dữ liệu mẫu | I | C | C | I | A/R | C |
| Tích hợp Trello | I | C | A/R | I | C | C |
| Tích hợp Google Docs (có điều kiện) | I | C | A/R | I | C | C |
| API tính điểm, truy vết đóng góp | I | C | A/R | C | C | C |
| Giao diện, dashboard, biểu đồ | I | C | C | A/R | I | C |
| Chấm chéo ẩn danh (backend + dữ liệu) | I | C | R | C | A/R | C |
| Chấm chéo ẩn danh (giao diện) | I | C | C | A/R | I | C |
| Xuất báo cáo PDF | A | C | R | R | C | C |
| Cảnh báo sớm (có điều kiện) | I | C | A/R | R | C | C |
| Test plan, test case, defect log | C | C | C | C | C | A/R |
| UAT, tìm người dùng thử | C | A/R | I | I | I | R |
| CI/CD, triển khai, hướng dẫn chạy | I | I | C | C | C | A/R |
| Báo cáo tuần/sprint | A/R | C | C | C | C | C |
| Báo cáo cuối kỳ, slide, demo | A/R | R | R | R | R | R |
| Mini-PM Report | Mỗi người tự làm phần của mình, PM chung kiểm tra | | | | | |

---

## 3. Phân công chi tiết theo tuần

### Tuần 1 – Khởi động
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Họp kick-off, Project Charter, Team Charter, tạo Trello, thư mục Drive | Charter, Team Charter, task board | [ ] |
| BA | Stakeholder sơ bộ, soạn bảng khảo sát (Google Form) | Stakeholder list, form khảo sát | [ ] |
| Backend | Tạo repository GitHub, quy ước nhánh/commit, README | Repo, README | [ ] |
| Database | Tìm hiểu cấu trúc dữ liệu Trello (board, card, member, action) | Ghi chú tìm hiểu | [ ] |
| Frontend | Tìm hiểu giao diện các công cụ tương tự, chọn framework UI | Ghi chú tham khảo | [ ] |
| QA & Deploy | Chọn môi trường triển khai, tạo kênh giao tiếp, mẫu biên bản họp | Kênh chat, mẫu biên bản | [ ] |

### Tuần 2 – Phân tích nghiệp vụ & phạm vi
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| BA | Chạy khảo sát/phỏng vấn, yêu cầu chức năng/phi chức năng, Use Case, BPMN, MVP | Requirement list, Use Case, BPMN, báo cáo khảo sát | [ ] |
| BA + Database | Thiết kế bản nháp công thức đóng góp và tiêu chí chấm chéo | Tài liệu công thức v0.1 | [ ] |
| PM chung | Scope Statement, WBS, backlog (ước lượng story point cùng nhóm) | Scope, WBS, backlog | [ ] |
| Backend | Ước lượng kỹ thuật, đọc tài liệu Trello API | Ghi chú kỹ thuật | [ ] |
| Frontend | Wireframe sơ bộ các màn hình chính | Wireframe v0.1 | [ ] |
| QA & Deploy | Xây dựng chiến lược kiểm thử, danh sách tiêu chí chấp nhận | Khung test plan | [ ] |

### Tuần 3 – Lập kế hoạch & thiết kế
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Gantt, RACI, Risk Register, Communication Plan, resource plan | Gantt, RACI, Risk Register, Comm Plan | [ ] |
| Backend | Kiến trúc hệ thống; **spike** Trello API và Google Docs/Drive revision API | Sơ đồ kiến trúc, kết quả spike | [ ] |
| Database | ERD, schema, kế hoạch dữ liệu mẫu | ERD, SQL schema v1 | [ ] |
| Frontend | Prototype tương tác (Figma hoặc tương đương) | Prototype | [ ] |
| BA | Soạn mẫu consent, chính sách dữ liệu, kịch bản UAT | Consent form, chính sách dữ liệu | [ ] |
| QA & Deploy | Test plan hoàn chỉnh, thiết lập môi trường dev và CI cơ bản | Test plan, pipeline CI | [ ] |

### Sprint 1 (Tuần 4)
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Sprint Planning, theo dõi burndown, báo cáo tuần, cập nhật Risk | Sprint report, burndown | [ ] |
| Backend | Khung dự án, xác thực/phân quyền, quản lý nhóm, kết nối và đồng bộ Trello | Commit, API log, demo đồng bộ | [ ] |
| Database | Tạo schema, migration, dữ liệu mẫu v1 | SQL/migration, dữ liệu mẫu | [ ] |
| Frontend | Giao diện đăng nhập, tạo nhóm, kết nối Trello, consent | Commit, demo UI | [ ] |
| BA | Hoàn thiện công thức đóng góp v1, tiêu chí chấm chéo, làm rõ backlog | Tài liệu công thức v1 | [ ] |
| QA & Deploy | Test case Sprint 1, kiểm thử đồng bộ Trello, bật CI chạy test | Test case, kết quả test | [ ] |

### Sprint 2 (Tuần 5)
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Sprint Planning/Review, cập nhật Gantt thực tế, quyết định tính năng có điều kiện | Sprint report, updated schedule, CR (nếu có) | [ ] |
| Backend | API tính điểm đóng góp và truy vết; khai báo đóng góp thủ công + xác nhận | Commit, API doc, demo | [ ] |
| Database | Truy vết sự kiện gốc, truy vấn tổng hợp, chỉ mục hiệu năng | SQL, kết quả truy vấn | [ ] |
| Frontend | Dashboard biểu đồ tỷ lệ, danh sách bằng chứng, bộ lọc | Commit, demo | [ ] |
| BA | Kiểm tra công thức với dữ liệu thật của nhóm (có đồng ý), thu thập phản hồi | Báo cáo kiểm tra công thức | [ ] |
| QA & Deploy | Test tích hợp các phân hệ, ghi defect, môi trường staging | Integration log, defect log | [ ] |

### Sprint 3 (Tuần 6)
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Báo cáo tiến độ, điều chỉnh kế hoạch, làm việc với PCG, hỗ trợ module PDF | Progress report, revised plan | [ ] |
| Backend | API chấm chéo (mở/đóng đợt, lưu ẩn danh, tổng hợp), xuất PDF | Commit, demo | [ ] |
| Database | Mô hình lưu ẩn danh, ngưỡng tổng hợp ≥ 3 lượt, kiểm tra rò rỉ danh tính | SQL, kiểm tra ẩn danh | [ ] |
| Frontend | Giao diện chấm chéo, xem kết quả tổng hợp, nút xuất PDF | Commit, demo | [ ] |
| BA | Chuẩn bị UAT: kịch bản, danh sách người dùng thử, phiếu phản hồi | Kịch bản UAT, danh sách người thử | [ ] |
| QA & Deploy | Unit/integration/regression test, defect log, đo hiệu năng PDF | Test results, defect log | [ ] |

### Sprint 4 (Tuần 7)
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Khóa phạm vi, theo dõi sửa lỗi, báo cáo sprint | Sprint report | [ ] |
| Backend | Sửa lỗi, bảo mật cơ bản, (có điều kiện) cảnh báo sớm/Google Docs bản đơn giản | Commit | [ ] |
| Database | Sửa lỗi dữ liệu, sao lưu, hoàn thiện dữ liệu mẫu cho demo | SQL, backup | [ ] |
| Frontend | Sửa lỗi UI, hoàn thiện trải nghiệm, (có điều kiện) giao diện cảnh báo | Commit | [ ] |
| BA | Tiến hành UAT (≥ 10 người), tổng hợp phản hồi và đo mức hài lòng (G5) | Kết quả UAT | [ ] |
| QA & Deploy | Triển khai bản demo, hướng dẫn sử dụng/cài đặt, tài khoản demo, bằng chứng triển khai | Release, user guide, URL/video demo | [ ] |

### Tuần 8 – Đóng dự án
| Người phụ trách | Công việc | Sản phẩm/minh chứng | Deadline |
|---|---|---|---|
| PM chung | Tổng hợp báo cáo cuối, đánh giá G1–G6, lessons learned, kiểm tra link Drive/định dạng | Final report, closure checklist | [ ] |
| BA | Chương I, kết quả khảo sát/UAT, phần kết luận có số liệu | Nội dung chương | [ ] |
| Backend | Phần kiến trúc, tích hợp, kết quả kỹ thuật | Nội dung chương | [ ] |
| Frontend | Phần UI/UX, ảnh demo | Nội dung chương | [ ] |
| Database | Phần ERD, dữ liệu, ẩn danh | Nội dung chương | [ ] |
| QA & Deploy | Phần kiểm thử, triển khai, kết quả đo; chuẩn bị demo cuối | Nội dung chương, demo | [ ] |
| Cả 6 người | Mini-PM Report cá nhân (3–5 trang), bảng đánh giá mức độ tham gia, chuẩn bị thuyết trình (ai cũng phải trình bày) | Mini-PM Report | [ ] |

---

## 4. Trách nhiệm chung của mọi thành viên

- Cập nhật task Trello đúng trạng thái, đúng hạn, gắn minh chứng (link commit, ảnh, tài liệu).
- Ghi log công việc hằng tuần (ngày, việc, thời gian, minh chứng).
- Commit nhỏ, thường xuyên, có mô tả rõ; Pull Request cần ít nhất 1 người review.
- Tham dự họp nhóm; báo trước nếu vắng và bàn giao việc.
- Báo cáo rủi ro/vấn đề sớm cho PM chung và đề xuất Change Request khi cần.
- Sẵn sàng mở source code, công cụ quản lý, test log, database khi GV yêu cầu chứng minh phần việc của mình (báo cáo online).
- Tự làm Mini-PM Report của mình, không sao chép của người khác.

---

## 5. Mini-PM Report – khung mỗi thành viên cần chuẩn bị

1. Thông tin chung: họ tên, MSSV, vai trò, phân hệ phụ trách
2. Mục tiêu phân hệ và tiêu chí hoàn thành
3. Kế hoạch: backlog/sprint plan, timeline, nguồn lực, rủi ro chính
4. Thực hiện: công việc đã làm, trạng thái, minh chứng (commit, log, screenshot có thời gian)
5. Kiểm thử: test case, kết quả, lỗi và cách xử lý
6. Quản lý: một vấn đề hoặc thay đổi đã xử lý theo góc độ quản lý dự án
7. Tổng kết: khó khăn, bài học, tự đánh giá đóng góp, đề xuất cải thiện

---

## 6. Bảng theo dõi mức độ tham gia (dùng cho báo cáo cuối kỳ)

| Thành viên | Vai trò | Công việc chính đã làm | Thời gian (giờ) | Minh chứng (link) | % đóng góp tự đánh giá | % đóng góp nhóm đánh giá |
|---|---|---|---|---|---|---|
| [ ] | PM chung | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] | BA | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] | Backend/API | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] | Web Frontend | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] | Database/Data | [ ] | [ ] | [ ] | [ ] | [ ] |
| [ ] | QA & Deploy | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## 7. Quy tắc điều chỉnh phân công

- Muốn đổi vai trò hoặc chuyển việc: nêu lý do, đánh giá tác động đến tiến độ, ghi vào Change Log, PM chung duyệt.
- Thành viên quá tải hoặc trễ việc 2 lần liên tiếp: họp xử lý, chia lại việc hoặc hỗ trợ.
- Mọi thay đổi phải được cập nhật vào WBS, Gantt và RACI.
