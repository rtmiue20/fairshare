# YÊU CẦU THAY ĐỔI (CHANGE REQUEST) – CR-03

**Mã CR:** CR-03  
**Dự án:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm  
**Ngày tạo:** 09/11/2026 (Sprint 4)  
**Người đề xuất:** Hà Ngọc Thiện (M2 – BA) & Ngô Trọng Phúc (M3 – Backend/Scoring)  
**Người phê duyệt:** Nguyễn Văn Minh Triều (M0 – Team Leader)  
**Trạng thái:** ĐÃ ĐỒNG THUẬN & CHỜ PHÊ DUYỆT TẠI SPRINT REVIEW (10/11/2026)  

---

## 1. Bối cảnh & Lý do thay đổi
- Trong Sprint 4, M2 đã thực hiện chạy thử nghiệm thuật toán tính điểm đóng góp FairShare v1.0 trên tập dữ liệu thực tế từ Sprint 1 đến Sprint 3 của 6 thành viên Nhóm 07 (đã có xác nhận Consent đầy đủ theo Nghị định 13/2023/NĐ-CP).
- Qua thu thập phản hồi và phân tích thống kê tại `docs/M2-BaoCao-KiemTra-Cong-Thuc-Sprint4.md`, nhóm nhận diện hai vấn đề trọng yếu:
  1. **Nghịch lý chia nhỏ task (R05):** Trọng số của số lượng thẻ hoàn thành (3.0) đang cao gấp đôi trọng số của Story Points (1.5). Điều này vô tình tạo động cơ khuyến khích thành viên chia nhỏ các tác vụ đơn giản thành nhiều thẻ nhỏ để tối đa hóa điểm số, trong khi các tác vụ lớn và phức tạp (5–8 SP) lại bị đánh giá thấp về số lượng.
  2. **Giải quyết triệt để rủi ro R06 (Công thức bị cho là thiếu công bằng):** Thành viên các mảng Backend/Database và QA/Deployment cảm thấy bị thiệt thòi về số lượng thẻ so với mảng Frontend, đồng thời hệ thống đang thiếu vắng thành tố đánh giá định tính từ đồng đội.
- **Quyết định:** Hiệu chỉnh bộ trọng số nội tại của `ScoringEngine` lên phiên bản v1.1 và chuẩn hóa lộ trình tích hợp công thức tổng hợp 3 thành phần tại Sprint 5.

---

## 2. Chi tiết phạm vi thay đổi

### 2.1. Hiệu chỉnh trọng số nội tại Task Board (ScoringEngine v1.1)
Thay đổi tham số tính toán trong `ScoringEngine.java`:

| Thành tố (Factor) | Trọng số v1.0 (Hiện tại) | Trọng số v1.1 (Đề xuất) | Cơ sở lập luận (Rationale) |
|---|:---:|:---:|---|
| **Story Points (SP)** | **1.5** | **2.5** | Đặt giá trị và độ phức tạp công việc làm trung tâm đánh giá năng suất Agile. |
| **Completed Cards** | **3.0** | **1.5** | Giảm bớt tỷ trọng số lượng thẻ để triệt tiêu hiện tượng chia vụn việc (R05). |
| **On-Time Rate** | **10.0** | **10.0** | Giữ nguyên nhằm duy trì kỷ luật tiến độ cam kết theo Sprint. |
| **Collaboration Count** | **2.0** | **2.0** | Giữ nguyên nhằm khuyến khích trao đổi, thảo luận giải quyết vấn đề. |

Công thức thô sau điều chỉnh:
$$\text{RawScore}_{v1.1} = (\text{StoryPoints} \times 2.5) + (\text{CompletedCards} \times 1.5) + (\text{OnTimeRate} \times 10.0) + (\text{CollaborationCount} \times 2.0)$$

### 2.2. Lộ trình tích hợp Công thức Tổng hợp tại Sprint 5 (Charter Alignment)
Chuẩn hóa giao thức kết nối dữ liệu giữa 3 phân hệ:
1. **Phân hệ Git (M3):** Đo lường số commit hợp lệ, lines of code (đã qua lọc test/generated code) $\rightarrow$ Trọng số **40%**.
2. **Phân hệ Task Board (M1/M3):** Đo lường hiệu suất thực thi công việc theo `ScoringEngine v1.1` $\rightarrow$ Trọng số **40%**.
3. **Phân hệ Chấm chéo Peer Assessment (M4):** Điểm đánh giá ẩn danh từ 5 đồng đội còn lại theo tiêu chí trách nhiệm và chất lượng $\rightarrow$ Trọng số **20%**.

Công thức chỉ số đóng góp chung (Contribution Index - CI):
$$\text{CI} = (\text{Score}_{\text{Git}} \times 0.4) + (\text{Score}_{\text{Board}} \times 0.4) + (\text{Score}_{\text{Peer}} \times 0.2)$$

---

## 3. Đánh giá tác động & Quản lý rủi ro
- **Rủi ro R06 (Công thức bị cho là thiếu công bằng):** Được giải quyết hoàn toàn khi kết hợp giữa định lượng khối lượng (SP), định lượng tiến độ (On-time) và định tính con người (Peer review).
- **Rủi ro R05 (Gian lận dữ liệu):** Triệt tiêu động cơ "cày card rác" do trọng số SP đã chiếm ưu thế vượt trội ($2.5$ so với $1.5$).
- **Tính tương thích hệ thống:** 
  - Thay đổi chỉ diễn ra ở tầng tham số logic tính toán (`ScoringEngine`), không ảnh hưởng đến cấu trúc cơ sở dữ liệu `activity_events` hay cấu trúc DTO hiện hành.
  - Các unit test hiện tại của `ScoringEngineTest` chỉ cần cập nhật lại giá trị kỳ vọng (expected values) theo bộ trọng số mới.

---

## 4. Kế hoạch triển khai
- **Sprint 4 (Hoàn thành):** M2 bàn giao Báo cáo kiểm tra công thức và CR-03.
- **Sprint Review (10/11/2026):** M0 tổ chức biểu quyết thông qua CR-03 trong biên bản họp tuần.
- **Sprint 5 (Thực thi):** M3 cập nhật code `ScoringEngine`, M4 tích hợp module Chấm chéo vào pipeline tổng hợp điểm.
