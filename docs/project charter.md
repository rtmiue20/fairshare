# BỘ HỒ SƠ QUẢN LÝ DỰ ÁN – TUẦN 1
## PROJECT CHARTER (ĐIỀU LỆ DỰ ÁN)

**Học phần:** Quản lý dự án CNTT – Đại học Kinh tế TP.HCM (UEH)  
**Giảng viên hướng dẫn:** TS. Nguyễn Mạnh Tuấn  
**Đề tài:** FairShare – Nền tảng minh bạch hóa đóng góp trong dự án nhóm  
**Nhóm thực hiện:** Nhóm 7 (6 thành viên)  
**Phiên bản:** 0.1 – Bản khởi động tuần 1  

---

### 1. Thông tin chung (General Information)

| Thành phần | Nội dung |
|---|---|
| **Project Title** | FairShare – Nền tảng minh bạch hóa đóng góp trong dự án nhóm |
| **Project Sponsor / Authorization** | TS. Nguyễn Mạnh Tuấn (Giảng viên học phần / người phê duyệt đề tài; việc phê duyệt chính thức theo quy trình học phần) |
| **Project Manager / Coordinator** | Nguyễn Văn Minh Triều |
| **Business Need / Problem** | Thông tin giao việc, tiến độ và bằng chứng đóng góp có thể phân tán; việc tổng hợp và trao đổi về đóng góp có nguy cơ thiếu minh bạch. |
| **Target Users** | Sinh viên làm dự án nhóm; trưởng nhóm; giảng viên / người đánh giá. |
| **Project Duration** | Theo lịch học phần (mốc 8 tuần là giả định lập kế hoạch ban đầu, điều chỉnh theo lịch chính thức của giảng viên). |
| **Version** | 0.1 – Bản khởi động tuần 1; cập nhật sau khi xác minh người dùng và thống nhất phạm vi. |

---

### 2. Bối cảnh và Nhu cầu nghiệp vụ (Background & Business Need)

Các dự án nhóm tạo ra nhiều dấu vết công việc: nhiệm vụ được giao, trạng thái trên bảng công việc, thay đổi trong kho mã nguồn, tài liệu và phản hồi giữa các thành viên. Nếu dữ liệu này nằm rời rạc, việc tổng hợp đóng góp có thể tốn thời gian và dễ phát sinh bất đồng. FairShare hướng đến việc gom các thông tin được phép sử dụng vào một nơi, giúp người dùng xem được cơ sở của báo cáo thay vì chỉ nhìn một điểm số tổng hợp.

Nhu cầu kinh doanh / nghiệp vụ ở giai đoạn này là giả thuyết: sinh viên và người điều phối dự án có thể cần một cách thuận tiện để tổng hợp bằng chứng, trao đổi về đóng góp và tạo báo cáo nhất quán. Nhóm sẽ xác minh nhu cầu trước khi coi đây là yêu cầu đã được khách hàng xác nhận.

---

### 3. Mục tiêu tổng quát (Project Goal)

Xây dựng và trình diễn một MVP của FairShare giúp nhóm sinh viên tổng hợp thông tin đóng góp có bằng chứng, hỗ trợ đánh giá đồng đẳng và xuất báo cáo dễ xem, trên cơ sở có thông báo, đồng thuận và giới hạn sử dụng dữ liệu rõ ràng.

---

### 4. Mục tiêu cụ thể (Project Objectives)

| Mã | Mục tiêu có thể kiểm tra | Cách xác minh |
|:---:|---|---|
| **O1** | Hoàn thiện tài liệu yêu cầu và phạm vi MVP sau khi thực hiện ít nhất 3 cuộc phỏng vấn ngắn với sinh viên nếu nhóm tiếp cận được người dùng; nếu chưa thực hiện, ghi rõ kế hoạch và giả định. | Biên bản ghi chú phỏng vấn có ẩn danh; hoặc danh sách câu hỏi / kế hoạch và trạng thái chưa thực hiện. |
| **O2** | Xây dựng được các luồng MVP đã chốt: tạo nhóm/dự án, ghi nhận đồng thuận, xem dashboard bằng chứng, gửi đánh giá đồng đẳng và xuất báo cáo PDF. | Demo theo checklist nghiệm thu và ảnh chụp kết quả. |
| **O3** | Hoàn thành ít nhất 5 kịch bản kiểm thử đầu-cuối cho các luồng cốt lõi; các lỗi nghiêm trọng chặn luồng chính phải được xử lý hoặc ghi nhận rõ. | Test case, kết quả pass/fail và danh sách lỗi. |
| **O4** | Mọi chỉ số / báo cáo đóng góp hiển thị được nguồn dữ liệu hoặc giải thích cách tính; không trình bày chỉ số như kết luận tuyệt đối về nỗ lực cá nhân. | Kiểm tra dashboard và báo cáo PDF. |
| **O5** | Hoàn thiện tài liệu khởi động, README, Task Board và repository có đóng góp thực chất từ mỗi thành viên. | Đường dẫn truy cập, lịch sử commit và danh mục hồ sơ. |

---

### 5. Sản phẩm bàn giao chính (Major Deliverables)

- **Hồ sơ yêu cầu:** Problem Statement, danh sách yêu cầu chức năng / phi chức năng, giả định và câu hỏi cần xác minh.
- **MVP ứng dụng web FairShare:** Gồm xác thực / đăng nhập phù hợp phạm vi môn học và quản lý nhóm / dự án.
- **Cơ chế đồng thuận dữ liệu:** Thông báo và ghi nhận sự đồng thuận trước khi sử dụng dữ liệu tích hợp.
- **Tích hợp Trello:** Tích hợp trong phạm vi đã chốt để lấy thông tin công việc cần thiết (nếu tích hợp thật không khả thi, sử dụng dữ liệu mẫu được ghi nhãn rõ).
- **Dashboard đóng góp:** Tổng hợp thông tin đóng góp và liên kết tới bằng chứng có thể kiểm tra.
- **Biểu mẫu đánh giá đồng đẳng:** Biểu mẫu chấm chéo ẩn danh trong phạm vi nhóm dự án.
- **Báo cáo PDF:** Báo cáo tóm tắt dữ liệu, cách tính và giới hạn diễn giải.
- **Tài liệu bàn giao:** Tài liệu thiết kế, kiểm thử, hướng dẫn chạy ứng dụng và báo cáo tổng kết.

---

### 6. Phạm vi dự án (Project Scope)

| In Scope – Thuộc phạm vi MVP | Out of Scope – Chưa thực hiện trong MVP |
|---|---|
| Tạo nhóm / dự án và quản lý thành viên cơ bản. | Ứng dụng iOS / Android riêng; chỉ ưu tiên ứng dụng web. |
| Màn hình thông báo / đồng thuận và mô tả dữ liệu được thu thập. | Theo dõi bí mật hoặc thu thập dữ liệu ngoài sự đồng thuận. |
| Đồng bộ dữ liệu công việc cần thiết từ Trello trong phạm vi API khả thi. | Tích hợp đồng thời nhiều nền tảng phức tạp như mọi công cụ quản lý công việc, email và hệ thống LMS. |
| Dashboard thể hiện dữ liệu / bằng chứng và quy tắc tổng hợp. | AI tự động kết luận mức độ chăm chỉ, gian lận hoặc xếp hạng tuyệt đối thành viên. |
| Đánh giá đồng đẳng ẩn danh trong nhóm; giải thích rõ tính ẩn danh có giới hạn. | Cơ chế xử lý khiếu nại phức tạp hoặc đánh giá chính thức thay giảng viên. |
| Xuất báo cáo PDF với dữ liệu và giới hạn diễn giải. | Phân tích dự đoán nâng cao, gamification, bảng xếp hạng công khai. |
| Kiểm thử các luồng cốt lõi và tài liệu hướng dẫn. | Triển khai thương mại quy mô lớn, cam kết SLA hoặc hỗ trợ vận hành dài hạn. |

---

### 7. Yêu cầu sơ bộ (Initial Requirements)

#### 7.1. Yêu cầu chức năng (FR)
- **FR-01:** Người dùng có thể tạo hoặc tham gia một nhóm / dự án theo quyền được cấp.
- **FR-02:** Hệ thống hiển thị thông tin rõ ràng về dữ liệu được lấy, mục đích sử dụng và yêu cầu đồng thuận trước khi đồng bộ.
- **FR-03:** Hệ thống kết nối Trello trong phạm vi cho phép và nhập các thông tin công việc đã thống nhất.
- **FR-04:** Người dùng có thể xem dashboard đóng góp theo dữ liệu đã ghi nhận, kèm bằng chứng hoặc nguồn tham chiếu.
- **FR-05:** Thành viên có thể gửi đánh giá đồng đẳng theo biểu mẫu đã thống nhất; giao diện không hiển thị danh tính người đánh giá cho người nhận trong luồng ẩn danh.
- **FR-06:** Người có quyền có thể xuất báo cáo PDF thể hiện dữ liệu, thời gian, quy tắc tổng hợp và giới hạn diễn giải.
- **FR-07:** Người dùng có thể xem trạng thái đồng bộ và thông báo lỗi cơ bản.

#### 7.2. Yêu cầu phi chức năng (NFR)
- **NFR-01 – Quyền riêng tư:** Chỉ thu thập dữ liệu cần thiết, có thông báo / đồng thuận và cơ chế giới hạn quyền truy cập.
- **NFR-02 – Bảo mật:** Không đưa khóa API / token vào mã nguồn công khai; thông tin bí mật phải được cấu hình qua biến môi trường.
- **NFR-03 – Tính dễ sử dụng:** Các luồng chính có nhãn và hướng dẫn dễ hiểu; người dùng thử có thể hoàn thành tác vụ theo kịch bản.
- **NFR-04 – Tính giải thích:** Số liệu hiển thị phải có nguồn hoặc mô tả cách tính; tránh tạo cảm giác chính xác giả.
- **NFR-05 – Khả năng bảo trì:** Mã nguồn được tổ chức theo module, có README và hướng dẫn cấu hình / chạy.
- **NFR-06 – Kiểm thử:** Các chức năng trọng yếu có kiểm thử phù hợp với thời gian và quy mô đồ án.

---

### 8. Ràng buộc, Giả định và Rủi ro chính (Constraints, Assumptions & Risks)

| Loại | Nội dung | Cách quản lý |
|---|---|---|
| **Constraint** | Thời gian và nguồn lực sinh viên giới hạn; phải ưu tiên MVP. | Chốt phạm vi, chia nhỏ task, rà soát hàng tuần. |
| **Constraint** | Khả năng truy cập API Trello và quyền dữ liệu phụ thuộc cấu hình / tài khoản. | Kiểm tra sớm; chuẩn bị dữ liệu mẫu nếu không tích hợp được. |
| **Constraint** | Nhóm chưa có thông tin ngân sách tiền mặt chính thức. | Xem chi phí dịch vụ trả phí là không được phê duyệt cho đến khi xác nhận. |
| **Assumption** | Sinh viên có nhu cầu xem bằng chứng đóng góp thay vì chỉ dựa vào tự báo cáo. | Phỏng vấn 3–5 người và ghi lại kết quả trung thực. |
| **Assumption** | Trello cung cấp đủ dữ liệu cần thiết cho bản demo. | Thử API sớm và xác định rõ dữ liệu nào có thể lấy. |
| **Assumption** | Nhóm có thể phân công các module frontend, backend, database, QA. | Xác nhận năng lực và thời gian của từng thành viên. |
| **Risk** | Phạm vi mở rộng vượt thời gian. | Đóng băng MVP; yêu cầu mới đi qua đánh giá tác động. |
| **Risk** | Người dùng không đồng thuận chia sẻ dữ liệu. | Thiết kế opt-in, minh bạch mục đích; không ép buộc tham gia. |
| **Risk** | Dữ liệu thiếu hoặc không phản ánh đầy đủ đóng góp thực tế. | Hiển thị nguồn và giới hạn; không dùng dữ liệu đơn lẻ để kết luận. |
| **Risk** | Tích hợp API, token hoặc quyền truy cập gặp lỗi. | Tạo prototype tích hợp sớm; dùng dữ liệu mẫu được gắn nhãn. |
| **Risk** | Đánh giá đồng đẳng bị thiên lệch hoặc lạm dụng. | Dùng tiêu chí rõ ràng, giới hạn quyền xem và nêu rõ vai trò tham khảo. |
| **Risk** | Thành viên chậm tiến độ hoặc tài liệu không đồng nhất. | Task Board, người chịu trách nhiệm chính, rà soát và tích hợp định kỳ. |

---

### 9. Tiêu chí đánh giá thành công (Success Criteria)

- Các luồng MVP đã thống nhất có thể trình diễn từ đầu đến cuối trên môi trường chạy được.
- Tối thiểu 5 kịch bản kiểm thử cốt lõi được thực hiện và có kết quả ghi nhận.
- Dashboard và PDF chỉ rõ nguồn dữ liệu / cách tổng hợp; không đưa ra kết luận tự động tuyệt đối về cá nhân.
- Luồng đồng thuận và quyền truy cập được kiểm tra; không có token / khóa API bị commit vào repository.
- Tài liệu Project Charter, Stakeholder Register, Team Charter, Task Board, README và Week 1 Summary nhất quán.
- Các thành viên có đóng góp thực chất được thể hiện qua lịch sử chỉnh sửa / commit hoặc sản phẩm được giao.
- Nhóm thu thập và ghi lại phản hồi người dùng nếu thực hiện thử nghiệm; nếu chưa có, ghi rõ kế hoạch tiếp theo thay vì tự nhận đã xác minh.

---

### 10. Kế hoạch các mốc tiến độ (Milestones)

| Mốc | Kết quả dự kiến | Thời điểm |
|:---:|---|:---:|
| **M1 – Khởi động** | Chốt đề tài, Problem Statement, Charter, Stakeholders, Team Charter, Task Board và repository. | Tuần 1 |
| **M2 – Xác minh yêu cầu** | Phỏng vấn / kiểm chứng giả định; hoàn thiện yêu cầu và phạm vi MVP. | Tuần 2 |
| **M3 – Thiết kế** | Luồng người dùng, wireframe, kiến trúc hệ thống và mô hình dữ liệu. | Tuần 3 |
| **M4 – Bản tích hợp đầu tiên** | Luồng nhóm / dự án và dữ liệu công việc mẫu hoặc tích hợp Trello cơ bản. | Tuần 4–5 |
| **M5 – Hoàn thiện MVP** | Dashboard, đánh giá đồng đẳng, xuất PDF và xử lý lỗi chính. | Tuần 6–7 |
| **M6 – Kiểm thử / Nghiệm thu** | Kiểm thử hệ thống, sửa lỗi, hoàn thiện tài liệu và demo cuối kỳ. | Tuần 8 |

---

### 11. Nguồn lực, Phương pháp và Phê duyệt

- **Nguồn lực dự kiến:** Thời gian làm việc của các thành viên; máy tính cá nhân; GitHub; công cụ quản lý công việc (Trello); môi trường phát triển và kiểm thử. Không có ngân sách trả phí.
- **Công nghệ dự kiến:** Java 21 và Spring Boot 3.x cho backend; React, TypeScript và Vite cho frontend; MariaDB 11.x và Flyway cho cơ sở dữ liệu; OpenPDF cho báo cáo PDF; JUnit/Mockito/Testcontainers và Vitest/React Testing Library cho kiểm thử; Docker/Compose và GitHub Actions nếu phù hợp thời gian. Tích hợp Trello là ưu tiên; Google Docs API và cảnh báo không hoạt động chỉ xem xét nếu còn nguồn lực sau MVP.
- **Phương pháp triển khai:** Chia công việc theo module (lát cắt dọc), quản lý bằng Task Board, cập nhật repository thường xuyên, kiểm thử liên tục và rà soát phạm vi mỗi tuần. Mỗi thay đổi có ảnh hưởng đáng kể phải được mô tả, đánh giá tác động và được người có thẩm quyền chấp thuận trước khi nhóm cam kết.

#### Bảng phê duyệt
| Vai trò phê duyệt | Người xác nhận |
|---|---|
| Đại diện nhóm / Project Coordinator | Nguyễn Văn Minh Triều |
| Đại diện nhóm phát triển | Nguyễn Văn Minh Triều |
| Giảng viên / Người phê duyệt đề tài | TS. Nguyễn Mạnh Tuấn |
