# CHÍNH SÁCH ĐỒNG THUẬN CHIA SẺ DỮ LIỆU (DATA SHARING CONSENT POLICY)
**Hệ thống:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm  
**Phân hệ:** WP2 – Nhóm, Sprint & Consent  
**Soạn thảo bởi:** Hà Ngọc Thiện (PM BA / M2)  
**Áp dụng cho:** Tất cả thành viên tham gia nhóm dự án trên FairShare  

---

## 1. MỤC ĐÍCH THU THẬP DỮ LIỆU
Hệ thống FairShare thu thập và xử lý dữ liệu hoạt động học tập nhằm mục đích duy nhất:
1. Ghi nhận minh bạch lịch sử và khối lượng công việc của từng thành viên trong nhóm.
2. Cung cấp cơ sở dữ liệu khách quan để hỗ trợ nhóm thực hiện Chấm chéo nội bộ (Peer Review).
3. Xuất báo cáo đóng góp minh bạch hỗ trợ Giảng viên đánh giá công bằng điểm đồ án.

---

## 2. PHẠM VI DỮ LIỆU ĐƯỢC THU THẬP (NGẮN GỌN & MINH BẠCH)

### 2.1. Dữ liệu hệ thống THU THẬP:
* **Thông tin định danh tối thiểu:** Họ tên, MSSV, Email sinh viên (từ tài khoản đăng nhập).
* **Hoạt động từ Trello (khi nhóm liên kết):**
  - Tên các Task/Card được giao cho bạn.
  - Trạng thái di chuyển thẻ (To Do -> In Progress -> Done).
  - Thời điểm hoàn thành task so với hạn chót (Deadline).
* **Đánh giá chấm chéo:** Điểm và nhận xét bạn gửi cho người khác, và điểm nhóm gửi cho bạn (được bảo mật ẩn danh).

### 2.2. Dữ liệu hệ thống TUYỆT ĐỐI KHÔNG THU THẬP:
* ❌ Mật khẩu tài khoản Trello / Google của bạn (sử dụng OAuth token giới hạn quyền đọc).
* ❌ Nội dung tin nhắn chat riêng tư trên Messenger, Zalo hoặc mạng xã hội.
* ❌ Bất kỳ file, tài liệu cá nhân nào ngoài phạm vi bảng công việc được chỉ định.

---

## 3. NGUYÊN TẮC BẢO VỆ DỮ LIỆU & ẨN DANH
1. **Bảo mật danh tính khi chấm chéo (Anonymous):** Điểm đánh giá và lời nhận xét bạn dành cho đồng đội chỉ được hiển thị ở dạng điểm trung bình tổng hợp. Thành viên khác và nhóm trưởng không thể biết ai đã chấm bao nhiêu điểm cho mình.
2. **Quyền riêng tư trong nội bộ nhóm:** Dữ liệu đóng góp chỉ được chia sẻ giữa các thành viên cùng nhóm và Giảng viên phụ trách môn học.
3. **Quyền rút lại sự đồng thuận (Revoke Consent):** Bạn có quyền rút lại sự đồng thuận bất cứ lúc nào. Khi rút lại, hệ thống sẽ ngừng đồng bộ dữ liệu mới từ tài khoản của bạn.

---

## 4. FORM XÁC NHẬN (MẪU HIỂN THỊ TRÊN GIAO DIỆN)

```
[ ] Tôi đã đọc, hiểu và đồng ý với Chính sách chia sẻ dữ liệu của FairShare.
[ ] Tôi đồng ý cho phép FairShare đọc dữ liệu task từ Trello của nhóm để tính điểm đóng góp.

[ NÚT: TÔI ĐỒNG Ý & THAM GIA NHÓM ]     [ NÚT: TỪ CHỐI ]
```

---

## 5. THỜI HẠN LƯU TRỮ DỮ LIỆU (DATA RETENTION POLICY)
Nhằm tuân thủ nguyên tắc giới hạn lưu trữ (Storage Limitation) trong bảo vệ quyền riêng tư học thuật:
1. **Thời hạn lưu trữ hoạt động:** Dữ liệu task, nhật ký hoạt động `ActivityEvent` và điểm số đóng góp chỉ được lưu trữ trong suốt thời gian diễn ra học phần Quản lý dự án CNTT (từ 14/10/2026 đến hết ngày 26/11/2026).
2. **Thời hạn đối soát sau môn học:** Sau ngày kết thúc môn học (26/11/2026), toàn bộ dữ liệu được giữ ở trạng thái chỉ đọc (Read-only / Archive) trong vòng 30 ngày phục vụ trường hợp Giảng viên hoặc Sinh viên có khiếu nại, phúc khảo điểm quá trình.
3. **Giới hạn truy cập:** Trong thời gian lưu trữ, chỉ có thành viên nhóm và Giảng viên phụ trách mới có quyền xem báo cáo tổng kết. Không cung cấp hoặc chia sẻ dữ liệu cho bất kỳ bên thứ ba nào vì mục đích thương mại.

---

## 6. QUYỀN RÚT LẠI ĐỒNG THUẬN VÀ CƠ CHẾ XÓA DỮ LIỆU (REVOCATION & RIGHT TO ERASURE)
1. **Cơ chế rút lại đồng thuận (Revoke Consent):**
   * Sinh viên có quyền đơn phương rút lại cam kết chia sẻ dữ liệu bất kỳ lúc nào thông qua chức năng *"Quản lý quyền riêng tư"* trên trang Chi tiết nhóm.
   * Thao tác rút lại có hiệu lực tức thì: Hệ thống FairShare lập tức thu hồi quyền truy cập API Trello của tài khoản đó và chấm dứt việc tự động đồng bộ mọi thẻ công việc phát sinh sau thời điểm rút lại.
   * Thành viên rút đồng thuận vẫn có thể chuyển sang hình thức khai báo đóng góp thủ công (Manual Activity Claim) có sự xác nhận của Trưởng nhóm và đồng đội.
2. **Quyền yêu cầu xóa dữ liệu (Right to Erasure):**
   * Nếu sinh viên rời nhóm hoặc hủy môn học, sinh viên có quyền gửi yêu cầu xóa toàn bộ thông tin tài khoản và lịch sử hoạt động cá nhân chưa được chốt vào báo cáo chính thức.
   * Hệ thống sẽ thực hiện làm sạch dữ liệu (Anonymization) bằng cách ẩn danh hóa định danh (thay thế MSSV và Họ tên bằng mã băm giả danh `ANON_USER_XXX`), giữ nguyên tổng điểm số của nhóm để không làm sai lệch kết quả chung của cả đội ngũ.

---

## 7. QUY TRÌNH TIÊU HỦY DỮ LIỆU KHI ĐÓNG DỰ ÁN (PROJECT CLOSEOUT & DATA PURGE)
Theo kế hoạch đóng dự án tại Sprint 7 (Tuần kết thúc môn):
1. **Hủy Token liên kết Trello:** Hệ thống tự động xóa toàn bộ OAuth Access Tokens và Webhook configurations liên kết với bảng Trello của nhóm.
2. **Xuất bản lưu trữ ngoại tuyến:** Toàn bộ dữ liệu tổng kết được kết xuất thành 01 file báo cáo nén duy nhất bàn giao cho Giảng viên.
3. **Tiêu hủy cơ sở dữ liệu (Data Purge):** Toàn bộ cơ sở dữ liệu trên môi trường triển khai thực tế (Database MariaDB) sẽ được xóa sạch dữ liệu người dùng (DROP/TRUNCATE bảng `users`, `teams`, `consents`, `activity_events`, `peer_reviews`), cam kết không lưu lại vết thông tin sinh viên sau khi hoàn thành nghiệm thu môn học.

