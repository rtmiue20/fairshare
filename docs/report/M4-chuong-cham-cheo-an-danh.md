# Chương M4 – Chấm chéo ẩn danh

## Phần 1/2 – Nghiệp vụ và thiết kế

### 1. Mục tiêu

Chấm chéo bổ sung góc nhìn của các thành viên về chất lượng công việc, tiến độ và mức độ hợp tác trong từng sprint. Kết quả được dùng làm nguồn tham khảo cho đánh giá đóng góp; hệ thống không công bố danh tính người chấm cùng với điểm số.

Các tiêu chí hiện có:

| Tiêu chí | Ý nghĩa |
|---|---|
| `QUALITY` | Chất lượng công việc |
| `PUNCTUALITY` | Tiến độ và đúng hạn |
| `COOPERATION` | Hợp tác với thành viên |

Mỗi tiêu chí dùng thang điểm từ 1 đến 5. Thành viên không được tự chấm mình; người gửi đánh giá và người được đánh giá phải thuộc cùng nhóm với đợt chấm.

### 2. Vòng đời đợt chấm

Đợt chấm gắn với một sprint và có ba trạng thái:

1. `DRAFT`: trưởng nhóm tạo đợt, cấu hình tên và thời gian.
2. `OPEN`: nhận phiếu đánh giá hợp lệ.
3. `CLOSED`: dừng nhận đánh giá.

Chỉ trưởng nhóm được tạo, mở hoặc đóng đợt. Máy chủ kiểm tra vai trò và trạng thái trước khi lưu phiếu; lỗi quyền quản lý được trả về HTTP 403. Người chấm được xác định từ phiên đăng nhập, không tin cậy `reviewerId` do client gửi.

### 3. Bảo vệ ẩn danh và tổng hợp

Ngưỡng công bố tối thiểu là **3 người chấm khác nhau cho từng người được đánh giá**. Đếm theo định danh người chấm duy nhất, không đếm số tiêu chí hoặc số dòng dữ liệu. Trước khi đạt ngưỡng, API không trả điểm, điểm theo tiêu chí hay nhận xét; chỉ trả trạng thái chưa đủ ngưỡng và số phiếu cần thiết.

Khi đạt ngưỡng:

- Điểm tổng hợp được tính từ các đánh giá hợp lệ và làm tròn hai chữ số thập phân.
- Điểm theo từng tiêu chí được tính riêng; mỗi người chấm chỉ được tính một lần cho mỗi tiêu chí.
- Nhận xét chỉ được trả khi có ít nhất 3 người chấm khác nhau cùng gửi nhận xét; danh sách không kèm định danh người gửi. Nếu chỉ một hoặc hai người viết nhận xét thì nội dung nhận xét tiếp tục bị ẩn.
- API kết quả không trả `reviewerId`, tên, email, mã phiếu cá nhân hoặc thẻ công việc liên kết. Giao diện chỉ hiển thị thẻ tổng hợp ẩn danh và không có nút chuyển sang chế độ công khai danh tính.

Các API đọc dữ liệu chấm chéo xác thực thành viên nhóm. Lịch sử phiếu cá nhân chỉ được xem bởi chính người đã gửi phiếu. Việc này ngăn người ngoài nhóm hoặc thành viên khác truy vấn dữ liệu người chấm theo ID.

### 4. Luồng dữ liệu

1. Client gửi người được đánh giá, điểm theo tiêu chí và nhận xét.
2. Backend lấy người chấm từ thông tin xác thực, xác minh đợt đang mở, quan hệ thành viên, không tự chấm, thang điểm và không gửi trùng tiêu chí.
3. Các phiếu được lưu trong `review_submissions`, liên kết với `review_rounds`, sprint, nhóm và người được đánh giá.
4. Khi đọc kết quả, backend kiểm tra thành viên nhóm, nhóm phiếu theo người được đánh giá, chạy `AnonymityAggregator`, rồi chỉ trả bản tổng hợp đã qua ngưỡng.

## Phần 2/2 – Kiểm thử, xử lý lỗi và giới hạn

### 5. Các lỗi và thay đổi của M4

- **DEF-08/DEF-09:** các lỗi lộ điểm khi thiếu ngưỡng và đếm số phiếu thay vì số người đã được xử lý từ Sprint 5; kiểm tra lại trong hồ sơ tích hợp ngày 10/11.
- **DEF-12:** lỗi người ngoài nhóm đọc kết quả chấm chéo được ghi nhận đã đóng ngày 15/11 sau khi kiểm thử IT-PR-11 đạt.
- **DEF-19:** thành viên thường bị từ chối tạo đợt nhưng trước đây nhận HTTP 400. M4 đổi lỗi phân quyền sang HTTP 403 và bổ sung unit test; focused backend test xác nhận `ForbiddenException`, còn M5 cần retest HTTP status qua tích hợp.
- **Ẩn danh trên API/giao diện:** thay endpoint trả chi tiết từng người chấm bằng bản tổng hợp theo người được đánh giá; khóa nhận dạng người gửi ở giao diện và chỉ công bố điểm khi đủ ngưỡng. API lấy lịch sử cá nhân giới hạn đúng người gửi; endpoint đọc kết quả và danh sách đợt kiểm tra thành viên nhóm.
- **Chống giả mạo người chấm:** backend từ chối `reviewerId` không trùng người dùng xác thực; giao diện không còn gửi ID người chấm trong payload.

### 6. Bằng chứng kiểm thử có trong dự án

| Nguồn | Kết quả được ghi nhận | Diễn giải |
|---|---|---|
| `docs/qa/defect-log.md` | DEF-08/09 đạt ngày 10/11; DEF-12 đạt ngày 15/11 | Bằng chứng xử lý các lỗi ẩn danh và phân quyền đã biết |
| `docs/report/M5-chuong-kiem-thu-trien-khai.md` | Bộ kiểm thử tích hợp đạt 23/23 ngày 15/11 | Kết quả hồi quy theo báo cáo M5 trước các thay đổi M4 hiện tại |
| `docs/qa/uat/uat-pilot-2026-11-16.txt` và `docs/qa/uat/uat-pilot-report.md` | Pilot mới nhất đạt 20/24 ca (bản 15/11 đạt 14/24); UAT-PR-01/02 kiểm tra đủ ngưỡng và dưới ngưỡng | Chạy trên `master` trước thay đổi M4 hiện tại; là pilot nội bộ, **không phải** UAT chính thức của tối thiểu 10 người |
| `AnonymityAggregatorTest` | 6/6 test pass: dưới ngưỡng, đủ ngưỡng, người chấm trùng, ngưỡng cấu hình thấp hơn 3 và số người nhận xét | Chạy focused Maven suite trên mã M4 |
| `PeerReviewServiceTest`, `PeerReviewControllerTest` | 13/13 test pass: quyền thành viên, dữ liệu tổng hợp dưới ngưỡng, reviewee ngoài nhóm và chống giả `reviewerId` | Chạy focused Maven suite trên mã M4; tổng backend suite 19/19 |
| Frontend Vitest | 89/89 test pass trên 20 tệp | Chạy `npm run test:ci` |

### 7. Giới hạn và hướng xử lý

- Ngưỡng 3 giảm khả năng suy ra người chấm nhưng không loại bỏ hoàn toàn suy luận từ nội dung nhận xét, thời điểm gửi hoặc thông tin bên ngoài. Không nên đưa dữ liệu nhận dạng vào nhận xét.
- Nhóm ít hơn 4 thành viên có thể không bao giờ đạt đủ 3 người chấm cho một thành viên; kết quả của người đó sẽ tiếp tục bị ẩn. Không hạ ngưỡng để đổi lấy việc công bố điểm.
- Pilot UAT ngày 16/11 (20/24) không thay thế UAT chính thức. M2/M5 cần ghi nhận riêng phiếu hợp lệ và tổng hợp mức hài lòng trước khi kết luận mục tiêu G5.
- Trạng thái `Fixed – chờ retest` chỉ chuyển sang `Closed` sau khi M5 chạy lại ca DEF-19 và xác nhận HTTP 403 cùng các ca hồi quy ẩn danh/phân quyền.

### 8. Tệp tham chiếu

- [Defect log](../qa/defect-log.md)
- [Báo cáo pilot UAT](../qa/uat/uat-pilot-report.md)
- [Kết quả pilot UAT 16/11](../qa/uat/uat-pilot-2026-11-16.txt)
- [Kịch bản UAT](../M2-UAT-Scenarios.md)
- [User guide – chấm chéo ẩn danh](../deploy/user-guide.md)
- [Báo cáo kiểm thử và triển khai M5](./M5-chuong-kiem-thu-trien-khai.md)
