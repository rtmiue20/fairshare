# PROJECT CHARTER (HIẾN CHƯƠNG DỰ ÁN)

**Dự án:** FairShare – Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm  
**Môn học:** Quản lý dự án Công nghệ Thông tin (IT Project Management)  
**Đơn vị đào tạo:** Đại học Kinh tế TP. Hồ Chí Minh (UEH)  
**Giảng viên hướng dẫn:** TS. Nguyễn Mạnh Tuấn (tuannm@ueh.edu.vn)  
**Phiên bản:** Version 0.1 (Bản khởi động Tuần 1)  
**Người phụ trách biên soạn:** Hà Ngọc Thiện (Phân hệ M2 - Quản lý Nhóm & Thỏa thuận Dữ liệu)  

---

## 1. THÔNG TIN CHUNG DỰ ÁN (PROJECT INFORMATION)

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Project Title (Tên dự án)** | **FairShare** – Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm |
| **Project Sponsor / Authorization** | TS. Nguyễn Mạnh Tuấn (Giảng viên phụ trách môn học) & Đại diện Nhóm Kiểm soát Dự án (PCG) |
| **Project Manager (Trưởng dự án)** | Nguyễn Văn Minh Triều (Leader Nhóm 7) |
| **Core Team (Đội ngũ nòng cốt)** | Nhóm 7 (6 thành viên): Nguyễn Văn Minh Triều, Hà Ngọc Thiện, Trọng Phúc, Khang, Nam Anh, Phúc Vương |
| **Target Users (Người dùng mục tiêu)** | Sinh viên làm đồ án nhóm (Thành viên & Trưởng nhóm), Giảng viên/Người chấm điểm đồ án |
| **Project Duration (Thời gian thực hiện)** | 8 tuần (Theo mô hình Agile/Scrum rút gọn điều chỉnh theo lịch học phần) |
| **Budget (Ngân sách)** | 0 VNĐ (Tận dụng gói miễn phí, máy tính cá nhân và hạ tầng sinh viên) |

---

## 2. BỐI CẢNH VÀ XÁC ĐỊNH VẤN ĐỀ (BACKGROUND & PROBLEM STATEMENT)

### 2.1. Bối cảnh (Background)
Trong các học phần đại học, sinh viên thường xuyên phải làm việc nhóm thông qua nhiều kênh giao tiếp phân tán: ứng dụng nhắn tin (Zalo, Messenger, Discord), bảng quản lý công việc (Trello, Jira), kho lưu trữ mã nguồn (GitHub, GitLab) và tài liệu trực tuyến (Google Docs). Việc dữ liệu nằm rời rạc khiến quá trình tổng hợp tiến độ tốn nhiều thời gian và dễ phát sinh bất đồng khi kết thúc môn học.

### 2.2. Vấn đề thực tế (Problem Statement)
- **Tình trạng ỷ lại (Free-rider):** Trong các đồ án nhóm, tình trạng sinh viên làm việc đối phó, đùn đẩy hoặc ỷ lại diễn ra phổ biến.
- **Thiếu minh chứng khách quan:** Trưởng nhóm thường không có công cụ và số liệu cụ thể để chứng minh khối lượng công việc thực tế của từng thành viên, dẫn đến tâm lý nể nang, ngại va chạm hoặc chia đều điểm số gây thiệt thòi cho những bạn đóng góp nhiều.
- **Giảng viên thiếu cơ sở đánh giá cá nhân:** Giảng viên chỉ nhận được sản phẩm cuối kỳ và bảng điểm tự đánh giá nội bộ mang tính chủ quan, thiếu dữ liệu tham chiếu quá trình (process metrics) để cho điểm công bằng.

### 2.3. Giải pháp đề xuất (Proposed Solution)
Xây dựng nền tảng web **FairShare (MVP)** với các tính năng cốt lõi:
1. Tạo nhóm/dự án và thiết lập thỏa thuận sử dụng dữ liệu rõ ràng (Consent Policy).
2. Tự động đồng bộ và chuẩn hóa dữ liệu công việc từ Trello.
3. Dashboard hiển thị tỷ lệ đóng góp trực quan, cho phép truy vết trực tiếp về bằng chứng sự kiện gốc (task, checklist, activity log).
4. Cơ chế đánh giá đồng đẳng ẩn danh (Anonymous Peer Assessment) theo sprint.
5. Xuất báo cáo tổng kết dạng PDF có cấu trúc, đóng vai trò công cụ hỗ trợ ra quyết định (Decision Support Tool) cho sinh viên và giảng viên.

---

## 3. MỤC TIÊU DỰ ÁN (PROJECT GOALS & OBJECTIVES)

### 3.1. Mục tiêu tổng quát (Project Goal)
Xây dựng và chuyển giao thành công phiên bản MVP của nền tảng FairShare trong vòng 8 tuần, giúp các nhóm sinh viên tự động thu thập thông tin công việc có minh chứng, đo lường tỷ lệ đóng góp minh bạch, hỗ trợ chấm chéo ẩn danh và xuất báo cáo phục vụ đánh giá công bằng, tuân thủ nghiêm ngặt quyền riêng tư và đồng thuận dữ liệu.

### 3.2. Mục tiêu cụ thể SMART (Project Objectives)

| Mã | Mục tiêu cụ thể | Chỉ số đo lường (KPI / Metrics) | Phương pháp kiểm tra |
| :--- | :--- | :--- | :--- |
| **O1** | Khảo sát & Xác minh yêu cầu | Tiếp cận phỏng vấn/khảo sát ít nhất 5 sinh viên/trưởng nhóm đồ án về Pain Points. | Biên bản ghi chú phỏng vấn ẩn danh và tổng hợp khảo sát. |
| **O2** | Đồng bộ dữ liệu Trello | Tỷ lệ đồng bộ chính xác đạt **≥ 95%** task và trạng thái từ Trello API. | Kiểm thử tích hợp tự động (Integration Test) so sánh dữ liệu gốc. |
| **O3** | Minh bạch hóa Dashboard & Bằng chứng | 100% chỉ số đóng góp trên Dashboard có khả năng drill-down truy vết về sự kiện gốc. | Demo kịch bản kiểm tra liên kết minh chứng trên UI. |
| **O4** | Đánh giá đồng đẳng ẩn danh | Luồng chấm chéo hoạt động ổn định khi có **≥ 3 lượt đánh giá**, ẩn danh tuyệt đối người đánh giá. | Kiểm tra luồng dữ liệu (Data Flow) và kiểm thử bảo mật. |
| **O5** | Hiệu năng xuất báo cáo | Xuất báo cáo PDF hoàn chỉnh trong thời gian **< 10 giây**. | Đo lường thời gian phản hồi (Response Time) trên hệ thống. |
| **O6** | Chất lượng kiểm thử & UAT | Đạt **≥ 90%** test case pass, không còn lỗi Critical; tỷ lệ hài lòng người dùng thử nghiệm đạt **≥ 80%**. | Báo cáo kiểm thử tự động và biên bản nghiệm thu UAT. |

---

## 4. SẢN PHẨM BÀN GIAO CHÍNH (MAJOR DELIVERABLES)

1. **Bộ hồ sơ Quản lý dự án (Project Management Assets):**
   - Project Charter, Stakeholder Register, Team Charter.
   - Bảng phân rã công việc (WBS), Sơ đồ tiến độ (Gantt Chart).
   - Task Board trên Trello cập nhật tiến độ liên tục.
   - Báo cáo tổng kết tuần (Weekly Summary Reports) và Báo cáo cuối kỳ.
2. **Hệ thống phần mềm FairShare (MVP Software):**
   - **Frontend:** Ứng dụng web xây dựng bằng React 18, TypeScript, Vite.
   - **Backend:** Hệ thống RESTful API xây dựng bằng Java 21, Spring Boot 3.x.
   - **Database:** Cơ sở dữ liệu quan hệ MariaDB 11.x, quản lý migration qua Flyway.
3. **Các phân hệ chức năng cốt lõi bàn giao:**
   - Phân hệ M1: Xác thực & Phân quyền người dùng (Authentication & Authorization).
   - Phân hệ M2: Quản lý nhóm & Thiết lập chính sách đồng thuận dữ liệu (Group Management & Consent Policy).
   - Phân hệ M3: Bộ kết nối tích hợp Trello API (Trello Integration Adapter).
   - Phân hệ M4: Bảng điều khiển tỷ lệ đóng góp & Truy vết minh chứng (Contribution Dashboard & Evidence Tracker).
   - Phân hệ M5: Đánh giá đồng đẳng ẩn danh theo vòng sprint (Peer Assessment Module).
   - Phân hệ M6: Công cụ tạo và kết xuất báo cáo PDF (OpenPDF Reporting Engine).
4. **Tài liệu Kỹ thuật & Bàn giao:**
   - Tài liệu đặc tả yêu cầu (SRS) và Thiết kế kiến trúc (Architecture & DB Schema).
   - Kịch bản kiểm thử (Test Cases), Báo cáo kiểm thử (Test Report).
   - Hướng dẫn cài đặt và sử dụng (User Manual & Deployment Guide).

---

## 5. PHẠM VI DỰ ÁN (PROJECT SCOPE)

### 5.1. Thuộc phạm vi (In-Scope - MVP)
- Đăng ký, đăng nhập và quản lý hồ sơ sinh viên cơ bản.
- Tạo nhóm đồ án, mời thành viên và phân quyền (Leader / Member).
- Màn hình thông báo chính sách bảo mật và ghi nhận sự đồng thuận (Consent) của 100% thành viên trước khi đồng bộ dữ liệu.
- Kết nối Trello qua API Token cá nhân/OAuth để lấy thông tin: Card, List, Checklist, Member, Activity History.
- Tính toán và trực quan hóa tỷ lệ đóng góp qua biểu đồ, liên kết trực tiếp đến bằng chứng cụ thể.
- Biểu mẫu chấm chéo thành viên nội bộ nhóm với tiêu chí rõ ràng, giấu danh tính người cho điểm.
- Kết xuất báo cáo đóng góp định dạng PDF tóm tắt quá trình làm việc.
- Kiểm thử luồng nghiệp vụ chính và tài liệu hướng dẫn vận hành.

### 5.2. Ngoài phạm vi (Out-of-Scope - Không làm trong MVP)
- Không phát triển ứng dụng di động Native (iOS/Android); chỉ tập trung vào Responsive Web App.
- Không thu thập dữ liệu bí mật hoặc theo dõi người dùng khi chưa có sự đồng thuận.
- Không tích hợp đồng thời đa nền tảng phức tạp (GitHub, GitLab, Jira, Google Docs, Slack, LMS Canvas/Blackboard).
- **Tuyệt đối không dùng AI/Machine Learning để tự động chấm điểm, phán xét thái độ hay xếp hạng tuyệt đối sinh viên.**
- Không xây dựng hệ thống giải quyết khiếu nại thay quyền quyết định của giảng viên (FairShare chỉ đóng vai trò tham chiếu).
- Không phát triển các tính năng phân tích dự đoán nâng cao, Gamification hay bảng xếp hạng công khai giữa các nhóm.
- Không triển khai thương mại hóa diện rộng hay cam kết thỏa thuận mức dịch vụ (SLA) doanh nghiệp.

---

## 6. YÊU CẦU HỆ THỐNG SƠ BỘ (INITIAL REQUIREMENTS)

### 6.1. Yêu cầu chức năng (Functional Requirements - FR)
- **FR-01:** Người dùng có thể khởi tạo hoặc tham gia nhóm đồ án thông qua liên kết lời mời hoặc mã nhóm.
- **FR-02:** Hệ thống hiển thị minh bạch mục đích thu thập dữ liệu và bắt buộc người dùng xác nhận đồng thuận trước khi tích hợp.
- **FR-03:** Hệ thống kết nối an toàn với Trello API để đồng bộ dữ liệu công việc (Card, Checklist, Member).
- **FR-04:** Dashboard hiển thị trực quan tỷ lệ hoàn thành công việc của từng cá nhân kèm bằng chứng đối soát.
- **FR-05:** Thành viên gửi đánh giá đồng đẳng ẩn danh cuối sprint; không hiển thị danh tính người chấm cho người được chấm.
- **FR-06:** Trưởng nhóm và giảng viên có quyền kết xuất báo cáo tổng hợp PDF kèm giải thích công thức tính.
- **FR-07:** Hệ thống ghi nhận trạng thái đồng bộ và gửi thông báo lỗi khi API bị gián đoạn.

### 6.2. Yêu cầu phi chức năng (Non-Functional Requirements - NFR)
- **NFR-01 (Privacy - Quyền riêng tư):** Chỉ thu thập các trường thông tin cần thiết phục vụ đồ án; người dùng có quyền rút lại quyền đồng thuận.
- **NFR-02 (Security - Bảo mật):** Tuyệt đối không hardcode API Key / Token vào mã nguồn; bảo mật token thông qua biến môi trường (.env) và mã hóa cơ sở dữ liệu.
- **NFR-03 (Usability - Khả năng sử dụng):** Giao diện thân thiện, nhãn điều hướng rõ ràng, sinh viên có thể hoàn thành các tác vụ cơ bản mà không cần đào tạo phức tạp.
- **NFR-04 (Explainability - Tính giải thích):** Mọi biểu đồ và con số thống kê phải giải thích rõ công thức và nguồn dữ liệu tham chiếu, tránh tạo kết luận thiên lệch.
- **NFR-05 (Maintainability - Khả năng bảo trì):** Kiến trúc phân lớp rõ ràng (Controller - Service - Repository), tuân thủ Clean Code, có tài liệu API Swagger/OpenAPI.
- **NFR-06 (Reliability - Độ tin cậy):** Tỷ lệ xử lý thành công yêu cầu đạt ≥ 99% trong điều kiện tải bình thường của đồ án sinh viên.

---

## 7. CÁC BÊN LIÊN QUAN CHÍNH (KEY STAKEHOLDERS)

| Bên liên quan | Vai trò trong dự án | Mức độ Quan tâm | Mức độ Ảnh hưởng | Chiến lược quản lý & Kỳ vọng |
| :--- | :--- | :---: | :---: | :--- |
| **TS. Nguyễn Mạnh Tuấn** | Giảng viên hướng dẫn / Project Sponsor | **Cao** | **Cao** | Báo cáo tiến độ hàng tuần; kiểm tra tính minh bạch và cơ sở lý luận của công thức đánh giá. |
| **Nhóm Kiểm soát (PCG)** | Đơn vị giám sát chéo môn học | **Cao** | **Cao** | Cung cấp tài liệu, đường dẫn Task Board và Repo minh bạch; tuân thủ đúng các mốc bàn giao. |
| **Nhóm 7 (Dev Team)** | Đội ngũ phân tích, phát triển, kiểm thử | **Cao** | **Cao** | Phân công module rõ ràng; họp daily/weekly; đảm bảo tiến độ và chất lượng mã nguồn. |
| **Trưởng nhóm đồ án (Leader)** | Người dùng chính (Primary User) | **Cao** | **Trung bình** | Cần công cụ quản lý nhẹ nhàng, giảm tải tổng hợp thủ công, có số liệu khách quan hỗ trợ chia điểm. |
| **Thành viên sinh viên** | Người dùng thụ hưởng trực tiếp | **Cao** | **Trung bình** | Bảo vệ quyền lợi đóng góp, yêu cầu bảo mật thông tin cá nhân và quy trình đánh giá công bằng. |
| **Trello Platform** | Nhà cung cấp dịch vụ bên thứ ba | **Thấp** | **Trung bình** | Tuân thủ giới hạn Rate Limit và điều khoản bảo mật API của Atlassian Trello. |

---

## 8. RÀNG BUỘC, GIẢ ĐỊNH VÀ QUẢN LÝ RỦI RO (CONSTRAINTS, ASSUMPTIONS & RISKS)

### 8.1. Ràng buộc (Constraints)
- **Thời gian:** 8 tuần phát triển theo lịch trình môn học; không có thời gian dự phòng kéo dài.
- **Nhân lực:** 6 thành viên làm việc part-time, phân bổ thời gian giữa nhiều môn học song song.
- **Chi phí:** Ngân sách 0 VNĐ, bắt buộc sử dụng Free Tier của GitHub, Railway/Render, Supabase/Aiven hoặc hạ tầng Localhost.
- **Công nghệ:** Backend Java 21 / Spring Boot 3.x, Frontend React 18, Database MariaDB 11.x.

### 8.2. Giả định ban đầu (Assumptions)
- Sinh viên có thói quen hoặc đồng ý dùng Trello để quản lý bài tập nhóm môn học.
- Trello REST API duy trì tính ổn định, cung cấp đủ dữ liệu về Card, Checklist và Activity Log.
- Các thành viên trong nhóm thực hiện cam kết trung thực, tuân thủ quy tắc Team Charter đã ký kết.

### 8.3. Ma trận Quản lý Rủi ro (Risk Management Matrix)

| Mã | Rủi ro nhận diện | Khả năng | Tác động | Kế hoạch giảm thiểu & Ứng phó |
| :--- | :--- | :---: | :---: | :--- |
| **RSK-01** | **Bùng nổ phạm vi (Scope Creep):** Phát sinh quá nhiều yêu cầu ngoài dự kiến làm trễ hạn bàn giao. | Cao | Cao | Đóng băng phạm vi (Scope Freeze) ngay sau Tuần 2. Mọi thay đổi mới phải qua quy trình đánh giá tác động. |
| **RSK-02** | **Lỗi giới hạn Trello API (Rate Limit):** Đồng bộ dữ liệu thất bại hoặc bị chặn tạm thời. | Trung bình | Cao | Thiết kế cơ chế Caching, tối ưu số lượng gọi API và chuẩn bị sẵn Mock Data gắn nhãn rõ ràng để demo. |
| **RSK-03** | **Rủi ro vi phạm quyền riêng tư:** Sinh viên lo ngại bị giám sát hoặc lộ dữ liệu bài tập cá nhân. | Trung bình | Cao | Xây dựng màn hình Opt-in Consent bắt buộc; chỉ đọc dữ liệu trên Board đồ án được chỉ định, tuyệt đối không truy cập Board riêng tư. |
| **RSK-04** | **Đánh giá đồng đẳng mang tính cảm tính:** Chấm điểm dựa trên cảm xúc cá nhân hoặc bè phái. | Cao | Trung bình | Đặt tiêu chí chấm điểm định lượng chi tiết; giấu danh tính người chấm và công bố rõ điểm chỉ mang tính tham khảo. |
| **RSK-05** | **Thành viên chậm tiến độ nội bộ:** Thành viên bận việc đột xuất làm tắc nghẽn luồng tích hợp. | Trung bình | Cao | Theo dõi qua Task Board (Trello); phân rã module độc lập (loose coupling); họp rà soát tiến độ 2 lần/tuần. |

---

## 9. TIÊU CHÍ ĐÁNH GIÁ THÀNH CÔNG (SUCCESS CRITERIA)

Dự án được đánh giá là thành công khi thỏa mãn toàn bộ các điều kiện sau tại thời điểm nghiệm thu:
1. **Hoàn thành các mốc chức năng:** Trình diễn thành công luồng nghiệp vụ hoàn chỉnh từ Tạo nhóm ➔ Consent ➔ Đồng bộ Trello ➔ Dashboard ➔ Peer Review ➔ Xuất PDF.
2. **Chất lượng kỹ thuật:** Mã nguồn sạch, không chứa token/credentials trong git; tối thiểu 5 kịch bản kiểm thử cốt lõi (Integration/E2E) passed; không còn lỗi mức Critical.
3. **Tính giải thích & Trung thực:** Dashboard và Báo cáo PDF minh bạch nguồn số liệu, không đưa ra phán quyết tự động tuyệt đối; có ghi chú rõ ràng về giới hạn của thuật toán.
4. **Sự hài lòng của người dùng:** Khảo sát UAT đạt **≥ 80%** người dùng thử đánh giá hệ thống hữu ích và công bằng trong phân chia đóng góp.
5. **Hồ sơ học thuật:** Nộp đầy đủ bộ hồ sơ QLDA theo chuẩn quy định của UEH đúng hạn, đầy đủ chữ ký và cam kết đóng góp thực chất của 6 thành viên.

---

## 10. CÁC MỐC TIẾN ĐỘ CHÍNH (PROJECT MILESTONES)

```text
Tuần 1 ───────> Tuần 2 ───────> Tuần 3 ───────> Tuần 4-5 ──────> Tuần 6-7 ──────> Tuần 8
[Khởi động]   [Xác minh]     [Thiết kế]     [Tích hợp Trello]  [Hoàn thiện MVP]   [UAT & Nghiệm thu]
```

| Mốc tiến độ | Tên mốc | Kết quả bàn giao dự kiến (Deliverables) | Thời điểm |
| :---: | :--- | :--- | :---: |
| **M1** | **Khởi động dự án** | Chốt đề tài, Problem Statement, Project Charter, Stakeholder Register, Team Charter, Trello Board, Repository GitHub. | **Tuần 1** |
| **M2** | **Xác minh yêu cầu** | Khảo sát Pain Points sinh viên; hoàn thiện đặc tả Use Case, BPMN và Scope MVP. | **Tuần 2** |
| **M3** | **Thiết kế hệ thống** | Thiết kế Wireframe UI, Kiến trúc hệ thống, Database Schema (ERD), API Specification. | **Tuần 3** |
| **M4** | **Bản tích hợp đầu tiên** | Hoàn thành luồng xác thực, phân hệ M2 (Group & Consent) và kết nối Trello API cơ bản. | **Tuần 4–5** |
| **M5** | **Hoàn thiện MVP** | Hoàn thiện Dashboard đóng góp, Đánh giá đồng đẳng ẩn danh và Xuất báo cáo PDF. | **Tuần 6–7** |
| **M6** | **Kiểm thử & Bàn giao** | Kiểm thử hệ thống, nghiệm thu UAT, hoàn thiện tài liệu hướng dẫn và báo cáo cuối kỳ. | **Tuần 8** |

---

## 11. PHÊ DUYỆT VÀ KÝ KẾT (APPROVAL & COMMITMENT)

Hiến chương dự án này có hiệu lực kể từ ngày được ký kết, đóng vai trò thỏa thuận chính thức về định hướng, phạm vi và mục tiêu triển khai dự án FairShare.

| Đại diện Giảng viên / Sponsor | Đại diện Quản lý dự án (Project Manager) | Phụ trách Phân hệ M2 (Module Lead) |
| :---: | :---: | :---: |
| *(Đã phê duyệt theo học phần)* | *(Đã ký)* | *(Đã ký)* |
| **TS. Nguyễn Mạnh Tuấn** | **Nguyễn Văn Minh Triều** | **Hà Ngọc Thiện** |
