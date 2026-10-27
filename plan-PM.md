# KẾ HOẠCH DỰ ÁN – FairShare

**Môn:** Quản lý dự án CNTT – UEH (GV: TS. Nguyễn Mạnh Tuấn)
**Đề tài:** FairShare – Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm
**Nhóm:** 6 thành viên | **Thời lượng:** 7 tuần | **Mô hình:** Scrum rút gọn (sprint 1 tuần)

> Ghi chú: các mục có dấu `[ ]` là việc cần điền/cập nhật khi thực hiện. Ngày cụ thể điền sau khi chốt lịch học kỳ.

---

## 1. Tổng quan

### 1.1 Vấn đề
Đồ án nhóm thường có tình trạng free-rider. Leader khó chứng minh ai làm ít, thành viên làm nhiều bị thiệt thòi, giảng viên thiếu dữ liệu để chấm điểm cá nhân.

### 1.2 Mục tiêu dự án (SMART)
| ID | Mục tiêu | Tiêu chí thành công (đo được) |
|---|---|---|
| G1 | Tự động thu thập dữ liệu hoạt động từ Trello | Đồng bộ đúng ≥ 95% task đã hoàn thành so với đối chiếu thủ công trên bộ dữ liệu mẫu |
| G2 | Hiển thị bảng đóng góp có truy vết | Mỗi chỉ số đóng góp truy được về từng task/sự kiện gốc (ai, làm gì, khi nào) |
| G3 | Chấm chéo ẩn danh cuối sprint | Không hiển thị điểm cá nhân của từng người chấm; chỉ hiển thị khi có ≥ 3 lượt đánh giá |
| G4 | Xuất báo cáo PDF nộp cho GV | Xuất thành công < 10 giây với nhóm 6 người, 4 sprint dữ liệu |
| G5 | Kiểm chứng giá trị với người dùng | ≥ 80% người dùng thử (ít nhất 10 sinh viên) đánh giá báo cáo "dễ hiểu và hữu ích" |
| G6 | Đáp ứng yêu cầu quản lý dự án của môn | Đủ bộ artefact (mục 8) và log minh chứng theo từng tuần/sprint |

### 1.3 Phạm vi

**Trong phạm vi (MVP – bắt buộc):**
1. Đăng nhập, tạo nhóm/dự án, mời thành viên, đồng ý chia sẻ dữ liệu (consent)
2. Tích hợp Trello (đồng bộ board, card, người phụ trách, trạng thái hoàn thành, thời điểm)
3. Bảng đóng góp: biểu đồ tỷ lệ đóng góp, danh sách bằng chứng truy vết
4. Chấm chéo ẩn danh theo tiêu chí (chất lượng, đúng hạn, hợp tác)
5. Xuất báo cáo PDF

**Có điều kiện (làm nếu còn buffer, quyết định ở cuối Sprint 2 qua Change Request):**
- Cảnh báo sớm khi thành viên không hoạt động (bản đơn giản: rule-based, thông báo trên giao diện/email)
- Tích hợp Google Docs (bản đơn giản: số lần chỉnh sửa/revision theo người dùng)

**Ngoài phạm vi (Out of scope):**
- Ứng dụng mobile native
- Tích hợp GitHub/Jira/Slack
- Dùng AI/ML để chấm điểm hoặc nhận xét tự động
- Hệ thống thanh toán, đa trường/đa tổ chức
- Tự động quyết định điểm cuối cùng (FairShare chỉ là công cụ tham khảo)

### 1.4 Giả định và ràng buộc
- Chỉ dùng dữ liệu mẫu hoặc dữ liệu của chính các thành viên khi có đồng ý (theo quy định môn học mục 7).
- Chi phí bằng 0 (dùng gói miễn phí, hạ tầng sinh viên).
- Mỗi thành viên có khoảng [ ] giờ/tuần cho dự án.
- Google API chạy ở chế độ Testing (danh sách test user) vì không cần xác minh ứng dụng.

---

## 2. Stakeholder Register (sơ bộ)

| Stakeholder | Vai trò | Quan tâm chính | Mức ảnh hưởng | Mức quan tâm | Cách làm việc |
|---|---|---|---|---|---|
| GV (TS. Nguyễn Mạnh Tuấn) | Người đánh giá, người dùng cuối của báo cáo | Báo cáo đáng tin cậy, đủ minh chứng, đúng quy định | Cao | Cao | Báo cáo theo mốc, phản hồi góp ý |
| Nhóm kiểm soát (PCG) | Giám sát độc lập | Plan vs Actual, rủi ro, thay đổi | Cao | Cao | Báo cáo tuần/sprint, cung cấp minh chứng |
| Nhóm dự án (6 thành viên) | Thực hiện | Phân công công bằng, điểm cá nhân | Cao | Cao | Họp tuần, task board |
| Sinh viên/nhóm đồ án khác | Người dùng mục tiêu | Dễ dùng, không bị giám sát quá mức | Trung bình | Trung bình | Khảo sát, dùng thử UAT |
| Leader nhóm đồ án | Người dùng chính | Có bằng chứng để chia điểm | Trung bình | Cao | Phỏng vấn, UAT |
| UEH/Khoa CNTTKD | Đơn vị quản lý | Tuân thủ quy định, đạo đức dữ liệu | Thấp | Thấp | Tuân thủ quy định |
| Trello, Google | Nhà cung cấp API | Điều khoản sử dụng, giới hạn rate limit | Trung bình | Thấp | Đọc tài liệu API |

---

## 3. Phương pháp và quy trình làm việc

- **Mô hình:** Scrum rút gọn. Sprint dài 1 tuần (Tuần 3–6), Tuần 1–2 là khởi động, phân tích và lập kế hoạch, Tuần 7 đóng dự án.
- **Sự kiện:**
  - Sprint Planning: đầu tuần (30–45 phút)
  - Họp đứng (stand-up): 2 lần/tuần, 15 phút (có thể qua nhóm chat, ghi lại log)
  - Sprint Review + Retrospective: cuối tuần (45 phút)
- **Definition of Done (DoD):**
  - Code đã merge qua Pull Request, có ít nhất 1 người review
  - Có test case tương ứng và đã chạy pass
  - Cập nhật task board và log công việc
  - Demo được trên môi trường chung
- **Công cụ:** Trello (task board), GitHub (mã nguồn, Pull Request, Issues, Actions), MS Project/GanttProject (Gantt), Google Drive (tài liệu, minh chứng), Zalo/Discord/MS Teams (giao tiếp), Draw.io/StarUML (UML, ERD).
- **Quy tắc Git:** nhánh `main` (ổn định), `develop`, nhánh `feature/<tên>`; commit nhỏ, thường xuyên; không commit toàn bộ code một lần vào cuối kỳ.

---

## 4. Lịch trình tổng thể (7 tuần)

| Tuần | Giai đoạn | Mục tiêu chính | Sản phẩm/minh chứng bắt buộc |
|---|---|---|---|
| 1 | Khởi động, phân tích nghiệp vụ & phạm vi | Chốt đề tài, phân vai, khảo sát, yêu cầu, Use Case/BPMN, MVP, WBS | Project Charter, Stakeholder sơ bộ, Team Charter, task board, repository, Requirement list, Use Case/BPMN, Scope Statement, WBS, backlog, kết quả khảo sát |
| 2 | Lập kế hoạch & thiết kế | Gantt, nguồn lực, rủi ro, giao tiếp, kiến trúc, ERD, prototype, spike kỹ thuật | Gantt, RACI, Risk Register, Communication Plan, kiến trúc, ERD, prototype, kết quả spike API |
| 3 | **Sprint 1** | Nền tảng + tích hợp Trello | Sprint report, commit, demo increment, issue log |
| 4 | **Sprint 2** | Bảng đóng góp + công thức tính | Integrated build, change log, updated schedule |
| 5 | **Sprint 3** | Chấm chéo ẩn danh + xuất PDF + kiểm thử | Test cases, defect log, progress report, revised plan |
| 6 | **Sprint 4** | UAT, sửa lỗi, triển khai, tính năng có điều kiện | UAT, release, deployment evidence, user guide |
| 7 | Đóng dự án & báo cáo | Đánh giá mục tiêu, lessons learned, báo cáo/slide/demo | Final report, final demo, lessons learned, closure checklist, Mini-PM Report |

> Ghi chú: Nếu GV yêu cầu sprint dài hơn hoặc lịch học kỳ khác, điều chỉnh bảng này và ghi lại bằng Change Request.

---

## 5. Kế hoạch từng Sprint

### Giai đoạn chuẩn bị (Tuần 1–2)

**Tuần 1 – Khởi động & Phân tích**
- Họp kick-off, chốt đề tài và vai trò
- Lập Project Charter, Team Charter (quy tắc làm việc, kênh liên lạc, cách giải quyết xung đột)
- Tạo repository, task board, thư mục Drive minh chứng
- Soạn bảng khảo sát nhu cầu (Google Form)
- Chạy khảo sát và phỏng vấn ngắn (mục tiêu ≥ 15 phản hồi)
- Viết yêu cầu chức năng/phi chức năng, Use Case, BPMN quy trình chấm chéo
- Xác định MVP, viết Scope Statement, lập WBS và product backlog (ước lượng story point)
- Thiết kế bộ tiêu chí và công thức đo đóng góp (bản nháp)

**Tuần 2 – Lập kế hoạch & thiết kế**
- Lập Gantt, RACI, Risk Register, Communication Plan, kế hoạch chất lượng/test plan
- Thiết kế kiến trúc, ERD, API, wireframe/prototype
- **Spike kỹ thuật (1–2 ngày):** thử Trello API (OAuth/token, webhook, board/card/member/action) và Google Docs/Drive revision API; ghi kết quả để quyết định phạm vi
- Soạn mẫu consent và chính sách dữ liệu
- Thiết lập môi trường dev, CI cơ bản

### Sprint 1 (Tuần 3) – Nền tảng & tích hợp Trello
**Sprint Goal:** Người dùng đăng nhập, tạo nhóm, kết nối Trello và thấy dữ liệu card đồng bộ.
- Cấu trúc dự án, CSDL, xác thực (đăng nhập, phân quyền), quản lý nhóm
- Chức năng consent
- Kết nối Trello (token), đồng bộ board/card/member/action vào CSDL
- Giao diện: đăng nhập, nhóm, kết nối Trello
- Dữ liệu mẫu, test case Sprint 1
- **Tiêu chí hoàn thành:** đồng bộ thành công một board mẫu; có demo và log commit

### Sprint 2 (Tuần 4) – Bảng đóng góp
**Sprint Goal:** Hiển thị tỷ lệ đóng góp từng thành viên với bằng chứng truy vết.
- Công thức tính điểm đóng góp (trọng số theo story point/độ khó, đúng hạn)
- API tổng hợp đóng góp, truy vết đến sự kiện gốc
- Giao diện dashboard (biểu đồ tỷ lệ, danh sách bằng chứng, bộ lọc theo sprint/người)
- Cho phép khai báo đóng góp thủ công có xác nhận của người khác (cho việc ngoài Trello)
- Tích hợp các phân hệ, cập nhật Risk/Change Log
- **Quyết định cuối sprint:** có làm tính năng có điều kiện (Google Docs/cảnh báo sớm) hay không (ghi bằng Change Request)

### Sprint 3 (Tuần 5) – Chấm chéo, PDF, kiểm thử
**Sprint Goal:** Hoàn thiện chấm chéo ẩn danh và xuất báo cáo; chạy kiểm thử tích hợp.
- Chu kỳ chấm chéo: mở/đóng đợt, form tiêu chí, lưu trữ ẩn danh, quy tắc tổng hợp (ngưỡng tối thiểu)
- Xuất báo cáo PDF (tổng hợp đóng góp, điểm chấm chéo, bằng chứng chính)
- Unit/integration test, ghi nhận defect
- Đo tiến độ thực tế, báo cáo PCG, điều chỉnh kế hoạch

### Sprint 4 (Tuần 6) – UAT và triển khai
**Sprint Goal:** Người dùng thật chấp nhận sản phẩm; hệ thống chạy được trên môi trường demo.
- UAT với ≥ 10 sinh viên (kịch bản, bảng ghi nhận phản hồi)
- Sửa lỗi nghiêm trọng, hoàn thiện hiệu năng/bảo mật cơ bản
- Triển khai bản demo, viết hướng dẫn sử dụng và hướng dẫn cài đặt, chuẩn bị tài khoản demo
- (Có điều kiện) cảnh báo sớm / Google Docs bản đơn giản
- Khóa phạm vi, đóng băng code ở cuối tuần

### Tuần 7 – Đóng dự án
- Đánh giá mục tiêu: đạt/không đạt từng G1–G6 kèm số liệu
- Lessons learned (≥ 3 bài học cụ thể dựa trên minh chứng)
- Hoàn thiện báo cáo Word (đặt tên NhomXYZ), slide, demo, Mini-PM Report của từng thành viên
- Kiểm tra checklist nghiệm thu, kiểm tra link Drive hoạt động đến khi có điểm chính thức

---

## 6. Quản lý theo dõi và kiểm soát (Monitoring & Control)

- **Chỉ số theo dõi mỗi tuần:** % hoàn thành theo WBS, velocity (story point hoàn thành/kế hoạch), số task trễ, số defect mở/đóng, số Change Request, số rủi ro mở.
- **Báo cáo tuần/sprint:** theo mẫu Phụ lục A của môn học (trạng thái On Track/At Risk/Delayed; Plan–Actual; việc hoàn thành; việc tiếp theo; vấn đề/rủi ro; thay đổi; bài học).
- **Burndown chart:** cập nhật hằng ngày/2 ngày trong sprint.
- **Ngưỡng cảnh báo (trigger):**
  - Velocity thấp hơn 20% kế hoạch trong 1 sprint → họp xử lý, cân nhắc cắt phạm vi
  - Task Critical trễ > 2 ngày → báo PM, đánh giá tác động
  - Defect nghiêm trọng mở > 3 ngày → ưu tiên sửa
- **Cung cấp minh chứng cho PCG:** gửi liên kết task board, Gantt, commit, test log theo lịch của PCG.
- **Lưu ý minh chứng:** screenshot phải có ngày/giờ hoặc liên kết với log/commit.

---

## 7. Quản lý thay đổi (Change Management)

1. Ai cũng có thể đề xuất thay đổi bằng Change Request (mẫu Phụ lục C).
2. PM chính tổng hợp, đánh giá tác động Scope/Time/Resource/Quality.
3. Nhóm họp quyết định Approve/Reject (đa số, PM quyết khi hòa); thay đổi lớn báo GV/PCG.
4. Cập nhật backlog, Gantt, Risk Register; ghi vào Change Log.

| ID | Yêu cầu thay đổi | Lý do | Ảnh hưởng (Scope/Time/Resource/Quality) | Đề xuất | Quyết định | Ngày |
|---|---|---|---|---|---|---|
| CR01 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## 8. Quản lý rủi ro – Risk Register ban đầu

Thang điểm: Xác suất (1–5) × Tác động (1–5) → Điểm; ≥ 15 Cao, 8–14 Trung bình, < 8 Thấp.

| ID | Rủi ro | Xác suất | Tác động | Mức độ | Owner | Biện pháp ứng phó                                                                                                                                   | Loại | Trạng thái |
|---|---|---|---|---|---|-----------------------------------------------------------------------------------------------------------------------------------------------------|---|---|
| R01 | Google OAuth/giới hạn quyền truy cập Docs làm tích hợp không khả thi | 4 | 4 | Cao | Backend/API | Spike ở Tuần 2; chạy chế độ Testing; dự phòng: import CSV hoặc chỉ đếm revision                                                                     | Mitigate | Open |
| R02 | API Trello thay đổi/giới hạn rate limit/lỗi đồng bộ | 3 | 4 | Cao | Backend/API | Viết module tạm thời tương tự các tính năng API của Trello để chữa cháy tạm thời nhưng vẫn đảm bảo vận hành tốt.                                    | Mitigate | Open |
| R03 | Vi phạm quyền riêng tư (thu thập dữ liệu khi chưa có đồng ý, dùng dữ liệu thật khi demo) | 3 | 5 | Cao | PM chính + BA | Consent rõ ràng, dữ liệu mẫu, chỉ lấy dữ liệu tối thiểu, chính sách xóa dữ liệu (tham chiếu Nghị định 13/2023/NĐ-CP)                                | Avoid | Open |
| R04 | Chấm chéo "ẩn danh" bị lộ do nhóm nhỏ | 4 | 4 | Cao | BA + Database | Ngưỡng tổng hợp ≥ 3 lượt, chỉ hiển thị trung bình, không lưu liên kết trực tiếp người chấm–người được chấm trong giao diện, ghi rõ giới hạn ẩn danh | Mitigate | Open |
| R05 | Gian lận dữ liệu (tạo task giả, chia nhỏ task, chỉnh sửa vô nghĩa) | 4 | 4 | Cao | BA | Trọng số theo độ khó, phát hiện bất thường, cho phép phản đối, khai báo thủ công cần xác nhận                                                       | Mitigate | Open |
| R06 | Công thức đóng góp bị cho là thiếu công bằng/khó giải thích | 4 | 4 | Cao | BA | Công thức minh bạch, hiển thị chi tiết, thử nghiệm với dữ liệu thật của nhóm, thu thập phản hồi                                                     | Mitigate | Open |
| R07 | Scope creep (thêm tính năng ngoài MVP) | 4 | 3 | TB | PM chính | Scope Statement, danh sách Out of scope, Change Request bắt buộc                                                                                    | Avoid | Open |
| R08 | Ước lượng sai effort, trễ tiến độ do chỉ có 4 sprint | 4 | 4 | Cao | PM chính | Buffer 20–30%, ưu tiên MVP, cắt tính năng có điều kiện                                                                                              | Mitigate | Open |
| R09 | Thành viên thiếu kỹ năng với tích hợp API/bảo mật | 3 | 3 | TB | PM chính | Phân công theo thế mạnh, pair programming, tài liệu hướng dẫn                                                                                       | Mitigate | Open |
| R10 | Thành viên vắng/quá tải do lịch học và thi | 4 | 3 | TB | PM chính | Lịch họp linh hoạt, người dự phòng cho mỗi phân hệ, theo dõi workload                                                                               | Mitigate | Open |
| R11 | Tích hợp muộn, lỗi phát hiện trễ | 3 | 4 | Cao | QA & Deploy | Tích hợp liên tục, vertical slice ngay Sprint 1, CI chạy test                                                                                       | Mitigate | Open |
| R12 | Không tìm đủ người dùng thử cho UAT | 3 | 3 | TB | BA | Liên hệ sớm các nhóm khác, chuẩn bị bản demo có dữ liệu mẫu, khảo sát online                                                                        | Mitigate | Open |
| R13 | Mất dữ liệu/code, mất truy cập hạ tầng | 2 | 5 | TB | QA & Deploy | Git remote, backup CSDL, tài liệu triển khai                                                                                                        | Mitigate | Open |
| R14 | Xung đột nội bộ, đánh giá lẫn nhau căng thẳng | 3 | 3 | TB | PM chính | Team Charter, retrospective, trao đổi thẳng thắn, PCG/GV hỗ trợ khi cần                                                                             | Mitigate | Open |
| R15 | Bị coi là copy/AI chưa kiểm chứng, vi phạm quy định | 2 | 5 | TB | PM chính | Tự viết nội dung, kiểm tra đầu ra AI, kiểm tra đạo văn trên LMS, ghi rõ nguồn tham khảo                                                             | Avoid | Open |

> Khi rủi ro xảy ra, chuyển thành Issue trong Issue Log và ghi hành động khắc phục.

---

## 9. Kế hoạch chất lượng

- **Tiêu chí chất lượng:** đúng yêu cầu MVP, không có lỗi nghiêm trọng khi demo, hiệu năng theo G4, bảo mật cơ bản (mã hóa token, phân quyền).
- **Hoạt động:** code review qua Pull Request, unit test, integration test, kiểm thử chức năng, UAT.
- **Test plan:** liệt kê chức năng, test case (mẫu Phụ lục D), môi trường test, tiêu chí pass/fail, quy trình xử lý lỗi (mức độ Critical/Major/Minor).
- **Quy ước lỗi:** Critical (không dùng được chức năng chính) phải sửa trước khi phát hành.
- **Tiêu chí chấp nhận (UAT):** ≥ 90% test case pass; không còn lỗi Critical; ≥ 80% người dùng thử hài lòng (G5).

---

## 10. Kế hoạch giao tiếp (Communication Plan)

| Thông tin | Đối tượng | Kênh | Tần suất | Người phụ trách |
|---|---|---|---|---|
| Họp nhóm, Sprint Planning/Review | Cả nhóm | Họp trực tiếp/MS Teams | Hằng tuần | PM chính |
| Stand-up, cập nhật nhanh | Cả nhóm | Nhóm chat | 2 lần/tuần | Từng thành viên |
| Báo cáo tuần/sprint | GV, PCG | File/Drive, MS Teams | Hằng tuần | PM chính |
| Cung cấp minh chứng | PCG | Drive, link Trello/GitHub | Theo lịch PCG | PM chính |
| Phản hồi nhận xét PCG/GV | PCG, GV | Tài liệu, họp | Khi có | PM chính + người liên quan |
| Báo cáo trên lớp/online | GV, các nhóm | MS Teams | Theo lịch GV | Toàn nhóm |
| Biên bản họp, quyết định | Cả nhóm | Drive | Sau mỗi buổi họp | Người ghi biên bản (luân phiên) |

---

## 11. Danh mục sản phẩm bàn giao (Deliverables)

**Quản lý dự án:** Project Charter, Stakeholder Register, Communication Plan, Scope Statement, WBS, Backlog, Gantt, RACI, Risk Register, Change Log, Issue Log, báo cáo tuần/sprint, biên bản họp, Final Project Report, Project Closeout.

**Sản phẩm phần mềm:** Use Case/BPMN, danh sách yêu cầu, kiến trúc, UI/UX, ERD và dữ liệu mẫu, source code có lịch sử commit, test plan/test case/defect log/UAT, bản demo chạy được, hướng dẫn cài đặt/chạy, tài khoản demo.

**Cá nhân:** Mini-PM Report (3–5 trang/người), log công việc, bảng đánh giá mức độ tham gia.

**Báo cáo cuối kỳ (cấu trúc theo quy định):** Trang bìa → Bảng mức độ tham gia → Mục lục → Chương I Tổng quan → Chương II Quản lý dự án → Chương III Phân tích, thiết kế, phát triển → Chương IV Kết quả và đánh giá → Chương V Kết luận → Tài liệu tham khảo → Phụ lục.

---

## 12. Theo dõi tuân thủ quy định môn học

| Yêu cầu | Cách đáp ứng | Người kiểm tra |
|---|---|---|
| Có công cụ quản lý dự án và mã nguồn | Trello + GitHub (có thể thêm MS Project) | PM chính |
| Commit history hợp lý | Commit nhỏ hằng ngày, không đẩy code một lần | Backend/API |
| Screenshot có ngày giờ | Quy ước chụp có thời gian, liên kết commit | Cả nhóm |
| Dữ liệu mẫu ghi rõ nguồn | Tài liệu mô tả cách tạo dữ liệu | Database/Data |
| AI hỗ trợ phải kiểm chứng | Review đầu ra AI, không coi AI là minh chứng | Cả nhóm |
| Link Drive duy trì đến khi có điểm | Kiểm tra link định kỳ, phân quyền xem | PM chính |
| Đặt tên file NhomXYZ, định dạng Word | Kiểm tra trước khi nộp | PM chính |
| Trích dẫn tài liệu tham khảo đúng quy định UEH | Dùng Zotero/Mendeley | BA |
| Đạo văn < 20% | Kiểm tra trên LMS trước khi nộp | PM chính |
| Mini-PM Report của mọi thành viên | Theo dõi hạn nộp | PM chính |
| Mọi thay đổi lớn ghi Change Log | Quy trình mục 7 | PM chính |

---

## 13. Tiêu chí đóng dự án (Closure checklist)

- [ ] Từng mục tiêu G1–G6 được đánh giá đạt/chưa đạt kèm số liệu
- [ ] Chức năng MVP đã kiểm thử, có kết quả
- [ ] Lỗi nghiêm trọng đã xử lý hoặc có quyết định chấp nhận rủi ro
- [ ] Source code, database, cấu hình, tài liệu được lưu trữ
- [ ] Hướng dẫn cài đặt/chạy và tài khoản demo sẵn sàng
- [ ] Người dùng thử đã dùng và phản hồi
- [ ] Hạng mục chưa hoàn thành đã chuyển vào backlog/hướng phát triển
- [ ] Lessons learned (≥ 3 bài học cụ thể) đã thảo luận và ghi nhận
- [ ] Mini-PM Report của cả 6 thành viên hoàn tất
- [ ] Link minh chứng được duy trì đến khi có điểm chính thức
