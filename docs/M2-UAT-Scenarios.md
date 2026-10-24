# KỊCH BẢN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG SƠ BỘ (UAT SCENARIOS SPECIFICATION)
**Hệ thống:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp trong đồ án nhóm  
**Môn học:** Quản lý dự án CNTT – UEH (GV: TS. Nguyễn Mạnh Tuấn)  
**Phân hệ:** WP2 – Quản lý Nhóm, Sprint & Cam kết Dữ liệu (Consent)  
**Người phụ trách (PM mini / BA):** Hà Ngọc Thiện (MSSV: 31241021658)  
**Mục tiêu tài liệu:** Thiết lập bộ kịch bản kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT) nhằm xác minh các luồng nghiệp vụ cốt lõi của phân hệ M2 đáp ứng đầy đủ yêu cầu người dùng (Sinh viên làm đồ án, Trưởng nhóm và Giảng viên) trước khi bàn giao cho QA kiểm thử hồi quy và tổ chức UAT diện rộng ở Sprint 6.

---

## 1. TỔNG QUAN PHẠM VI KIỂM THỬ UAT PHÂN HỆ M2

| Mã kịch bản | Tên kịch bản nghiệp vụ (Scenario Name) | Use Case ánh xạ | Tác nhân chính (Actor) | Độ ưu tiên |
|---|---|---|---|---|
| **UAT-M2-01** | Trưởng nhóm tạo nhóm đồ án mới và nhận mã mời (Invite Code) | UC01 (Tạo nhóm) | Trưởng nhóm (Leader) | Critical (Bắt buộc) |
| **UAT-M2-02** | Mời thành viên vào nhóm qua Email và Mã mời trực tiếp | UC02 (Mời thành viên) | Trưởng nhóm & Thành viên | High (Cao) |
| **UAT-M2-03** | Thành viên đọc Chính sách chia sẻ dữ liệu và ký Consent | UC03 (Xác nhận Consent) | Thành viên (Member) | Critical (Bắt buộc) |
| **UAT-M2-04** | Thành viên rút lại đồng thuận chia sẻ dữ liệu (Revoke Consent) | UC03-Ext (Rút Consent) | Thành viên (Member) | High (Cao) |
| **UAT-M2-05** | Trưởng nhóm thiết lập chu kỳ Sprint và thực hiện Đóng Sprint | UC05, UC06 (Sprint) | Trưởng nhóm (Leader) | Critical (Bắt buộc) |

---

## 2. CHI TIẾT CÁC KỊCH BẢN KIỂM THỬ (TEST SCENARIOS)

### KỊCH BẢN UAT-M2-01: Tạo nhóm đồ án mới và sinh mã mời tự động
* **Mục tiêu:** Kiểm tra Trưởng nhóm có thể khởi tạo nhóm đồ án, đặt tên môn học, mô tả và hệ thống tự động sinh ra mã mời (Invite Code) duy nhất gồm 6 ký tự viết hoa.
* **Điều kiện tiên quyết (Pre-conditions):**
  1. Người dùng đã đăng nhập vào hệ thống FairShare với tài khoản sinh viên UEH hợp lệ.
  2. Người dùng đang ở màn hình Danh sách nhóm (`/teams`).
* **Các bước thực hiện (Test Steps):**
  1. Nhấn nút **"+ Tạo nhóm mới"** trên góc phải màn hình.
  2. Modal "Khởi tạo nhóm đồ án" hiển thị. Nhập thông tin:
     - Tên nhóm: `Nhóm 07 - Đồ án QLDA CNTT`
     - Tên môn học: `Quản lý dự án Công nghệ Thông tin`
     - Mô tả: `Đề tài FairShare - Nền tảng đo lường đóng góp`
  3. Nhấn nút **"Xác nhận tạo nhóm"**.
* **Kết quả mong đợi (Expected Results):**
  - Hệ thống tạo nhóm thành công trong thời gian $< 500$ms.
  - Tự động gán người tạo với vai trò `LEADER`.
  - Tự động sinh `inviteCode` duy nhất (ví dụ: `FS-9742` hoặc chuỗi 6 ký tự `FS7QLD`).
  - Điều hướng người dùng vào màn hình Chi tiết nhóm (`/teams/{id}`).
  - Hiển thị thông báo Toast: *"Tạo nhóm thành công! Hãy chia sẻ mã mời cho các thành viên."*
* **Trường hợp ngoại lệ / Biên:**
  - Để trống trường "Tên nhóm": Hệ thống báo lỗi validation màu đỏ *"Tên nhóm không được để trống"*, không gửi request lên server.
  - Nhập tên nhóm vượt quá 100 ký tự: Cắt bớt hoặc hiển thị cảnh báo giới hạn độ dài.

---

### KỊCH BẢN UAT-M2-02: Mời thành viên tham gia nhóm
* **Mục tiêu:** Kiểm thử 2 phương thức thêm thành viên vào nhóm: gửi lời mời qua email sinh viên và nhập trực tiếp mã mời (Invite Code).
* **Điều kiện tiên quyết:**
  1. Nhóm đã được tạo thành công bởi Leader.
  2. Các thành viên được mời đã có tài khoản trên hệ thống FairShare.
* **Phương thức A: Trưởng nhóm mời qua Email:**
  1. Tại tab "Thành viên" của trang chi tiết nhóm, Leader nhập email sinh viên: `vuong.31241025017@st.ueh.edu.vn`.
  2. Nhấn nút **"Gửi lời mời"**.
  3. *Kết quả mong đợi:* Hệ thống ghi nhận thành viên mới ở trạng thái `PENDING_CONSENT`. Danh sách thành viên hiển thị badge màu vàng *"Chờ đồng thuận"*.
* **Phương thức B: Thành viên tự tham gia qua Mã mời (Invite Code):**
  1. Thành viên đăng nhập tài khoản sinh viên cá nhân, truy cập trang `/teams`.
  2. Nhấn nút **"Tham gia nhóm bằng mã"**.
  3. Nhập mã mời do Leader cung cấp (ví dụ: `FS-9742`) $\rightarrow$ Bấm **"Tham gia"**.
  4. *Kết quả mong đợi:* Hệ thống nhận diện đúng nhóm đồ án, tự động gán vai trò `MEMBER`, và bật ngay cửa sổ Modal Consent bắt buộc.

---

### KỊCH BẢN UAT-M2-03: Đọc chính sách chia sẻ dữ liệu và ký Consent
* **Mục tiêu:** Xác minh tính năng bảo vệ quyền riêng tư người dùng. Thành viên bắt buộc phải đọc và đồng thuận chính sách trước khi dữ liệu Trello được phép đồng bộ.
* **Điều kiện tiên quyết:**
  1. Thành viên vừa tham gia nhóm hoặc đang có trạng thái `hasConsented = false`.
* **Các bước thực hiện:**
  1. Hệ thống tự động bật Modal **"Chính sách đồng thuận chia sẻ dữ liệu (Data Consent Policy)"**.
  2. Kiểm tra giao diện hiển thị:
     - Mục đích thu thập dữ liệu đồ án rõ ràng.
     - Liệt kê rõ: Chỉ đọc tên task/card và trạng thái hoàn thành từ Trello; TUYỆT ĐỐI không đọc tin nhắn chat riêng tư, không lưu mật khẩu.
     - Cam kết ẩn danh khi chấm chéo đồng đẳng.
  3. Người dùng tích chọn vào 2 ô checkbox bắt buộc:
     - `[x] Tôi đã đọc và hiểu Chính sách chia sẻ dữ liệu của FairShare.`
     - `[x] Tôi đồng ý cho phép FairShare đọc dữ liệu task từ Trello của nhóm để ghi nhận đóng góp.`
  4. Nhấn nút **"Tôi đồng ý & Kích hoạt tài khoản"**.
* **Kết quả mong đợi:**
  - Hệ thống gửi request `POST /api/teams/{id}/consent` với payload `{ consented: true, shareTrelloActivity: true }`.
  - Trạng thái thành viên chuyển từ `PENDING_CONSENT` sang `ACTIVE`.
  - Icon trạng thái bên cạnh tên thành viên chuyển sang dấu tick xanh ✅ *"Đã đồng thuận"*.
  - Cho phép thành viên bắt đầu xem Dashboard đóng góp.
* **Trường hợp từ chối (Negative Case):**
  - Nếu người dùng nhấn nút **"Từ chối"**: Modal đóng lại, hiển thị thông báo: *"Bạn đã từ chối chia sẻ dữ liệu. Hoạt động Trello của bạn sẽ không được tự động đồng bộ. Bạn có thể sử dụng chức năng khai báo thủ công có xác nhận của nhóm."*

---

### KỊCH BẢN UAT-M2-04: Rút lại cam kết chia sẻ dữ liệu (Revoke Consent)
* **Mục tiêu:** Đảm bảo quyền tự chủ dữ liệu của sinh viên theo quy định đạo đức nghiên cứu; người dùng có thể thu hồi quyền truy cập bất cứ lúc nào.
* **Điều kiện tiên quyết:**
  1. Thành viên đang ở trạng thái `hasConsented = true` trong nhóm.
* **Các bước thực hiện:**
  1. Thành viên vào trang Cài đặt nhóm / Chi tiết nhóm $\rightarrow$ Nhấn nút **"Quản lý quyền riêng tư"**.
  2. Chọn tùy chọn **"Rút lại đồng thuận chia sẻ dữ liệu (Revoke Consent)"**.
  3. Hệ thống hiển thị hộp thoại cảnh báo: *"Nếu bạn rút lại đồng thuận, FairShare sẽ ngừng đồng bộ các task mới từ Trello của bạn kể từ thời điểm này. Các điểm số đã chốt trong sprint trước vẫn được bảo lưu."*
  4. Thành viên xác nhận **"Đồng ý rút lại"**.
* **Kết quả mong đợi:**
  - Hệ thống cập nhật bản ghi trong bảng `consents`: `agreed = false`, cập nhật `revoked_at = CURRENT_TIMESTAMP`.
  - Worker đồng bộ Trello của M1 sẽ tự động bỏ qua (skip) các card/action của thành viên này trong các lần sync tiếp theo.
  - Trạng thái trên giao diện chuyển sang badge xám *"Đã rút đồng thuận"*.

---

### KỊCH BẢN UAT-M2-05: Thiết lập chu kỳ Sprint và Đóng Sprint (Trigger Chấm chéo)
* **Mục tiêu:** Xác minh luồng quản lý chu kỳ làm việc theo chuẩn Agile/Scrum của Trưởng nhóm và khả năng kích hoạt tự động cổng chấm chéo cho phân hệ M4.
* **Điều kiện tiên quyết:**
  1. Người dùng đăng nhập có vai trò `LEADER` của nhóm.
  2. Nhóm đang mở trang Chi tiết nhóm tại tab "Quản lý Sprint".
* **Phần 1: Tạo Sprint mới:**
  1. Nhấn nút **"+ Tạo Sprint mới"**.
  2. Nhập thông tin:
     - Tên Sprint: `Sprint 1 - Phân tích nghiệp vụ & Khung nền tảng`
     - Ngày bắt đầu: `2026-10-14`
     - Ngày kết thúc: `2026-10-20`
     - Mục tiêu Sprint: `Hoàn thành Charter, WBS, khảo sát và khung DB`
  3. Nhấn **"Lưu Sprint"**.
  4. *Kết quả:* Sprint được tạo ở trạng thái `ACTIVE`.
* **Phần 2: Đóng Sprint (Close Sprint):**
  1. Khi hết thời hạn Sprint, Leader nhấn nút **"Đóng Sprint & Mở chấm chéo"**.
  2. Hệ thống kiểm tra: Nếu còn task đang In Progress, hiển thị cảnh báo xác nhận.
  3. Leader nhấn **"Xác nhận đóng Sprint"**.
  4. *Kết quả mong đợi:*
     - Trạng thái Sprint cập nhật từ `ACTIVE` $\rightarrow$ `COMPLETED`.
     - Chốt số liệu điểm đóng góp tính toán tự động của Sprint tại thời điểm đóng.
     - Phát tín hiệu sự kiện hệ thống (Event/Webhook nội bộ) sang phân hệ M4: Tự động kích hoạt đợt chấm chéo (Review Round) tương ứng cho Sprint này.
     - Giao diện của tất cả các thành viên trong nhóm xuất hiện banner thông báo: *"Sprint 1 đã kết thúc. Vui lòng hoàn thành đánh giá đồng đẳng (Peer Review) cho các thành viên trước hạn chót."*

---

## 3. TIÊU CHÍ ĐÁNH GIÁ ĐẠT UAT (UAT PASS CRITERIA)
- 100% kịch bản UAT (5/5) thực thi thành công không phát sinh lỗi chặn luồng (Blocker/Critical Defect).
- Thời gian phản hồi của các thao tác tạo nhóm, ký consent, tạo sprint dưới 1 giây.
- Giao diện thân thiện, rõ ràng, phản ánh chính xác trạng thái người dùng (Leader vs Member).
- Được nghiệm thu bởi Trưởng nhóm Nguyễn Văn Minh Triều (M0) và đại diện QA Khiếu Hoàng Nam Anh (M5).
