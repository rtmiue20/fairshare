# Chốt defect log khi đóng UAT – Sprint 6

**Soạn:** M5 – Khiếu Hoàng Nam Anh · **Bản:** cập nhật 18/11/2026 11:30 (GMT+7) sau khi M2 đóng UAT (17/11); nháp đầu 16/11 23:45
**Số liệu:** `docs/qa/defect-log.md` cập nhật 16/11, retest trên `master` @ `f18a705`
**Người quyết định chấp nhận rủi ro:** M0 – Nguyễn Văn Minh Triều (PM tổng)

> Thẻ "17/11 – Chốt defect log khi đóng UAT" chỉ hoàn thành khi mọi lỗi High đã Closed, **hoặc** M0 đồng ý chấp nhận rủi ro cho từng lỗi High còn mở ở mục 3.

## 1. Tổng kết lỗi (16/11)

| Mức độ | Open | Closed | Rejected | Tổng |
|---|---|---|---|---|
| High | 3 (DEF-31, 40, 41) | 12 | 0 | 15 |
| Medium | 1 (DEF-32) | 10 | 0 | 11 |
| Low | 4 (DEF-19, 28, 39, 42) | 11 | 1 (DEF-29) | 16 |
| **Tổng** | **8** | **33** | **1** | **42** |

Lỗi từ UAT chính thức (M2 báo 17/11, ghi 18/11): **DEF-43 (High, M3)** `GET /api/contributions/evidence` trả HTTP 500 trên bản Render, Audit Trail trống; **DEF-44 (Low, M3)** chuông thông báo không mở popover. Bản sửa của M3 ở nhánh `TrongPhuc` (`f252482`), chưa merge `master`. Sau UAT: High **4** mở (DEF-31, 40, 41, 43), tổng **10** mở / **44** lỗi.

## 2. Lỗi High còn mở

| Mã | Mô tả ngắn | Người xử lý | Bằng chứng 16/11 |
|---|---|---|---|
| DEF-31 | API khai báo đóng góp không xác thực người gọi: khai báo đứng tên người khác, tự duyệt, người ngoài nhóm duyệt | M3 | UAT-SEC-04, 05, 06 FAIL |
| DEF-40 | Migration V23, V25 chèn 6 tài khoản demo có mật khẩu công khai và ghi đè/xóa dữ liệu nhóm id 1 ở mọi CSDL (V25 còn xóa toàn bộ `contribution_scores`) | M0 (+ M4 xác nhận phần chấm chéo) | RT-40a, b, c FAIL |
| DEF-41 | Người phụ trách kéo thẻ của mình qua lại giữa các cột để tự nâng tỷ lệ đóng góp (50% → 91,67%) | M1 + M3 | RT-41a, b FAIL |
| DEF-43 | `GET /api/contributions/evidence` trả HTTP 500, Audit Trail trên Dashboard trống (mới 18/11, từ UAT) | M3 | M2 báo trên bản Render 17/11; bản sửa `f252482` chưa merge, chưa retest |

## 3. Đề xuất chấp nhận rủi ro (nếu không sửa kịp trước release 18/11)

### DEF-31 – Khai báo đóng góp giả danh / tự duyệt

| | |
|---|---|
| Ảnh hưởng | Sai yêu cầu chống gian lận (R05). Ai cũng có thể ghi đóng góp cho người khác hoặc tự duyệt, làm sai tỷ lệ đóng góp và minh chứng. Chỉ xảy ra khi dùng chức năng Khai báo đóng góp; luồng board, chấm chéo, PDF không bị ảnh hưởng |
| Cách né khi demo/UAT | Không dùng chức năng Khai báo đóng góp. Dữ liệu demo (`demo-seed.py`) không tạo khai báo nào. Nếu giảng viên hỏi: trình bày đây là lỗi đã biết, có ca kiểm thử tự động tái hiện (`uat-pilot.py` UAT-SEC-04..06) |
| Điều kiện kèm theo | Ghi vào release notes mục "Lỗi còn tồn tại"; M3 sửa trong Sprint 7; M5 retest bằng `uat-pilot.py` |
| Quyết định của M0 | ☐ Chấp nhận rủi ro ☐ Không chấp nhận (phải sửa trước release) · Ngày: ____ |

### DEF-40 – Migration seed tài khoản demo và ghi đè dữ liệu thật

| | |
|---|---|
| Ảnh hưởng | Mọi CSDL chạy Flyway (dev, staging, demo, production) có 6 tài khoản đăng nhập được bằng mật khẩu công khai trong repo (CSDL mới; CSDL cũ thì người dùng id 1 bị đổi tên). Nhóm id 1 (nhóm thật đầu tiên) bị đổi tên, đổi vai trò thành viên, đổi người phụ trách thẻ; phiếu chấm chéo của đợt 2, 3 bị xóa; V25 (master `be7e441`) xóa toàn bộ điểm đóng góp đã tính (`DELETE FROM contribution_scores`). Với bản demo dựng mới thì nhóm id 1 là nhóm demo, nên không mất dữ liệu thật |
| Cách né khi demo/UAT | Dựng CSDL mới (`staging-up.sh reset`), rồi khóa 6 tài khoản demo bằng lệnh ở `docs/deploy/demo-checklist.md` bước 4 (đã chạy thử 16/11: đăng nhập trả 401). Demo bằng tài khoản `demo01..05` của `demo-seed.py`, không dùng nhóm id 1 |
| Điều kiện kèm theo | **Không chấp nhận cho bản phát hành chính thức** (tag v1.0.0) nếu nhóm định cho người ngoài dùng: M0 tạo migration mới gỡ dữ liệu demo trước khi gắn tag. Chấp nhận tạm thời chỉ cho buổi demo trên máy M5 |
| Quyết định của M0 | ☐ Sửa trước tag ☐ Chấp nhận tạm cho demo, sửa Sprint 7 · Ngày: ____ |

### DEF-41 – Kéo thẻ qua lại tự nâng tỷ lệ đóng góp

| | |
|---|---|
| Ảnh hưởng | Sai yêu cầu cốt lõi "đo đóng góp minh bạch" (R05). Thành viên có thể đẩy tỷ lệ của mình lên gần gấp đôi mà không hoàn thành việc. Số liệu đóng góp của đợt UAT có thể bị lệch nếu người thử kéo qua lại |
| Cách né khi demo/UAT | Chỉ kéo thẻ một chiều (To Do → In Progress → Review → Done). Hướng dẫn đã ghi trong `uat-handoff-M2.md` mục 3 và `demo-checklist.md` mục 6. Khi đọc kết quả UAT, M5 lọc người thử có số `CARD_MOVED` bất thường trước khi tính G5 |
| Điều kiện kèm theo | Ghi vào release notes; M1 + M3 sửa trong Sprint 7 (đề xuất: `CARD_MOVED` không mang story points); M5 retest bằng `retest-sprint6.py` RT-41a, b |
| Quyết định của M0 | ☐ Chấp nhận rủi ro ☐ Không chấp nhận · Ngày: ____ |

## 4. Lỗi Medium/Low còn mở (không chặn đóng UAT)

| Mã | Mức | Người | Cách né |
|---|---|---|---|
| DEF-32 | Medium | M3 | Người ngoài nhóm xem được khai báo đóng góp. Dữ liệu demo không có khai báo |
| DEF-19 | Low | M4 | Thông báo lỗi 400 thay vì 403. Không ảnh hưởng chức năng |
| DEF-28 | Low | M0 | 2 ảnh upload trong repo. `.gitignore` đã chặn từ 16/11 |
| DEF-39 | Low | M0 | Số liệu mẫu cứng trên Dashboard/Lịch. Báo trước khi demo |
| DEF-42 | Low | M1 | Không đổi tên thẻ đã được review |

## 5. Kết luận (điền 17/11)

- **UAT chính thức** (M2, đóng 17/11, bản Render `deploy/render` @ `29945fe`): **10 phiếu hợp lệ** (1 Leader, 9 Member), đạt chỉ tiêu số lượng. **SUS 47,0/100** (ngưỡng 75) và **CSAT 60%** chọn 4–5 (ngưỡng G5 80%, trung bình 3,5/5): **G5 chưa đạt**. M5 tính lại từ `uat-responses-2026-11-17.csv`, khớp báo cáo của M2.
- **Lỗi mới:** 2 (DEF-43 High, DEF-44 Low), cùng thuộc M3.
- **Lỗi High:** 4 còn mở (DEF-31, 40, 41, 43), chưa có bản sửa nào trên `master` tính đến 18/11 11:30. Chưa retest lại sau 16/11.
- **Rủi ro mới:** UAT chạy trên Render chứ không chạy trên môi trường UAT của M5. CSDL Render nhiều khả năng có 6 tài khoản demo với mật khẩu công khai (DEF-40, nhánh có V23–V25), và M5 không lọc được dữ liệu kéo thẻ bất thường (DEF-41).
- **Quyết định của M0:** `<chờ M0: chấp nhận rủi ro hay sửa trước release cho DEF-31, 40, 41, 43>`
- **Kết luận của M5:** đợt UAT **đã đóng về mặt thu phiếu**. Theo DoD Sprint 6, defect log **chưa chốt được**: còn 4 lỗi High mở và chưa có quyết định chấp nhận rủi ro. M5 đề nghị M0 quyết định trước giờ khóa phạm vi 18/11 17:00; nếu chấp nhận rủi ro, demo dùng các cách né ở mục 3 và tránh mục Audit Trail cho tới khi DEF-43 được sửa.
