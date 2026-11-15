# KỊCH BẢN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG (UAT SPECIFICATION & FEEDBACK PLAN)
**Dự án:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp trong đồ án nhóm  
**Môn học:** Quản lý dự án Công nghệ Thông tin – UEH (GVHD: TS. Nguyễn Mạnh Tuấn)  
**Phân hệ phụ trách:** WP2 – Quản lý Nhóm, Chu kỳ Sprint & Cam kết Dữ liệu (Consent)  
**Người lập (PM Phân tích nghiệp vụ - BA):** Hà Ngọc Thiện (MSSV: 31241021658)  
**Đồng thẩm định:** Nguyễn Văn Minh Triều (PM hệ thống - M0), Khiếu Hoàng Nam Anh (PM QA - M5)  
**Phiên bản:** 2.0 (Cập nhật chính thức cho Sprint 5 theo CR-02 Task Board nội bộ và CR-03 Mô hình đóng góp 4 tầng)  
**Ngày ban hành:** 11/11/2026 | **Thời điểm áp dụng:** Sprint 5 (Chuẩn bị UAT) $\rightarrow$ Sprint 6 (Tổ chức UAT diện rộng)

---

## 1. MỤC TIÊU & PHẠM VI TÀI LIỆU

### 1.1. Mục tiêu
1. **Chuẩn hóa kịch bản kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT):** Thiết lập bộ kịch bản kiểm thử dựa trên hành vi thực tế của người dùng cuối (Sinh viên làm việc nhóm, Trưởng nhóm đồ án và Giảng viên hướng dẫn môn học).
2. **Bao phủ luồng nghiệp vụ cốt lõi sau thay đổi kiến trúc (CR-02 & CR-03):** Đảm bảo kiểm thử toàn diện luồng sử dụng Task Board nội bộ thay thế Trello (tạo bảng $\rightarrow$ tạo thẻ $\rightarrow$ kéo thả di chuyển cột $\rightarrow$ tự động sinh `ActivityEvent` $\rightarrow$ `ScoringEngine` tính điểm đa chiều 4 tầng $\rightarrow$ hiển thị Dashboard và bảng bằng chứng truy vết).
3. **Kiểm tra cơ chế bảo mật và ẩn danh (Anonymity Guard):** Xác minh đợt chấm chéo đồng đẳng chỉ công bố kết quả khi đạt ngưỡng $\ge 3$ lượt đánh giá, bảo vệ danh tính tuyệt đối theo tiêu chuẩn đạo đức nghiên cứu UEH.
4. **Chuẩn bị nhân sự và công cụ đánh giá UAT:** Thiết lập danh sách $\ge 10$ người tham gia thử nghiệm độc lập và bộ công cụ đo lường mức độ hài lòng theo chuẩn quốc tế **System Usability Scale (SUS)** và **CSAT** nhằm nghiệm thu Mục tiêu chất lượng **G5** của dự án ($> 80\%$ người dùng đánh giá tích cực).

### 1.2. Môi trường kiểm thử UAT (Test Environment)
- **Frontend Web:** React 18 TypeScript, Tailwind CSS, Vite (chạy trên cổng `5173` hoặc Docker container staging).
- **Backend API:** Spring Boot 3, Java 21, Spring Security 6 (JWT Filter) (chạy trên cổng `8080`).
- **Cơ sở dữ liệu:** MariaDB 10.11 / 11.x, Flyway Database Migrations.
- **Dữ liệu kiểm thử:** Bộ dữ liệu mẫu đồ án UEH gồm các nhóm 6 thành viên, chu kỳ sprint 7 ngày, các task Kanban từ 1 đến 8 Story Points.

---

## 2. MA TRẬN KỊCH BẢN UAT TOÀN HỆ THỐNG (UAT TRACEABILITY MATRIX)

| Mã kịch bản | Tên kịch bản nghiệp vụ (Business Scenario) | Phân hệ chính | Tác nhân chính (Actor) | Trọng yếu (Priority) | Tiêu chí nghiệm thu cốt lõi |
|---|---|---|---|---|---|
| **UAT-FS-01** | Khởi tạo nhóm đồ án mới và quản lý mã mời (Invite Code) | WP2 (M2) | Trưởng nhóm (Leader) | Critical | Tạo nhóm $< 500$ms, sinh mã mời 8 ký tự duy nhất, gán quyền Leader. |
| **UAT-FS-02** | Đồng thuận chính sách dữ liệu (Consent) & Quyền rút đồng thuận | WP2 (M2) | Thành viên (Member) | Critical | Chặn đồng bộ khi chưa đồng thuận; cập nhật `agreed = false` khi rút consent. |
| **UAT-FS-03** | Thiết lập chu kỳ Sprint và Đóng Sprint (Trigger Chấm chéo) | WP2 (M2) | Trưởng nhóm (Leader) | High | Đóng sprint chốt điểm đóng góp và phát sự kiện mở đợt chấm chéo cho M4. |
| **UAT-FS-04** | Quản lý Task Board nội bộ: Tạo bảng, cột Kanban và thẻ việc (CR-02) | WP1/WP2 | Leader & Member | Critical | Tạo cột chuẩn (To Do, In Progress, Review, Done); tạo card có SP, hạn chót. |
| **UAT-FS-05** | Kéo thả di chuyển thẻ & Tự động ghi nhận đóng góp (CR-02 & CR-03) | WP1/WP3 | Thành viên (Member) | Critical | Kéo card vào Done $\rightarrow$ sinh `CARD_COMPLETED` $\rightarrow$ ScoringEngine cập nhật Dashboard. |
| **UAT-FS-06** | Đánh giá đồng đẳng & Bảo vệ ẩn danh chấm chéo (Ngưỡng $\ge 3$) | WP4 (M4) | Thành viên (Member) | Critical | Dưới 3 lượt chấm: ẩn điểm số & danh tính; từ 3 lượt: hiển thị điểm trung bình. |
| **UAT-FS-07** | Xuất báo cáo tổng hợp đóng góp ra tệp PDF chuẩn đồ án | WP0 (M0) | Leader / Giảng viên | High | Thời gian xuất PDF $< 10$s (Chuẩn G4), đủ biểu đồ, font tiếng Việt không lỗi. |
| **UAT-FS-08** | Phân quyền bảo mật theo vai trò (Role-based Access Control) | WP1 (M1) | Leader vs Member | High | Member không thể sửa cấu trúc board hoặc xóa thành viên khác; Leader toàn quyền. |

---

## 3. ĐẶC TẢ CHI TIẾT CÁC KỊCH BẢN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG

### KỊCH BẢN UAT-FS-01: Khởi tạo nhóm đồ án mới và nhận mã mời tự động
* **Mục tiêu:** Kiểm tra Trưởng nhóm có thể khởi tạo nhóm đồ án cho môn học, hệ thống tạo tự động mã mời duy nhất và thiết lập quyền quản trị nhóm.
* **Tác nhân:** Trưởng nhóm (Sinh viên đóng vai trò Leader).
* **Điều kiện tiên quyết (Pre-conditions):**
  1. Người dùng đã đăng nhập với tài khoản hợp lệ.
  2. Người dùng đang ở màn hình Danh sách nhóm (`/teams`).
* **Kịch bản Gherkin:**
  ```gherkin
  Scenario: [Positive] Trưởng nhóm tạo nhóm đồ án FairShare thành công
    Given Người dùng đã đăng nhập tài khoản "trieu.31241027455@st.ueh.edu.vn"
    And Đang ở trang danh sách nhóm "/teams"
    When Người dùng nhấn nút "+ Tạo nhóm mới"
    And Nhập tên nhóm "Nhóm 07 - Đồ án QLDA CNTT"
    And Nhập tên môn học "Quản lý dự án Công nghệ Thông tin"
    And Nhập mô tả "Đề tài FairShare - Nền tảng đo lường đóng góp"
    And Nhấn nút "Xác nhận tạo nhóm"
    Then Hệ thống tạo nhóm thành công trong cơ sở dữ liệu
    And Gán người dùng hiện tại vai trò "LEADER"
    And Tự động sinh mã mời duy nhất có định dạng "FS******"
    And Tự động ghi nhận cam kết Consent cho Leader
    And Điều hướng người dùng đến trang chi tiết nhóm "/teams/{id}"
    And Hiển thị thông báo Toast thành công
  ```
* **Các bước thực hiện (Test Steps):**
  1. Truy cập giao diện `/teams`, bấm nút **"+ Tạo nhóm mới"**.
  2. Điền đầy đủ thông tin vào Form Modal:
     - Tên nhóm: `Nhóm 07 - Đồ án QLDA CNTT`
     - Tên môn học: `Quản lý dự án Công nghệ Thông tin - UEH`
     - Mô tả: `Đề tài FairShare - Sprint 5 UAT Testing`
  3. Bấm **"Xác nhận tạo nhóm"**.
* **Kết quả mong đợi:**
  - Nhóm hiển thị trong danh sách với Role badge màu xanh: `LEADER`.
  - Hiển thị khối mã mời (ví dụ: `FS97A2B1`) kèm nút tiện ích "Sao chép mã mời".
  - Thời gian phản hồi API $< 400$ms.
* **Trường hợp ngoại lệ (Edge Cases):**
  - Để trống tên nhóm $\rightarrow$ Báo lỗi validation đỏ: *"Tên nhóm không được để trống"*, không gửi request.

---

### KỊCH BẢN UAT-FS-02: Chính sách đồng thuận dữ liệu (Consent) & Thu hồi Consent
* **Mục tiêu:** Xác minh tính năng bảo vệ quyền riêng tư người dùng theo chuẩn đạo đức phần mềm. Thành viên tham gia nhóm bắt buộc phải ký Consent mới được ghi nhận điểm; có quyền rút lại bất kỳ lúc nào.
* **Tác nhân:** Thành viên nhóm (Member).
* **Điều kiện tiên quyết:**
  1. Thành viên đã đăng nhập tài khoản cá nhân.
  2. Đã nhận được mã mời nhóm từ Trưởng nhóm.
* **Kịch bản Gherkin:**
  ```gherkin
  Scenario: [Positive] Thành viên tham gia nhóm bằng mã mời và xác nhận Consent
    Given Người dùng "thien.31241021658@st.ueh.edu.vn" chưa tham gia nhóm ID 1
    When Người dùng nhập mã mời "FS97A2B1" và bấm "Tham gia"
    Then Hệ thống ghi nhận thành viên với vai trò "MEMBER"
    And Bật Modal "Chính sách đồng thuận chia sẻ dữ liệu (Data Consent Policy)"
    When Người dùng tích chọn 2 mục cam kết và nhấn "Tôi đồng ý"
    Then Trạng thái đồng thuận của thành viên chuyển thành "Đã đồng thuận" (hasConsented = true)
    And Thành viên có thể truy cập Task Board và xem Dashboard đóng góp
  ```
* **Các bước kiểm tra luồng Rút Consent (Revoke Consent):**
  1. Thành viên vào mục "Cài đặt thành viên" trong nhóm.
  2. Bấm nút **"Rút lại đồng thuận chia sẻ dữ liệu"**.
  3. Hộp thoại cảnh báo xuất hiện xác nhận việc ngừng ghi nhận sự kiện mới nhưng bảo lưu điểm cũ.
  4. Bấm **"Đồng ý rút lại"**.
  5. *Kết quả:* Bản ghi `consents` cập nhật `agreed = false`, badge thành viên chuyển sang *"Đã rút đồng thuận"*. Các thao tác kéo thẻ sau đó không sinh điểm cho cá nhân này.

---

### KỊCH BẢN UAT-FS-03: Quản lý chu kỳ Sprint & Tự động mở đợt chấm chéo
* **Mục tiêu:** Xác minh luồng quản lý chu kỳ lặp Scrum của Trưởng nhóm, và cơ chế phát tín hiệu đóng sprint để chuyển tiếp sang đợt chấm chéo cho phân hệ M4.
* **Tác nhân:** Trưởng nhóm (Leader).
* **Kịch bản Gherkin:**
  ```gherkin
  Scenario: [Positive] Trưởng nhóm tạo Sprint 5 và thực hiện Đóng Sprint
    Given Người dùng là Leader của nhóm ID 1
    When Nhấn nút "+ Tạo Sprint mới"
    And Nhập tên "Sprint 5 - Chấm chéo ẩn danh & Báo cáo PDF"
    And Chọn ngày bắt đầu "2026-11-11" và kết thúc "2026-11-17"
    And Bấm "Lưu Sprint"
    Then Sprint được tạo với trạng thái "ACTIVE"
    When Hết chu kỳ, Leader nhấn nút "Đóng Sprint & Mở chấm chéo"
    And Xác nhận đóng tại Modal cảnh báo
    Then Trạng thái Sprint chuyển sang "CLOSED"
    And Điểm đóng góp của Sprint được chốt cố định
    And Tự động kích hoạt Review Round cho Sprint 5 trong phân hệ chấm chéo
  ```

---

### KỊCH BẢN UAT-FS-04: Quản lý Task Board nội bộ (CR-02) – Tạo bảng, cột Kanban và thẻ công việc
* **Mục tiêu:** Kiểm tra chức năng Task Board nội bộ (thay thế Trello theo Change Request CR-02). Cho phép nhóm quản lý trực tiếp bảng công việc, cấu hình các cột Kanban và tạo thẻ chi tiết.
* **Tác nhân:** Trưởng nhóm và Thành viên.
* **Các bước thực hiện:**
  1. Leader truy cập tab **"Task Board"** của nhóm.
  2. Bảng Kanban mặc định hiển thị 4 cột chuẩn: `To Do`, `In Progress`, `Review`, `Done`.
  3. Nhấn nút **"+ Thêm thẻ việc"** tại cột `To Do`.
  4. Nhập thông tin chi tiết thẻ:
     - Tiêu đề thẻ: `[Sprint 5 - M2] Hoàn thiện tài liệu kịch bản UAT và phiếu phản hồi`
     - Mô tả: `Soạn thảo kịch bản UAT Task Board, danh sách 10 người thử và phiếu SUS`
     - Người phụ trách (Assignee): Chọn `Hà Ngọc Thiện`
     - Điểm độ phức tạp (Story Points): `3`
     - Hạn chót (Due Date): `2026-11-16 17:00`
  5. Bấm **"Tạo thẻ"**.
* **Kết quả mong đợi:**
  - Thẻ xuất hiện ngay lập tức tại cột `To Do` với đầy đủ thông tin: Avatar/Tên người phụ trách, nhãn `3 SP`, hạn chót có cảnh báo màu tương ứng.
  - Phản hồi giao diện mượt mà, không giật lag.

---

### KỊCH BẢN UAT-FS-05: Kéo thả di chuyển thẻ Kanban & Tự động ghi nhận đóng góp (CR-02 & CR-03)
* **Mục tiêu:** Xác minh tính năng cốt lõi của FairShare: Khi thành viên hoàn thành công việc trên Task Board, hệ thống tự động sinh sự kiện không thể chỉnh sửa (`ActivityEvent`) và tính toán tỷ lệ đóng góp trong `ScoringEngine`.
* **Tác nhân:** Thành viên phụ trách thẻ việc.
* **Điều kiện tiên quyết:**
  1. Thẻ việc đã được gán cho thành viên đang đăng nhập.
  2. Thành viên đã đồng thuận chia sẻ dữ liệu (`hasConsented = true`).
* **Các bước thực hiện:**
  1. Người dùng dùng chuột kéo thẻ từ cột `To Do` sang cột `In Progress`.
     - *Hệ thống:* Cập nhật vị trí thẻ, lưu thời gian bắt đầu thực tế.
  2. Người dùng kéo tiếp thẻ sang cột `Review` khi hoàn thành code/tài liệu.
  3. Trưởng nhóm/Reviewer duyệt và kéo thẻ sang cột `Done`.
  4. Người dùng chuyển sang tab **"Bảng đóng góp (Dashboard)"**.
* **Kết quả mong đợi:**
  - Tại tầng CSDL: Bảng `activity_events` ghi nhận bản ghi mới:
    * `event_type = 'CARD_COMPLETED'`
    * `source = 'BOARD'`
    * `story_points = 3`
    * `is_on_time = true` (nếu hoàn thành trước hạn)
    * `metadata = {"cardTitle": "...", "delayDays": 0}`
  - Tại giao diện Dashboard:
    * Biểu đồ tỷ lệ đóng góp (Donut Chart) cập nhật phần trăm tăng tương ứng của thành viên.
    * Thẻ số liệu "Điểm công việc (Task Score)" tăng theo công thức đa chiều 4 tầng.
    * Bảng "Bằng chứng truy vết (Traceability Table)" xuất hiện dòng sự kiện mới kèm nhãn thời gian thực.

---

### KỊCH BẢN UAT-FS-06: Đánh giá đồng đẳng & Bảo vệ ẩn danh chấm chéo (Ngưỡng $\ge 3$)
* **Mục tiêu:** Kiểm tra cơ chế chấm chéo đồng đẳng theo các tiêu chí (Đúng hạn, Chất lượng, Thái độ, Đóng góp kỹ thuật) và thuật toán `AnonymityAggregator` bảo vệ tính riêng tư.
* **Tác nhân:** Các thành viên trong nhóm tham gia chấm chéo.
* **Các bước thực hiện:**
  1. Khi Sprint đóng, thành viên truy cập tab **"Chấm chéo (Peer Review)"**.
  2. Màn hình hiển thị danh sách các thành viên cần chấm (không bao gồm chính mình).
  3. Người dùng chấm điểm từ 1-5 sao cho từng tiêu chí và nhập nhận xét định tính. Bấm **"Gửi đánh giá"**.
  4. **Kiểm tra trường hợp $< 3$ lượt đánh giá (Under Threshold):**
     - Thành viên được chấm truy cập trang kết quả cá nhân.
     - *Kết quả mong đợi:* Hệ thống hiển thị biểu tượng ổ khóa 🔒 kèm thông báo: *"Chưa đủ điều kiện công bố: Đợt đánh giá này cần ít nhất 3 lượt phản hồi độc lập để mở kết quả nhằm bảo vệ tính ẩn danh của người chấm. Hiện tại đã có: 2/3 lượt."* Tuyệt đối không hiển thị điểm số trung bình hay bất kỳ manh mối danh tính nào.
  5. **Kiểm tra trường hợp $\ge 3$ lượt đánh giá (Threshold Met):**
     - Người thứ 3 gửi đánh giá thành công.
     - *Kết quả mong đợi:* Hệ thống tự động mở khóa hiển thị điểm số tổng hợp (Radar chart hoặc Bar chart theo 4 tiêu chí). Danh sách nhận xét được xáo trộn ngẫu nhiên và ẩn toàn bộ thông tin người gửi (`reviewer_id` bị lược bỏ từ tầng backend API).

---

### KỊCH BẢN UAT-FS-07: Xuất báo cáo tổng hợp đóng góp ra tệp PDF chuẩn đồ án
* **Mục tiêu:** Kiểm tra chức năng trích xuất báo cáo tổng hợp đóng góp của đồ án nhóm ra định dạng PDF phục vụ nộp báo cáo cho Giảng viên hướng dẫn UEH.
* **Tác nhân:** Trưởng nhóm hoặc Giảng viên.
* **Các bước thực hiện:**
  1. Truy cập tab **"Báo cáo & Xuất dữ liệu"**.
  2. Chọn phạm vi: `Toàn bộ dự án` hoặc `Sprint 5`.
  3. Bấm nút **"Xuất báo cáo PDF"**.
  4. Hệ thống hiển thị thanh tiến trình xử lý và tự động tải tệp `FairShare_Report_Sprint5.pdf`.
* **Kết quả mong đợi:**
  - Thời gian sinh và tải tệp $< 10$ giây (đáp ứng tiêu chí nghiệm thu **G4**).
  - Tệp PDF định dạng chuẩn A4, hiển thị tiếng Việt UTF-8 có dấu sắc nét, không lỗi font.
  - Cấu trúc nội dung gồm: Trang bìa đồ án UEH, Bảng phân công công việc, Bảng tỷ lệ đóng góp của từng thành viên, Biểu đồ đóng góp, Bảng điểm chấm chéo ẩn danh và Phụ lục bằng chứng truy vết sự kiện Task Board.

---

### KỊCH BẢN UAT-FS-08: Phân quyền bảo mật theo vai trò (Leader vs Member) trên Task Board
* **Mục tiêu:** Xác minh tính toàn vẹn và bảo mật của dữ liệu: Phân biệt rõ ràng thẩm quyền giữa Trưởng nhóm và Thành viên.
* **Kịch bản kiểm thử so sánh:**
  - **Với vai trò Leader (Nguyễn Văn Minh Triều):**
    * Có nút "+ Thêm cột", nút "Đổi tên cột", "Xóa cột".
    * Có thể tạo/xóa thẻ, phân công lại thẻ cho bất kỳ ai.
    * Có quyền đổi vai trò thành viên, xóa thành viên khỏi nhóm và Đóng Sprint.
  - **Với vai trò Member (Hà Ngọc Thiện, Phúc, Vương...):**
    * Không hiển thị nút chỉnh sửa cấu trúc cột của Task Board.
    * Chỉ được phép chỉnh sửa trạng thái/kéo thả các thẻ mà mình được phân công phụ trách.
    * Không thể tự thăng chức lên Leader hoặc xóa thành viên khác. Khi gọi API trực tiếp bằng Postman với token Member $\rightarrow$ Backend trả mã lỗi `403 Forbidden` hoặc `400 BusinessException`.

---

## 4. DANH SÁCH ĐỐI TƯỢNG MỜI DỰ KIẾN THEO PERSONA (TARGET PROFILES - QUY MÔ $\ge 10$ ĐỐI TƯỢNG)

Nhằm đảm bảo tính khách quan và chuẩn mực theo phương pháp luận Business Analysis (BA) & Agile/Scrum, nhóm dự án thiết lập **Bảng phân bổ 12 đối tượng thử nghiệm dự kiến theo Persona (Target Profiles)** đại diện cho các nhóm người dùng thực tế trong hệ sinh thái đồ án môn học:

| STT | Mã Target | Nhóm Persona (Target Profile) | Đại diện đối tượng mục tiêu | Vai trò UAT phân công | Kịch bản UAT phân bổ | Trọng tâm kiểm thử & Mục tiêu đánh giá | Trạng thái thư mời (Sprint 5) |
|:---:|:---:|---|---|---|---|---|:---:|
| 1 | Target #01 | **Persona 1: Project Leader** | Nhóm trưởng nhóm đồ án QLDA khác (Khóa 48) | Project Leader | UAT-FS-01, UAT-FS-03, UAT-FS-04, UAT-FS-08 | Khởi tạo dự án, phân quyền, quản lý Task Board, đóng Sprint & kiểm soát RBAC | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 2 | Target #02 | **Persona 1: Project Leader** | Nhóm trưởng nhóm đồ án QLDA khác (Khóa 49) | Project Leader | UAT-FS-01, UAT-FS-03, UAT-FS-04, UAT-FS-08 | Trải nghiệm quản trị Sprint, cấu hình cột Kanban, giám sát tiến độ thành viên | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 3 | Target #03 | **Persona 1: Project Leader** | Nhóm trưởng nhóm đồ án QLDA khác (Hệ CLC) | Project Leader | UAT-FS-01, UAT-FS-03, UAT-FS-04, UAT-FS-08 | Luồng phân chia Story Points, kiểm soát ranh giới bảo mật và phê duyệt kết quả | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 4 | Target #04 | **Persona 2: Team Member** | Thành viên (Member) nhóm đồ án khác (K48) | Team Member | UAT-FS-02, UAT-FS-05, UAT-FS-06 | Xác nhận Consent minh bạch, nhận Task, di chuyển thẻ Kanban, cập nhật % tiến độ | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 5 | Target #05 | **Persona 2: Team Member** | Thành viên (Member) nhóm đồ án khác (K48) | Team Member | UAT-FS-02, UAT-FS-05, UAT-FS-06 | Luồng tự động tính tỷ lệ đóng góp (Contribution), kiểm tra tính chính xác Story Points | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 6 | Target #06 | **Persona 2: Team Member** | Thành viên (Member) nhóm đồ án khác (K49) | Team Member | UAT-FS-02, UAT-FS-05, UAT-FS-06 | Tham gia chấm chéo đồng đẳng (Peer Review), kiểm tra tính ẩn danh và khách quan | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 7 | Target #07 | **Persona 2: Team Member** | Thành viên (Member) nhóm đồ án khác (K49) | Team Member | UAT-FS-02, UAT-FS-05, UAT-FS-06 | Trải nghiệm kéo thả Kanban, gắn link bằng chứng (Git/Figma) và nộp minh chứng | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 8 | Target #08 | **Persona 2: Team Member** | Thành viên (Member) nhóm đồ án khác (K49) | Team Member | UAT-FS-02, UAT-FS-05, UAT-FS-06 | Kiểm thử biên xử lý tranh chấp điểm đóng góp, phát hiện hành vi thiên vị/bất công | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 9 | Target #09 | **Persona 3: Junior Student** | Sinh viên khóa dưới (K49) mới tiếp cận đồ án | Usability Tester | UAT-FS-02, UAT-FS-04, Khảo sát SUS | Đánh giá mức độ trực quan, tính dễ học (Learnability), khả năng thao tác không cần hướng dẫn | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 10 | Target #10 | **Persona 3: Junior Student** | Sinh viên khóa dưới (K49) mới tiếp cận đồ án | Usability Tester | UAT-FS-02, UAT-FS-04, Khảo sát SUS | Đánh giá độ tiện dụng (Usability), độ rõ ràng của thuật ngữ và giao diện qua 10 câu SUS | ⏳ Đã gửi thư mời / Chờ xác nhận |
| 11 | Target #11 | **Persona 4: Academic Advisor** | Giảng viên hướng dẫn môn học QLDA | Academic Evaluator | UAT-FS-06, UAT-FS-07 | Đánh giá tính năng Xuất báo cáo PDF G4, độ tin cậy của thuật toán đóng góp công bằng | ⏳ Đã gửi đề xuất tham vấn |
| 12 | Target #12 | **Persona 4: Academic Advisor** | Trợ giảng môn học QLDA / Chuyên viên học thuật | Academic Evaluator | UAT-FS-06, UAT-FS-07 | Đánh giá tính chuẩn mực dữ liệu báo cáo nghiệm thu, khả năng giám sát chống free-rider | ⏳ Đã gửi đề xuất tham vấn |

> 📌 **Ghi chú về phân kỳ Scrum (Sprint 5 vs Sprint 6):**  
> Giai đoạn **Sprint 5** tập trung xây dựng kịch bản, thiết kế bảng phân bổ đối tượng và phát hành thư mời; việc triển khai khảo sát thực tế và tổng hợp điểm số SUS/CSAT sẽ diễn ra trong **Sprint 6 (UAT Execution Phase)**.

*Nhóm đã chuẩn bị sẵn tài liệu hướng dẫn nhanh (Quickstart Guide), tài khoản kiểm thử cho từng vai trò và đường dẫn truy cập Staging để gửi kèm theo thư mời trước khi bắt đầu Sprint 6.*

---

## 5. PHIẾU PHẢN HỒI CHẤP NHẬN NGƯỜI DÙNG (UAT FEEDBACK & USABILITY FORM)

Phiếu khảo sát được thiết kế trên chuẩn hóa quốc tế **System Usability Scale (SUS)** kết hợp câu hỏi đo lường sự hài lòng **CSAT** nhằm định lượng chính xác Mục tiêu chất lượng **G5** của dự án.

### 5.1. Thang đo chuẩn hóa System Usability Scale (SUS)
Người tham gia đánh giá 10 câu hỏi theo thang điểm Likert 5 mức độ:  
*(1 = Rất không đồng ý, 2 = Không đồng ý, 3 = Trung lập, 4 = Đồng ý, 5 = Rất đồng ý)*

| STT | Nội dung câu hỏi chuẩn hóa SUS | 1 | 2 | 3 | 4 | 5 |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| Q1 | Tôi nghĩ rằng tôi sẽ muốn sử dụng hệ thống FairShare thường xuyên trong các môn đồ án nhóm. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q2 | Tôi thấy hệ thống FairShare phức tạp một cách không cần thiết. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q3 | Tôi thấy hệ thống FairShare dễ sử dụng và thao tác trực quan. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q4 | Tôi nghĩ rằng tôi sẽ cần sự hỗ trợ của một chuyên gia kỹ thuật để có thể sử dụng hệ thống này. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q5 | Tôi thấy các chức năng trong hệ thống (Task Board, Đóng góp, Chấm chéo) được tích hợp rất tốt. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q6 | Tôi thấy có quá nhiều điều không nhất quán trong hệ thống này. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q7 | Tôi nghĩ rằng hầu hết sinh viên sẽ học cách sử dụng hệ thống này rất nhanh chóng. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q8 | Tôi thấy hệ thống này rất rườm rà, khó thao tác khi kéo thả thẻ và xem biểu đồ. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q9 | Tôi cảm thấy rất tự tin và an tâm khi sử dụng hệ thống FairShare. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Q10 | Tôi cần phải học hỏi và làm quen rất nhiều thứ trước khi có thể bắt đầu sử dụng được hệ thống. | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

**Công thức chuẩn hóa điểm số SUS:**
$$X = \sum (Điểm\_Q_{lẻ} - 1)$$
$$Y = \sum (5 - Điểm\_Q_{chẵn})$$
$$SUS\_Score = (X + Y) \times 2.5$$
- **Mục tiêu nghiệm thu:** Điểm $SUS\_Score \ge 70$ điểm (Mức Đạt - Good). Kỳ vọng đạt $SUS\_Score \ge 80$ điểm (Mức Xuất sắc - Hạng A theo chuẩn Bangor et al., 2008).

---

### 5.2. Thang đo mức độ hài lòng khách hàng (CSAT - Customer Satisfaction) & Mục tiêu G5
Đánh giá mức độ hài lòng tổng thể với câu hỏi:
> *"Nhìn chung, bạn đánh giá mức độ hài lòng của mình đối với nền tảng FairShare như thế nào trong việc giải quyết vấn đề bất bình đẳng và ỷ lại (free-rider) trong làm đồ án nhóm?"*
- `[ 1 ] Rất không hài lòng (Very Dissatisfied)`
- `[ 2 ] Không hài lòng (Dissatisfied)`
- `[ 3 ] Bình thường (Neutral)`
- `[ 4 ] Hài lòng (Satisfied)`
- `[ 5 ] Rất hài lòng (Very Satisfied)`

**Công thức xác định tỷ lệ đạt chuẩn G5:**
$$CSAT\_Rate = \frac{\text{Số người đánh giá mức 4 và 5}}{\text{Tổng số người tham gia UAT}} \times 100\%$$
- **Mục tiêu chất lượng G5:** $CSAT\_Rate \ge 80\%$.

---

### 5.3. Phiếu câu hỏi đánh giá nghiệp vụ chuyên sâu (Domain-Specific Questions)

1. **Về Task Board nội bộ (CR-02):**
   - Thao tác kéo thả thẻ giữa các cột có mượt mà và cập nhật trạng thái tức thời không?
   - Thông tin hiển thị trên thẻ (Story Points, người phụ trách, nhãn hạn chót) có trực quan không?
2. **Về Bảng đóng góp & Bằng chứng truy vết (CR-03):**
   - Biểu đồ tỷ lệ đóng góp có phản ánh trung thực nỗ lực của từng thành viên không?
   - Bảng bằng chứng truy vết sự kiện có đủ thuyết phục để làm căn cứ chấm điểm đồ án không?
3. **Về Chấm chéo ẩn danh (Anonymity Guard):**
   - Bạn có cảm thấy hoàn toàn an tâm khi đưa ra đánh giá thật lòng cho bạn cùng nhóm nhờ cơ chế ẩn danh (ngưỡng $\ge 3$ lượt) không?
   - Bạn có đề xuất cải tiến gì thêm cho 4 tiêu chí chấm chéo không?
4. **Về Báo cáo PDF:**
   - Định dạng báo cáo PDF có đủ chuyên nghiệp và đầy đủ dữ kiện để nộp cho Giảng viên không?

---

## 6. TIÊU CHUẨN NGHIỆM THU UAT (ACCEPTANCE & EXIT CRITERIA)

Một phiên kiểm thử UAT chỉ được phê duyệt hoàn tất khi thỏa mãn đầy đủ các điều kiện sau:
1. **100% kịch bản UAT (8/8 kịch bản)** được thực thi đầy đủ trên môi trường Staging/Demo.
2. **Không có lỗi nghiêm trọng tồn đọng:** 0 lỗi mức Blocker (Chặn luồng) và 0 lỗi mức Critical (Sai lệch thuật toán tính điểm hoặc lộ danh tính người chấm chéo).
3. **Hiệu năng hệ thống đạt cam kết:**
   - Thời gian xuất tệp báo cáo PDF $< 10$ giây (Mục tiêu G4).
   - Thời gian phản hồi các thao tác kéo thả thẻ và cập nhật Dashboard $< 1$ giây.
4. **Mức độ hài lòng người dùng đạt chỉ tiêu:**
   - Tối thiểu 10/12 người tham gia hoàn thành đầy đủ phiếu đánh giá.
   - Điểm đánh giá mức độ hài lòng $CSAT \ge 80\%$ (Mục tiêu G5).
   - Điểm số độ khả dụng trung bình $SUS\_Score \ge 75$ điểm.

---

## 7. BIÊN BẢN KÝ DUYỆT NGHIỆM THU TÀI LIỆU (SIGN-OFF)

| Vai trò | Họ và tên | Chữ ký / Xác nhận | Ngày duyệt |
|---|---|:---:|:---:|
| **PM Phân tích nghiệp vụ (BA - M2)** | Hà Ngọc Thiện | *Đã ký xác nhận* | 11/11/2026 |
| **Nhóm trưởng (PM hệ thống - M0)** | Nguyễn Văn Minh Triều | *Đã ký phê duyệt* | 11/11/2026 |
| **PM Đảm bảo chất lượng (QA - M5)** | Khiếu Hoàng Nam Anh | *Đã ký nghiệm thu* | 11/11/2026 |
| **Giảng viên hướng dẫn môn học** | TS. Nguyễn Mạnh Tuấn | *Đã tham vấn ý kiến* | 11/11/2026 |
