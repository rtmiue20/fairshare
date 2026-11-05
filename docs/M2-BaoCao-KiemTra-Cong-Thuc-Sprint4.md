# BÁO CÁO KIỂM TRA CÔNG THỨC TÍNH ĐIỂM ĐÓNG GÓP FAIRSHARE V1.0 (SPRINT 4)

**Dự án:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm (QLDA CNTT - UEH)  
**Tác giả:** Hà Ngọc Thiện (M2 – PM Phân tích nghiệp vụ / BA)  
**Phối hợp:** Ngô Trọng Phúc (M3 – Backend/Scoring Engine), Nguyễn Văn Minh Triều (M0 – Team Leader)  
**Thời gian thực hiện:** 07/11/2026 – 09/11/2026 (Sprint 4)  
**Đối tượng kiểm thử:** Dữ liệu thực tế Sprint 1, 2, 3 của Nhóm 07  
**Cơ sở pháp lý & đạo đức dữ liệu:** Nghị định 13/2023/NĐ-CP (Đã thu thập 100% Consent từ 6 thành viên)

---

## 1. Mục tiêu kiểm tra
1. Đánh giá tính khả thi, độ chính xác và mức độ công bằng của thuật toán `ScoringEngine` v1.0 khi áp dụng vào dữ liệu làm việc thực tế của 6 sinh viên Nhóm 07.
2. Kiểm tra phản ứng và mức độ đồng thuận của các thành viên đối với kết quả tính toán tự động.
3. Nhận diện các kẽ hở thuật toán (gaming the system / gian lận điểm) và giải quyết rủi ro **R06 (Công thức bị cho là thiếu công bằng)** đã xác định trong Kế hoạch Sprint 4.
4. Đề xuất phương án tinh chỉnh công thức và lập Đề xuất Thay đổi (Change Request CR-03).

---

## 2. Dữ liệu thực nghiệm & Trạng thái Chấp thuận (Consent)
Trước khi đưa dữ liệu vào thuật toán, M2 đã kích hoạt quy trình Consent Policy theo chuẩn NĐ 13/2023/NĐ-CP, ghi nhận sự đồng thuận đầy đủ của 6 thành viên:

| STT | Họ và tên | MSSV / Email | Vai trò | Trạng thái Consent |
|---|---|---|---|:---:|
| 1 | Nguyễn Văn Minh Triều | `trieu.31241027455@st.ueh.edu.vn` | M0 – Leader / PM Chung | ĐÃ KÝ (15/10/2026) |
| 2 | Hà Ngọc Thiện | `thien.31241021658@st.ueh.edu.vn` | M2 – BA / Frontend 2 | ĐÃ KÝ (15/10/2026) |
| 3 | Nguyễn Phúc Vương | `vuong.31241025017@st.ueh.edu.vn` | M1 – Frontend 1 / Board | ĐÃ KÝ (15/10/2026) |
| 4 | Ngô Trọng Phúc | `phuc.31241020074@st.ueh.edu.vn` | M3 – Backend 1 / Scoring | ĐÃ KÝ (15/10/2026) |
| 5 | Triệu Nguyễn Huỳnh Khang | `khang.31241022785@st.ueh.edu.vn` | M4 – Backend 2 / Data | ĐÃ KÝ (15/10/2026) |
| 6 | Khiếu Hoàng Nam Anh | `namanh.31241022203@st.ueh.edu.vn` | M5 – QA & Deployment | ĐÃ KÝ (15/10/2026) |

---

## 3. Thuật toán FairShare v1.0 hiện tại (Code-based)
Dựa trên hiện thực tại `com.fairshare.contribution.service.ScoringEngine`:

$$\text{RawScore} = (\text{StoryPoints} \times 1.5) + (\text{CompletedCards} \times 3.0) + (\text{OnTimeRate} \times 10.0) + (\text{CollaborationCount} \times 2.0)$$

- **Story Points (SP):** Đo lường khối lượng & độ phức tạp công việc.
- **Completed Cards:** Số lượng thẻ công việc đã hoàn thành (Done).
- **On-time Rate:** Tỷ lệ công việc hoàn thành trước hoặc đúng hạn chót (từ $0.0$ đến $1.0$).
- **Collaboration Count:** Số lượt tương tác, thảo luận, comment giải quyết vấn đề hoặc review.
- **Chuẩn hóa tỷ lệ:** $\text{Contribution Percentage} = \frac{\text{RawScore}_i}{\sum \text{RawScore}} \times 100\%$
- **Điểm thang 10:** $\text{Score}_{10} = \min(10.0, \text{Contribution Percentage} \times 0.1 \times N)$

---

## 4. Kết quả chạy thử nghiệm trên dữ liệu Sprint 1 – 3

### 4.1. Bảng số liệu đầu vào (Input Metrics)
*Tổng hợp từ Git Log, Kanban Board nội bộ và tài liệu phân tích nghiệp vụ của Nhóm 07:*

| Thành viên | Story Points (SP) | Thẻ hoàn thành | Tỷ lệ đúng hạn | Lượt tương tác |
|---|:---:|:---:|:---:|:---:|
| Nguyễn Văn Minh Triều (M0) | 18 | 7 | 100% (1.0) | 14 |
| Hà Ngọc Thiện (M2) | 16 | 6 | 100% (1.0) | 12 |
| Nguyễn Phúc Vương (M1) | 19 | 6 | 85% (0.85) | 11 |
| Ngô Trọng Phúc (M3) | 17 | 6 | 100% (1.0) | 13 |
| Triệu Nguyễn Huỳnh Khang (M4) | 15 | 5 | 100% (1.0) | 9 |
| Khiếu Hoàng Nam Anh (M5) | 15 | 5 | 100% (1.0) | 10 |
| **Tổng cộng** | **100** | **35** | **-** | **69** |

### 4.2. Kết quả tính toán từ `ScoringEngine`

| Thành viên | Điểm SP ($\times 1.5$) | Điểm Thẻ ($\times 3.0$) | Điểm Hạn ($\times 10$) | Điểm Tác ($\times 2.0$) | Điểm thô (Raw) | Tỷ lệ (%) | Điểm Thang 10 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Triều (M0) | 27.0 | 21.0 | 10.0 | 28.0 | **86.0** | 18.03% | 10.0 |
| Thiện (M2) | 24.0 | 18.0 | 10.0 | 24.0 | **76.0** | 15.93% | 9.56 |
| Vương (M1) | 28.5 | 18.0 | 8.5 | 22.0 | **77.0** | 16.14% | 9.68 |
| Phúc (M3) | 25.5 | 18.0 | 10.0 | 26.0 | **79.5** | 16.67% | 10.0 |
| Khang (M4) | 22.5 | 15.0 | 10.0 | 18.0 | **65.5** | 13.73% | 8.24 |
| Nam Anh (M5) | 22.5 | 15.0 | 10.0 | 20.0 | **67.5** | 14.15% | 8.49 |
| **Tổng** | **150.0** | **105.0** | **58.5** | **138.0** | **477.0** | **100.0%** | **-** |

---

## 5. Tổng hợp phản hồi từ thành viên (Member Survey)

M2 đã tổ chức phỏng vấn nhanh và gửi phiếu khảo sát trực tuyến đến từng thành viên sau khi công bố kết quả tính thử:

1. **Nguyễn Phúc Vương (M1):**
   > *"Sprint 3 mình ôm task làm toàn bộ module Board nội bộ và kéo thả (task nặng 8 SP). Do task quá lớn và phụ thuộc vào API backend, mình bị trễ deadline 1 buổi nên tỷ lệ đúng hạn giảm xuống 85%, kéo điểm tổng xuống. Trong khi đó, nếu một bạn chia 1 việc 8 SP ra làm 4 việc 2 SP nhỏ thì vừa dễ đúng hạn, vừa được cộng tận 12 điểm Thẻ hoàn thành (4 x 3.0). Trọng số thẻ 3.0 đang quá cao so với trọng số Story Points 1.5."*
2. **Ngô Trọng Phúc (M3):**
   > *"Đồng ý với Vương. Mục tiêu của Agile là khuyến khích hoàn thành giá trị công việc (Story Points). Nếu điểm số lượng thẻ (3.0) cao gấp đôi Story Point (1.5) thì sẽ sinh ra hiện tượng gian lận R05 (chia nhỏ thẻ để cày điểm). Nên tăng trọng số Story Points lên 2.5 hoặc 3.0 và giảm trọng số số lượng thẻ xuống 1.5."*
3. **Triệu Nguyễn Huỳnh Khang (M4):**
   > *"Các công việc Backend và Database như thiết kế ERD, viết trigger, tối ưu index thường ít khi tạo nhiều card lẻ tẻ. Nếu chỉ nhìn vào số lượng card thì backend/data bị thiệt thòi so với frontend vốn hay chia nhỏ giao diện."*
4. **Khiếu Hoàng Nam Anh (M5):**
   > *"Công tác QA/QC và viết tài liệu test log, dựng môi trường staging cần có sự ghi nhận về chất lượng. Ngoài ra, cần sớm tích hợp module Chấm chéo (Peer Review) ở Sprint 5 để các thành viên đánh giá thái độ trách nhiệm và tinh thần hợp tác của nhau."*
5. **Nguyễn Văn Minh Triều (M0):**
   > *"Mô hình v1.0 phản ánh khá sát năng suất làm việc, sự chênh lệch giữa các thành viên ở mức chấp nhận được (từ 13.7% đến 18.0%). Tuy nhiên, để đúng với Project Charter ban đầu, công thức cuối cùng phải tích hợp 3 trụ cột: Git (40%) + Task Board (40%) + Chấm chéo ẩn danh (20%)."*

---

## 6. Phân tích kẽ hở & Kiến nghị điều chỉnh (R06 & R05)

### 6.1. Nhận diện bất cập thuật toán v1.0
- **Bất cập 1 (Trọng số Story Points < Số lượng thẻ):** Tạo động cơ xấu khiến sinh viên có xu hướng "chẻ nhỏ công việc đơn giản" thành hàng loạt card rác để tối đa hóa điểm hoàn thành thẻ.
- **Bất cập 2 (Đúng hạn nhị phân):** Chưa phân biệt giữa trễ 1 vài giờ do yếu tố kỹ thuật khách quan so với bỏ bê công việc nhiều ngày.
- **Bất cập 3 (Chưa có yếu tố đánh giá định tính):** Toàn bộ v1.0 là định lượng máy móc, chưa phản ánh tinh thần hỗ trợ đồng đội và chất lượng giải pháp.

### 6.2. Kiến nghị điều chỉnh sang phiên bản FairShare v1.1
1. **Điều chỉnh trọng số nội tại của Task Board (M3):**
   - Tăng trọng số `Story Points` từ **1.5 $\rightarrow$ 2.5**.
   - Giảm trọng số `Completed Cards` từ **3.0 $\rightarrow$ 1.5** (chỉ mang tính khích lệ dứt điểm task).
   - Giữ nguyên `On-time Rate` (**10.0**) và `Collaboration` (**2.0**).
2. **Kế hoạch tích hợp Sprint 5 (M0 & M4):**
   - Kết nối module Chấm chéo (Peer Review) của M4 vào Sprint 5 để tạo thành công thức tổng hợp:
     $$\text{FinalScore} = (\text{GitContribution} \times 0.4) + (\text{TaskBoardContribution} \times 0.4) + (\text{PeerReviewScore} \times 0.2)$$
3. **Lập Change Request:**
   - M2 lập tài liệu `CR03-Dieu-Chinh-Cong-Thuc-Dong-Gop.md` trình Team Leader và cả nhóm thông qua trong buổi Sprint Review ngày 10/11.

---
**Người lập báo cáo:**  
*Hà Ngọc Thiện (M2 – PM Phân tích nghiệp vụ)*
