# SỔ ĐĂNG KÝ VÀ PHÂN TÍCH CÁC BÊN LIÊN QUAN SƠ BỘ (STAKEHOLDER REGISTER)
**Dự án:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm  
**Môn học:** Quản lý dự án CNTT – UEH (GV: TS. Nguyễn Mạnh Tuấn)  
**Tác giả (BA / PM mini M2):** Hà Ngọc Thiện  
**Thời gian lập:** 12/10/2026 (Tuần 1 - Khởi động dự án)  

---

## 1. MỤC ĐÍCH QUẢN LÝ CÁC BÊN LIÊN QUAN
Trong quản lý dự án công nghệ thông tin theo chuẩn PMBOK và Scrum:
1. **Nhận diện sớm:** Xác định đầy đủ mọi cá nhân, tổ chức có quyền lực (Power) hoặc sự quan tâm (Interest) đối với dự án.
2. **Dự báo rào cản:** Nhận diện các rào cản tâm lý của sinh viên (ngại bị micromanagement, sợ lộ tin nhắn riêng tư) để thiết kế chính sách dữ liệu minh bạch.
3. **Kế hoạch gắn kết:** Thiết lập kênh giao tiếp, tần suất và định dạng báo cáo phù hợp cho Giảng viên, nhóm Kiểm soát (PCG) và người dùng mục tiêu.

---

## 2. BẢNG SỔ ĐĂNG KÝ CÁC BÊN LIÊN QUAN (STAKEHOLDER REGISTER)

| STT | Bên liên quan (Stakeholder) | Vai trò / Tổ chức | Kỳ vọng & Mối quan tâm chính | Quyền lực (Power) | Quan tâm (Interest) | Nhóm chiến lược |
|---|---|---|---|---|---|---|
| 1 | **TS. Nguyễn Mạnh Tuấn** | Giảng viên hướng dẫn / Đánh giá cuối kỳ | Báo cáo tiến độ chuẩn chỉnh, số liệu đo lường minh bạch, có cơ sở xác thực khách quan, tính học thuật cao. | **Cao** | **Cao** | **Manage Closely** (Quản lý chặt chẽ) |
| 2 | **Nhóm Kiểm soát (PCG)** | Giám sát độc lập môn học | Tuân thủ kế hoạch (Plan vs Actual), tài liệu rõ ràng, minh chứng commit/task đầy đủ, quản lý rủi ro tốt. | **Cao** | **Cao** | **Manage Closely** (Báo cáo mốc tuần) |
| 3 | **Nhóm FairShare (6 SV)** | Đội ngũ phát triển dự án | Phân chia công việc công bằng (6 lát cắt dọc M0-M5), hoàn thành đúng deadline các Sprint, đạt điểm tối đa. | **Cao** | **Cao** | **Manage Closely** (Họp tuần, Trello) |
| 4 | **Trưởng nhóm đồ án (Leader)** | Người dùng chính hệ thống | Có công cụ tự động ghi nhận đóng góp, phát hiện trễ hạn, có bằng chứng số liệu để chia điểm công bằng. | **Trung bình** | **Cao** | **Keep Informed** (Phỏng vấn, thử nghiệm) |
| 5 | **Thành viên đồ án (Member)** | Người dùng mục tiêu | Công sức bỏ ra được ghi nhận đúng; loại bỏ free-rider; hệ thống dễ dùng; chấm chéo ẩn danh tuyệt đối. | **Trung bình** | **Cao** | **Keep Informed** (Khảo sát, UAT) |
| 6 | **Sinh viên lo ngại / Free-rider** | Đối tượng nhạy cảm | Lo sợ bị theo dõi đời tư (micromanagement); sợ bị trừ điểm; phản đối việc chia sẻ dữ liệu cá nhân. | **Thấp** | **Trung bình** | **Monitor & Mitigate** (Chính sách Consent) |
| 7 | **Khoa CNTT Kinh doanh UEH** | Đơn vị quản lý học thuật | Sản phẩm ứng dụng thực tế tốt, nâng cao chất lượng học tập nhóm, tuân thủ đạo đức nghiên cứu. | **Thấp** | **Thấp** | **Monitor** (Báo cáo nghiệm thu) |
| 8 | **Nhà cung cấp API (Atlassian)** | Đối tác công nghệ bên ngoài | Ứng dụng tuân thủ Điều khoản sử dụng (ToS), giới hạn rate limit, bảo mật thông tin xác thực OAuth. | **Trung bình** | **Thấp** | **Keep Satisfied** (Tuân thủ API specs) |

---

## 3. MA TRẬN QUYỀN LỰC – MỨC ĐỘ QUAN TÂM (POWER – INTEREST GRID)
* **Nhóm Quyền lực Cao – Quan tâm Cao (Manage Closely):** GV (TS. Nguyễn Mạnh Tuấn), Nhóm PCG, Toàn bộ 6 thành viên nhóm FairShare.
* **Nhóm Quyền lực Cao – Quan tâm Thấp (Keep Satisfied):** Nhà cung cấp nền tảng API (Atlassian Trello, Google Cloud).
* **Nhóm Quyền lực Thấp – Quan tâm Cao (Keep Informed):** Trưởng nhóm và Thành viên sinh viên làm bài nghiêm túc.
* **Nhóm Quyền lực Thấp – Quan tâm Thấp / Tiêu cực (Monitor & Mitigate):** Sinh viên lo ngại bị giám sát, Free-rider, Khoa CNTTKD.

---

## 4. CHIẾN LƯỢC QUẢN TRỊ RỦI RO CHO PHÂN HỆ M2 (WP2)
1. **Rủi ro lo ngại bị theo dõi (Surveillance / Privacy Anxiety):**  
   -> M2 xây dựng màn hình **Consent Policy** bắt buộc, cam kết chỉ đọc tiêu đề task Trello trong bài tập, tuyệt đối không lấy mật khẩu hay đọc tin nhắn riêng tư.
2. **Rủi ro điểm tự động thiếu tin cậy:**  
   -> Kết hợp tự động hóa Trello + Chấm chéo con người (Peer Review đa tiêu chí) + Không gian tự giải trình.
