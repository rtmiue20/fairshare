# BỘ HỒ SƠ QUẢN LÝ DỰ ÁN – TUẦN 1
## PROJECT CHARTER (HIẾN CHƯƠNG DỰ ÁN)

**Học phần:** Quản lý dự án Công nghệ Thông tin (IT Project Management)  
**Đơn vị đào tạo:** Khoa Công nghệ Thông tin Kinh doanh – Trường Công nghệ và Thiết kế UEH  
**Giảng viên hướng dẫn:** TS. Nguyễn Mạnh Tuấn (tuannm@ueh.edu.vn)  
**Đề tài:** FairShare – Nền tảng minh bạch hóa và ghi nhận đóng góp trong dự án nhóm  
**Nhóm thực hiện:** Nhóm 07 (6 thành viên)  
**Phiên bản:** 1.0 (Chuẩn hóa theo Bảng cấu trúc 16 thành phần – Đề bài Tuần 1 của TS. Nguyễn Mạnh Tuấn)  

---

## BẢNG TỔNG HỢP 16 THÀNH PHẦN PROJECT CHARTER
*(Theo cấu trúc chuẩn Bảng 4 & Bảng 5 – Tài liệu Hướng dẫn Bài tập Tuần 1)*

| STT | Thành phần (Component) | Nội dung tóm lược |
|:---:|---|---|
| **1** | **Project Title** | **FairShare** – Nền tảng minh bạch hóa và ghi nhận đóng góp trong dự án nhóm |
| **2** | **Background** | Hoạt động học tập dựa trên đồ án (Project-Based Learning) tại đại học diễn ra phổ biến nhưng công cụ theo dõi tiến độ bị phân tán (Zalo, Messenger, Drive), gây mất dấu vết đóng góp và phát sinh tranh cãi nội bộ. |
| **3** | **Business Need / Problem** | 63.6% sinh viên gặp tình trạng ỷ lại (free-rider); 54.5% đối mặt việc chấm điểm cảm tính, nể nang; 72.7% dùng Zalo rải rác thiếu trung tâm lưu trữ minh chứng. Giảng viên thiếu số liệu quá trình để chấm điểm công bằng. |
| **4** | **Target Users** | Sinh viên làm đồ án nhóm, Trưởng nhóm (Leader) cần theo dõi tiến độ và Giảng viên / Người đánh giá học phần cần dữ liệu tham khảo chấm điểm. |
| **5** | **Project Goal** | Xây dựng và hoàn thiện phiên bản sản phẩm khả dụng tối thiểu (MVP) Web FairShare trong 8 tuần, tự động thu thập vết công việc có đồng thuận, trực quan hóa đóng góp và hỗ trợ đánh giá đồng đẳng khách quan. |
| **6** | **Project Objectives** | 6 mục tiêu đo lường SMART (G1–G6): Đồng bộ Trello đúng $\ge 95\%$; 100% điểm truy vết về sự kiện gốc; Chấm chéo ẩn danh kích hoạt khi đủ $\ge 3$ lượt; Xuất PDF $< 10$s; UAT đạt $\ge 80\%$ hài lòng; Đủ 100% hồ sơ quản trị. |
| **7** | **Major Deliverables** | Bộ hồ sơ quản lý dự án (Charter, Stakeholder, Team Charter, WBS, Gantt, Risk Register); Bộ mã nguồn Web MVP (Backend Spring Boot, Frontend React, ScoringEngine, AnonymityAggregator); Báo cáo UAT và Báo cáo tổng kết. |
| **8** | **Initial Scope (In-Scope)** | Quản lý nhóm & Sprint; Cơ chế cam kết dữ liệu (Consent Policy); Tích hợp Trello API; Dashboard biểu đồ đóng góp & Bảng bằng chứng truy vết; Chấm chéo ẩn danh; Xuất báo cáo PDF. |
| **9** | **Out of Scope** | Ứng dụng di động độc lập (Mobile App); Chatbot AI / mô hình ML tự động phán xét điểm; Tích hợp đa nền tảng phức tạp (Jira, GitHub, Slack); Cổng thanh toán; Gamification tích điểm. |
| **10** | **Key Stakeholders** | TS. Nguyễn Mạnh Tuấn (Sponsor/Giảng viên), Nhóm kiểm soát dự án (PCG), Trưởng nhóm đồ án, Sinh viên thành viên, Đội ngũ phát triển Nhóm 07, Nhà cung cấp Trello API. |
| **11** | **Constraints** | Ngân sách tài chính 0 VNĐ; Thời gian cố định 8 tuần (4 Sprint phát triển); Nhân lực sinh viên 6 thành viên; Công nghệ bắt buộc Java Spring Boot và React/TypeScript. |
| **12** | **Assumptions** | 100% thành viên trong nhóm tự nguyện đồng thuận ký Consent; Trello REST API duy trì ổn định không đổi chính sách miễn phí; Nhóm có thể phân công độc lập theo lát cắt dọc. |
| **13** | **High-Level Risks** | Rủi ro Rate Limit Trello (R01); Thành viên từ chối ký Consent (R02); Lộ danh tính khi chấm chéo (R03); Chậm tiến độ tích hợp (R04); Bùng nổ phạm vi (R05). |
| **14** | **Success Criteria** | Toàn bộ mã nguồn merge qua Pull Request có review; Test case tự động pass 100%; $\ge 80\%$ người dùng UAT đánh giá công bằng; Xuất file PDF nộp đúng hạn. |
| **15** | **Project Manager** | Nguyễn Văn Minh Triều (Leader Nhóm 07 – MSSV: 31241027455) chịu trách nhiệm điều phối tiến độ, tổ chức Sprint và làm việc với Giảng viên. |
| **16** | **Sponsor / Authorization** | TS. Nguyễn Mạnh Tuấn (Giảng viên hướng dẫn môn học) phê duyệt Hiến chương, chuẩn hóa phạm vi và nghiệm thu kết quả học phần. |

---

## NỘI DUNG CHI TIẾT 16 THÀNH PHẦN PROJECT CHARTER

### 1. Tên dự án (Project Title)
- **Tên tiếng Việt:** Nền tảng minh bạch hóa và ghi nhận đóng góp trong dự án nhóm.
- **Tên thương hiệu quốc tế:** **FairShare** (Ý nghĩa: Đóng góp công bằng – Chia sẻ minh bạch).
- **Mã định danh hệ thống:** `UEH-QLDA-2026-N07-FAIRSHARE`.

### 2. Bối cảnh hình thành (Background)
Trong giáo dục đại học hiện đại, phương pháp học tập theo đồ án (Project-Based Learning) là trọng tâm của các ngành Công nghệ thông tin và Kinh doanh số tại UEH. Một học kỳ sinh viên thường phải hoàn thành từ 3 đến 5 đồ án nhóm song song.
Tuy nhiên, phương thức phối hợp hiện nay chủ yếu dựa vào các nhóm chat Zalo/Messenger không chuyên biệt. Thông tin giao việc, thời hạn và bằng chứng hoàn thành bị trôi mất, không có trung tâm lưu vết dữ liệu. Khi kết thúc môn học, nhóm rơi vào tình trạng tranh cãi, chia điểm cào bằng hoặc trưởng nhóm tự gánh vác báo cáo mà không có căn cứ định lượng xác đáng.

### 3. Vấn đề nghiệp vụ & Nhu cầu giải quyết (Business Need / Problem)
Kết quả khảo sát thực tế từ 11 sinh viên UEH (81.8% sinh viên Năm 3) do Phân hệ M2 triển khai đã lượng hóa 4 vấn đề cấp bách:
1. **Tình trạng ỷ lại (Free-rider):** 63.6% sinh viên xác nhận gặp thành viên lười biếng, đùn đẩy công việc nhưng vẫn muốn hưởng trọn vẹn điểm số của nhóm.
2. **Đánh giá nể nang, cảm tính:** 54.5% đối mặt tình trạng chấm điểm hòa cả làng vì ngại va chạm và sợ làm rạn nứt quan hệ bạn bè.
3. **Mất dấu vết tiến độ & Minh chứng rời rạc:** 72.7% chỉ dùng Zalo nhắn tin; 36.4% không thể tổng hợp được bằng chứng hoàn thành cụ thể khi giảng viên yêu cầu giải trình.
4. **Lo ngại quyền riêng tư:** 54.6% yêu cầu chính sách thu thập dữ liệu phải minh bạch, không xâm phạm thông tin đời tư.
*Nhu cầu nghiệp vụ:* Cần một giải pháp trung gian tự động hóa quá trình thu thập vết công việc, trực quan hóa đóng góp và cung cấp cơ chế đánh giá đồng đẳng bảo mật.

### 4. Người dùng mục tiêu (Target Users)
- **Sinh viên thành viên (Team Members):** Cần được ghi nhận công sức xứng đáng, bảo vệ quyền lợi cá nhân và đánh giá thành viên khác một cách ẩn danh, trung thực.
- **Trưởng nhóm sinh viên (Team Leaders):** Cần công cụ giám sát tiến độ theo thời gian thực, giảm 80% thời gian tổng hợp báo cáo và có dữ liệu phân chia điểm công bằng.
- **Giảng viên hướng dẫn / Người chấm thi (Lecturers / Evaluators):** Cần bản hồ sơ bằng chứng (Evidence Log) trung thực, minh bạch để đánh giá đúng năng lực từng cá nhân trong bài thi nhóm.

### 5. Mục tiêu tổng quát (Project Goal)
Phát triển và triển khai thành công phiên bản sản phẩm khả dụng tối thiểu (**MVP**) của nền tảng Web FairShare trong thời lượng 8 tuần, tích hợp trơn tru với Trello API, vận hành thuật toán tính điểm đóng góp ScoringEngine, bộ lọc che giấu danh tính AnonymityAggregator và module xuất báo cáo PDF chuẩn học thuật nộp Giảng viên.

### 6. Mục tiêu cụ thể đo lường theo chuẩn SMART (Project Objectives)
- **G1 (Tự động thu thập Trello):** Đồng bộ tự động chính xác $\ge 95\%$ trạng thái thẻ công việc (cards/tasks) từ bảng Trello dự án so với kiểm tra đối soát thủ công trên bộ dữ liệu mẫu.
- **G2 (Bảng đóng góp có truy vết):** 100% chỉ số điểm số đóng góp trên giao diện Dashboard có khả năng drill-down truy xuất tối thiểu 1 bằng chứng sự kiện gốc từ bảng `ActivityEvent`.
- **G3 (Chấm chéo ẩn danh bảo mật):** Thuật toán `AnonymityAggregator` chỉ mở hiển thị kết quả đánh giá đồng đẳng khi có tối thiểu $\ge 3$ lượt chấm hợp lệ; mã hóa một chiều ngăn chặn lộ danh tính người chấm.
- **G4 (Xuất báo cáo PDF):** Trích xuất báo cáo tổng kết quá trình làm việc, biểu đồ phân bổ đóng góp ra file PDF đạt chuẩn định dạng nộp Giảng viên trong thời gian $< 10$ giây với nhóm 6 người.
- **G5 (Nghiệm thu người dùng UAT):** Đạt $\ge 80\%$ tỷ lệ người dùng tham gia thử nghiệm (tối thiểu 10 sinh viên UEH) đánh giá báo cáo minh bạch, công bằng và dễ hiểu.
- **G6 (Tuân thủ quy chuẩn quản lý dự án):** Bàn giao 100% hồ sơ artefact quản lý dự án theo từng tuần (Charter, Stakeholder, Team Charter, WBS, Gantt, Risk Register, Mini-PM Reports).

### 7. Danh mục sản phẩm bàn giao chính (Major Deliverables)
1. **Gói tài liệu khởi động & nghiệp vụ (Tuần 1–2):** Project Charter v1.0, Sổ đăng ký Stakeholder, Team Charter, Báo cáo khảo sát thực tế 11 mẫu, Bảng đặc tả yêu cầu SRS (FR & NFR), Sơ đồ Use Case, BPMN, Sequence Diagram thiết kế bằng Enterprise Architect.
2. **Gói tài liệu cơ sở & kiến trúc kỹ thuật (Tuần 3):** Tiến độ Gantt cơ sở (Baseline Schedule), Ma trận RACI, Sổ theo dõi rủi ro (Risk Register), Kế hoạch truyền thông, Thiết kế CSDL MariaDB (ERD) và Hợp đồng API (API Contracts).
3. **Bản phát hành phần mềm Web MVP (Tuần 4–7):**
   - Backend: Dịch vụ RESTful API bằng Java 21 & Spring Boot 3.x, kiến trúc lát cắt dọc (`team`, `sprint`, `contribution`, `peerreview`).
   - Frontend: Ứng dụng web React 18, TypeScript, Vite, Tailwind CSS.
   - Core Engines: Module kết nối Trello Sync Worker, Engine tính điểm `ScoringEngine`, Bộ lọc ẩn danh `AnonymityAggregator`, Module kết xuất file PDF.
   - Deployment: Kịch bản `docker-compose.yml` khởi chạy trọn gói Backend + Frontend + MariaDB.
4. **Gói tài liệu nghiệm thu & đóng dự án (Tuần 8):** Báo cáo kết quả kiểm thử UAT, Defect Log, 6 bản báo cáo cá nhân Mini-PM Report (3–5 trang/thành viên), Báo cáo tổng kết đồ án (Word theo chuẩn UEH), Slide thuyết trình và Video demo.

### 8. Phạm vi dự án ban đầu (Initial Scope – In-Scope)
- Quản lý nhóm và vòng đời Sprint (chu kỳ 1 tuần: Planning, Active, Completed).
- Cơ chế thỏa thuận dữ liệu bắt buộc (Data Consent Policy Modal) trước khi kích hoạt theo dõi.
- Kết nối Trello API: Đọc bảng, danh sách, thẻ công việc, nhãn, người phụ trách và ngày hoàn thành.
- Dashboard trực quan: Biểu đồ tròn phân bổ đóng góp, biểu đồ cột so sánh thực tế vs dự kiến và bảng drill-down truy vết sự kiện gốc.
- Đánh giá đồng đẳng (Peer Review): Mở đợt chấm cuối Sprint, form chấm 3 tiêu chí (Chất lượng, Đúng hạn, Hợp tác), lưu trữ ẩn danh.
- Xuất báo cáo PDF tổng kết tiến độ học phần phục vụ chấm điểm.
- *(Tính năng có điều kiện):* Cảnh báo thành viên trễ hạn hoặc thử nghiệm đồng bộ Google Docs nếu còn buffer ở cuối Sprint 2.

### 9. Các nội dung chưa thực hiện (Out of Scope)
- Ứng dụng di động độc lập (Native Mobile App iOS / Android); chỉ tối ưu Web Responsive trên trình duyệt điện thoại.
- Chatbot AI hoặc các mô hình Machine Learning tự động phân tích hành vi, tự động xếp hạng hay phán xét điểm cá nhân (FairShare chỉ cung cấp số liệu tham khảo, tôn trọng quyền quyết định của con người).
- Tích hợp đa nền tảng phức tạp (GitHub commit, Jira, Slack, MS Teams, LMS).
- Hệ thống thanh toán trực tuyến, quản lý tài chính, thương mại hóa.
- Quản lý đa trường học, đa tổ chức quy mô lớn.

### 10. Các bên liên quan chính (Key Stakeholders)
| Bên liên quan | Vai trò trong dự án | Mối quan tâm chính | Chiến lược quản trị |
|---|---|---|---|
| **TS. Nguyễn Mạnh Tuấn** | Giảng viên hướng dẫn / Sponsor | Tính trung thực dữ liệu, chất lượng học thuật, đúng hạn | Báo cáo theo mốc, phê duyệt Change Request |
| **Nhóm kiểm soát chéo (PCG)** | Đơn vị giám sát độc lập | Độ lệch tiến độ (Plan vs Actual), minh chứng kiểm tra | Cung cấp báo cáo tuần, mở quyền truy cập Git/Drive |
| **Trưởng nhóm đồ án (Leader)** | Người dùng mục tiêu chính | Tiết kiệm thời gian tổng hợp, bằng chứng chia điểm | Phỏng vấn sâu, mời tham gia kiểm thử UAT |
| **Thành viên đồ án sinh viên** | Người dùng thụ hưởng | Bảo vệ quyền lợi, công bằng, bảo mật danh tính | Thiết kế Consent rõ ràng, ẩn danh chấm chéo |
| **Đội ngũ phát triển (Nhóm 07)** | Nhân sự thực hiện | Điểm học phần, phân công cân bằng, hoàn thành DoD | Họp Standup định kỳ, điều phối qua Task Board |
| **Nhà cung cấp Trello API** | Đối tác kỹ thuật bên ngoài | Tuân thủ hạn mức gọi API (Rate limit), bảo mật token | Xây dựng Exponential Backoff, mã hóa AES-256 |

### 11. Các ràng buộc dự án (Constraints)
- **Ràng buộc thời gian (Time):** Cố định trong 8 tuần học tập của học phần.
- **Ràng buộc chi phí (Cost):** Ngân sách bắt buộc 0 VNĐ (sử dụng gói miễn phí, hạ tầng máy tính cá nhân của sinh viên).
- **Ràng buộc nhân lực (People):** Nhóm 07 gồm đúng 6 sinh viên; mỗi thành viên dành khoảng 10–12 giờ/tuần cho dự án.
- **Ràng buộc công nghệ (Technology):** Tuân thủ nền tảng Java Spring Boot, React, MariaDB, Docker và GitHub.

### 12. Các giả định ban đầu (Assumptions)
- 100% thành viên trong nhóm đồ án sinh viên đều tự nguyện ký chấp thuận chính sách dữ liệu Consent Policy.
- Dịch vụ Trello REST API duy trì tính sẵn sàng cao và không thay đổi chính sách cấp phát miễn phí trong kỳ học.
- Năng lực của 6 thành viên đáp ứng tốt việc tự chủ một phân hệ lát cắt dọc từ CSDL đến giao diện.

### 13. Rủi ro cấp cao & Kế hoạch ứng phó (High-Level Risks)
| Mã | Rủi ro nhận diện | Khả năng | Tác động | Phương án ứng phó (Mitigation Strategy) |
|:---:|---|:---:|:---:|---|
| **R01** | Trello chạm trần giới hạn gọi API (HTTP 429) | Trung bình | Cao | Cài đặt thuật toán Exponential Backoff & Retry; lưu bộ nhớ đệm cache và giới hạn tần suất đồng bộ 30 phút/lần. |
| **R02** | Thành viên từ chối ký cam kết dữ liệu (Consent) | Thấp | Trung bình | Xây dựng chức năng khai báo đóng góp thủ công (Manual Activity) có Leader hoặc thành viên khác phê duyệt. |
| **R03** | Lộ danh tính trong quá trình chấm chéo đồng đẳng | Thấp | Rất cao | Cài đặt bộ lọc `AnonymityAggregator` chặn xem kết quả khi chưa đủ $\ge 3$ lượt; mã hóa ID người gửi. |
| **R04** | Chậm trễ ghép nối tích hợp giữa các module dọc | Trung bình | Cao | Thống nhất và đóng băng Hợp đồng API (API Contracts) ngay tại Tuần 3; dựng mock data kiểm thử độc lập. |
| **R05** | Bùng nổ phạm vi (Scope Creep) ngoài tầm kiểm soát | Cao | Cao | Thiết lập quy trình Kiểm soát thay đổi (Change Control Process); từ chối cam kết miệng ngoài phạm vi MVP. |

### 14. Tiêu chí đánh giá thành công (Success Criteria)
1. **Đúng hạn:** Hoàn thành toàn bộ sản phẩm cam kết trước tuần 8, nộp bài đúng hạn học phần.
2. **Kỹ thuật:** 100% mã nguồn được merge vào nhánh chính qua Pull Request có review; Unit test và Integration test pass trên pipeline CI; hệ thống chạy ổn định qua Docker Compose.
3. **Nghiệp vụ:** $\ge 80\%$ người dùng thử nghiệm UAT đánh giá hệ thống mang lại sự công bằng và giảm thiểu mâu thuẫn nhóm.
4. **Học thuật:** Báo cáo đạt chuẩn phong cách tự luận thuần Việt của UEH, tone màu chuẩn mực, minh chứng truy vết trung thực.

### 15. Người điều phối dự án (Project Manager)
- **Họ và tên:** **Nguyễn Văn Minh Triều**
- **Mã số sinh viên:** **31241027455**
- **Quyền hạn:** Đại diện nhóm làm việc với Giảng viên; phân bổ và điều phối công việc trên Task Board; chủ trì các buổi họp Scrum (Planning, Standup, Review, Retro); có quyền từ chối tiếp nhận các yêu cầu thay đổi chưa qua phân tích tác động.
- **Trách nhiệm:** Đảm bảo dự án hoàn thành đúng tiến độ, đạt chuẩn chất lượng và kiểm soát rủi ro.

### 16. Người bảo trợ & Cơ chế phê duyệt (Sponsor / Authorization)
- **Người bảo trợ chuyên môn (Sponsor):** **TS. Nguyễn Mạnh Tuấn** – Giảng viên học phần Quản lý dự án CNTT.
- **Cơ chế phê duyệt (Approval Mechanism):** 
  - Mọi điều chỉnh về mục tiêu, thời hạn hoặc tính năng mở rộng bắt buộc phải được lập thành văn bản Phiếu yêu cầu thay đổi (Change Request Form).
  - Yêu cầu thay đổi chỉ có hiệu lực thi hành sau khi có chữ ký phê duyệt chính thức từ Giảng viên hướng dẫn.

---

### BẢNG XÁC NHẬN PHÊ DUYỆT (SIGN-OFF)

| Vai trò xác nhận | Họ và tên | Chữ ký / Trạng thái | Ngày phê duyệt |
|---|---|:---:|:---:|
| **Trưởng dự án (Project Manager)** | Nguyễn Văn Minh Triều | *Đã xác nhận* | 15/10/2026 |
| **Đại diện Phân tích nghiệp vụ (BA / M2)** | Hà Ngọc Thiện | *Đã xác nhận* | 15/10/2026 |
| **Giảng viên hướng dẫn (Sponsor)** | TS. Nguyễn Mạnh Tuấn | *Chờ phê duyệt* | [ ] |
