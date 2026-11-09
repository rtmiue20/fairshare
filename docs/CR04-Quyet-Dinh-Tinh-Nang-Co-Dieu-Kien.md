# YÊU CẦU THAY ĐỔI (CHANGE REQUEST) – CR-04

**Mã CR:** CR-04  
**Dự án:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm  
**Ngày tạo:** 09/11/2026 (Sprint 4 – Mốc chốt tính năng có điều kiện)  
**Người đề xuất:** Nguyễn Văn Minh Triều (M0 – Team Leader)  
**Người tham vấn:** Toàn bộ nhóm 07 (M1, M2, M3, M4, M5)  
**Trạng thái:** ĐÃ THỐNG NHẤT TẠI HỌP NHÓM TỐI 09/11/2026 – TRÌNH PHÊ DUYỆT TẠI SPRINT REVIEW (10/11/2026)  

---

## 1. Bối cảnh & Mục đích
Theo Kế hoạch Dự án (`plan-PM.md` mục 1.3 và `docs/sprint4.md`), ngày **09/11/2026** là mốc bắt buộc cả nhóm phải họp để đánh giá nguồn lực thực tế (buffer time, velocity) và đưa ra quyết định dứt khoát đối với **2 tính năng có điều kiện (Conditional Features)**:
1. **Tích hợp Google Docs:** Đo lường số lần chỉnh sửa/revision theo người dùng.
2. **Cảnh báo sớm khi thành viên không hoạt động (Early Inactivity Alert):** Phát hiện nguy cơ trễ hạn / free-rider.

Căn cứ vào tiến độ thực tế cuối Sprint 4 và đánh giá rủi ro kỹ thuật, Leader và nhóm thống nhất ban hành CR-04 nhằm tối ưu hóa nguồn lực cho Sprint 5 và Sprint 6 (UAT).

---

## 2. Quyết định chi tiết

### 2.1. TÍNH NĂNG 1: TÍCH HỢP GOOGLE DOCS (REVISION TRACKING)
- **Quyết định:** ❌ **LOẠI BỎ (DROP / OUT OF SCOPE)**
- **Lý do & Cơ sở thực tiễn:**
  1. **Rào cản xác thực & hạ tầng:** Google Drive / Docs API đòi hỏi cấu hình OAuth2 Client và màn hình xác thực Consent Screen. Ở chế độ Testing, số lượng test user bị giới hạn nghiêm ngặt và yêu cầu cấu hình token phức tạp cho từng sinh viên thử nghiệm, không phù hợp với mục tiêu triển khai demo nhẹ nhàng (chi phí 0 đồng).
  2. **Dữ liệu phân mảnh:** Đồ án nhóm của sinh viên thường lưu trữ tài liệu hỗn hợp (Word, PDF, Google Slides, Google Docs cá nhân), việc chỉ quét được Google Docs không phản ánh toàn diện đóng góp tài liệu mà lại dễ gây thiên lệch điểm số.
  3. **Đã có giải pháp thay thế tốt hơn:** Phân hệ **Task Board nội bộ (CR-02)** và **Phân hệ Khai báo đóng góp thủ công có đồng thuận (M3)** đã ghi nhận đầy đủ các đầu việc viết báo cáo, nghiên cứu tài liệu với sự kiểm chứng của nhóm.
- **Tác động:** Giảm thiểu 100% rủi ro phụ thuộc API ngoài Google và giải phóng M1 khỏi áp lực tích hợp ở Sprint 5.

### 2.2. TÍNH NĂNG 2: CẢNH BÁO SỚM THÀNH VIÊN KHÔNG HOẠT ĐỘNG (RULE-BASED ALERT)
- **Quyết định:** ✅ **GIỮ LẠI (KEEP) & ĐƯA VÀO SPRINT 5 (MVP NÂNG CAO)**
- **Lý do & Giá trị mang lại:**
  1. **Giải quyết đúng Pain-Point cốt lõi:** Báo cáo khảo sát (`BA-BaoCaoKhaoSat-PainPoints.md`) chỉ ra rằng 85% nhóm sinh viên gặp tình trạng thành viên "mất tích" hoặc dồn việc vào sát deadline. Cảnh báo sớm giúp Leader can thiệp kịp thời trước khi quá muộn.
  2. **Tính khả thi kỹ thuật cao:** Sau khi đã có sẵn bảng `activity_events` và `cards` trong cơ sở dữ liệu nội bộ, logic cảnh báo hoàn toàn thuần túy là **rule-based nội bộ** (không phụ thuộc bất kỳ API bên thứ ba nào).
- **Quy tắc cảnh báo thiết kế (Rule-based Matrix):**
  - **Mức Vàng (Warning):** Thành viên không có bất kỳ hành động nào (`ActivityEvent`) trong vòng **3 ngày liên tiếp** trong một Sprint đang chạy.
  - **Mức Đỏ (Critical):** Thành viên có thẻ công việc đang ở trạng thái `In Progress` đã quá hạn chót (`due_date`) trên **2 ngày** hoặc tỷ lệ đúng hạn (`on_time_rate`) dưới **50%**.
- **Kế hoạch phân công:** Giao M4 (Triệu Nguyễn Huỳnh Khang) hoàn thiện cùng module `alert` và `peerreview` trong Sprint 5.

---

## 3. Đánh giá tác động đến Kế hoạch & Rủi ro

| Tiêu chí | Trước CR-04 | Sau CR-04 | Đánh giá tác động |
|---|---|---|---|
| **Khối lượng công việc Sprint 5** | Phải gánh cả Google Docs API + Alert | Chỉ làm Alert rule-based nhẹ nhàng | **Tích cực:** Giảm tải áp lực cho M1 & nhóm, tập trung 100% vào Chấm chéo ẩn danh và Báo cáo PDF. |
| **Rủi ro R02 (Phụ thuộc bên thứ ba)** | Còn tiềm ẩn từ Google API | Loại bỏ hoàn toàn 100% | **Triệt tiêu rủi ro R02.** Hệ thống hoàn toàn độc lập và tự chủ. |
| **Thời hạn hoàn thành (Schedule)** | Nguy cơ trễ hạn Sprint 5 và UAT | Đảm bảo đúng mốc Code freeze (16/11) | **An toàn tuyệt đối** cho các mốc nộp bài môn học. |

---

## 4. Kế hoạch hành động tiếp theo
1. **Sprint Review (10/11/2026):** M0 báo cáo quyết định CR-04 trước toàn nhóm và ghi vào biên bản họp tuần.
2. **Cập nhật Backlog Sprint 5:** 
   - Đưa User Story "Cảnh báo sớm thành viên không hoạt động theo luật" vào Sprint 5 Backlog cho M4.
   - Gỡ bỏ vĩnh viễn các task liên quan đến Google Docs khỏi WBS và Gantt chart.
3. **Cập nhật tài liệu liên quan:** M0 rà soát cập nhật `plan-PM.md` và `docs/sprint5.md`.
