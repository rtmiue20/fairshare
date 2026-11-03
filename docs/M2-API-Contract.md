# TÀI LIỆU ĐẶC TẢ HỢP ĐỒNG API (API CONTRACT SPECIFICATION)
**Hệ thống:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm  
**Phân hệ:** WP2 – Quản lý Nhóm, Sprint & Cam kết Dữ liệu (Consent)  
**Người phụ trách (PM mini / BA):** Hà Ngọc Thiện (MSSV: 31241021658)  
**Phiên bản:** v1.0 (Chuẩn bị cho cuộc họp chốt API Contract ngày 26/10/2026)  
**Đối tượng sử dụng:** Đội ngũ phát triển FairShare (M1 Nền tảng, M3 Database, M4 Chấm chéo, M5 QA)  

---

## 1. NGUYÊN TẮC THIẾT KẾ & QUY CHUẨN CHUNG

* **Base URL:** `/api`
* **Format:** `application/json; charset=UTF-8`
* **Xác thực (Authentication):** Tất cả các endpoint đều yêu cầu gửi kèm HTTP Header:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
  *(Thông tin User ID và Email của người gọi được trích xuất trực tiếp từ JWT Claims do phân hệ M1 xử lý)*.
* **Cấu trúc phản hồi chuẩn (Standard API Response Envelope):**
  ```json
  {
    "success": true,
    "message": "Thông điệp xử lý thành công",
    "data": { ... },
    "error": null,
    "timestamp": "2026-10-24T22:00:00Z"
  }
  ```
* **Cấu trúc phản hồi lỗi chuẩn (Standard Error Envelope):**
  ```json
  {
    "success": false,
    "message": "Mô tả lỗi dễ hiểu cho người dùng",
    "data": null,
    "error": {
      "code": "ERROR_CODE_STRING",
      "details": [ "Thông tin chi tiết trường lỗi (nếu có)" ]
    },
    "timestamp": "2026-10-24T22:00:00Z"
  }
  ```

---

## 2. DANH MỤC API ENDPOINTS PHÂN HỆ M2

| Method | Endpoint | Mô tả chức năng | Quyền hạn (Role) |
|---|---|---|---|
| `POST` | `/api/teams` | Khởi tạo nhóm đồ án mới | Authenticated User |
| `GET` | `/api/teams` | Lấy danh sách các nhóm user đang tham gia | Authenticated User |
| `GET` | `/api/teams/{teamId}` | Lấy chi tiết nhóm, danh sách thành viên & trạng thái consent | Team Member / Leader |
| `POST` | `/api/teams/{teamId}/members` | Mời thành viên mới vào nhóm qua Email | Leader |
| `POST` | `/api/teams/join` | Tham gia nhóm bằng Mã mời (Invite Code) | Authenticated User |
| `GET` | `/api/teams/{teamId}/consent/status` | Kiểm tra trạng thái Consent của user hiện tại | Team Member |
| `POST` | `/api/teams/{teamId}/consent` | Ký cam kết chia sẻ dữ liệu (Chấp thuận / Từ chối) | Team Member |
| `DELETE`| `/api/teams/{teamId}/consent` | Rút lại cam kết chia sẻ dữ liệu (Revoke Consent) | Team Member |
| `POST` | `/api/teams/{teamId}/sprints` | Tạo Sprint làm việc mới cho nhóm | Leader |
| `GET` | `/api/teams/{teamId}/sprints` | Lấy danh sách các Sprint của nhóm | Team Member / Leader |
| `PUT` | `/api/sprints/{sprintId}/close` | Đóng Sprint hiện tại (Trigger mở đợt chấm chéo cho M4) | Leader |

---

## 3. CHI TIẾT CÁC ENDPOINT (SPECIFICATIONS)

### 3.1. `POST /api/teams` – Khởi tạo nhóm đồ án mới
* **Mục đích:** Người dùng tạo nhóm đồ án mới, trở thành Leader của nhóm và nhận mã mời `inviteCode`.
* **Request Body:**
  ```json
  {
    "name": "Nhóm 07 - Đồ án QLDA CNTT",
    "courseName": "Quản lý dự án Công nghệ Thông tin",
    "description": "Đề tài FairShare - Nền tảng đo lường đóng góp"
  }
  ```
* **Validation Rules:**
  - `name`: Bắt buộc, không được để trống (`@NotBlank`), độ dài từ 3 đến 100 ký tự.
  - `courseName`: Tùy chọn, tối đa 100 ký tự.
  - `description`: Tùy chọn, tối đa 500 ký tự.
* **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Tạo nhóm đồ án thành công",
    "data": {
      "id": 1,
      "name": "Nhóm 07 - Đồ án QLDA CNTT",
      "courseName": "Quản lý dự án Công nghệ Thông tin",
      "description": "Đề tài FairShare - Nền tảng đo lường đóng góp",
      "inviteCode": "FS7QLD",
      "createdAt": "2026-10-24T22:00:00Z",
      "currentRole": "LEADER"
    }
  }
  ```

---

### 3.2. `GET /api/teams` – Lấy danh sách nhóm của người dùng
* **Mục đích:** Hiển thị trên màn hình Trang chủ/Danh sách nhóm của sinh viên.
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Nhóm 07 - Đồ án QLDA CNTT",
        "courseName": "Quản lý dự án CNTT",
        "role": "LEADER",
        "memberCount": 6,
        "hasConsented": true,
        "createdAt": "2026-10-24T22:00:00Z"
      }
    ]
  }
  ```

---

### 3.3. `GET /api/teams/{teamId}` – Lấy chi tiết nhóm & thành viên
* **Mục đích:** Lấy thông tin nhóm, danh sách toàn bộ thành viên và trạng thái cam kết consent của từng người.
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "name": "Nhóm 07 - Đồ án QLDA CNTT",
      "courseName": "Quản lý dự án CNTT",
      "description": "Đề tài FairShare",
      "inviteCode": "FS7QLD",
      "createdAt": "2026-10-24T22:00:00Z",
      "members": [
        {
          "id": 101,
          "userId": 1,
          "fullName": "Nguyễn Văn Minh Triều",
          "email": "trieu.31241027455@st.ueh.edu.vn",
          "role": "LEADER",
          "hasConsented": true,
          "joinedAt": "2026-10-24T22:00:00Z"
        },
        {
          "id": 102,
          "userId": 2,
          "fullName": "Hà Ngọc Thiện",
          "email": "thien.31241021658@st.ueh.edu.vn",
          "role": "MEMBER",
          "hasConsented": true,
          "joinedAt": "2026-10-24T22:05:00Z"
        }
      ]
    }
  }
  ```
* **Mã lỗi:** `404 Not Found` (`TEAM_NOT_FOUND`), `403 Forbidden` (`NOT_TEAM_MEMBER`).

---

### 3.4. `POST /api/teams/{teamId}/members` – Mời thành viên qua Email
* **Mục đích:** Trưởng nhóm gửi lời mời thành viên tham gia nhóm.
* **Request Body:**
  ```json
  {
    "email": "vuong.31241025017@st.ueh.edu.vn"
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Đã thêm thành viên vào nhóm ở trạng thái chờ đồng thuận"
  }
  ```
* **Mã lỗi:**
  - `400 Bad Request` (`INVALID_EMAIL_FORMAT`): Email không đúng định dạng.
  - `404 Not Found` (`USER_NOT_FOUND`): Email chưa đăng ký tài khoản FairShare.
  - `409 Conflict` (`MEMBER_ALREADY_IN_TEAM`): Sinh viên đã là thành viên của nhóm.
  - `403 Forbidden` (`LEADER_PERMISSION_REQUIRED`): Chỉ có Leader mới được mời thành viên.

---

### 3.5. `POST /api/teams/join` – Tham gia nhóm bằng Mã mời
* **Mục đích:** Thành viên tự nhập mã mời 6 ký tự để gia nhập nhóm.
* **Request Body:**
  ```json
  {
    "inviteCode": "FS7QLD"
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Gia nhập nhóm thành công",
    "data": {
      "teamId": 1,
      "teamName": "Nhóm 07 - Đồ án QLDA CNTT",
      "role": "MEMBER",
      "requireConsent": true
    }
  }
  ```
* **Mã lỗi:** `400 Bad Request` (`INVALID_INVITE_CODE`), `409 Conflict` (`ALREADY_MEMBER`).

---

### 3.6. `POST /api/teams/{teamId}/consent` – Ký cam kết chia sẻ dữ liệu
* **Mục đích:** Thành viên xác nhận đồng ý hoặc từ chối chia sẻ dữ liệu Trello.
* **Request Body:**
  ```json
  {
    "consented": true,
    "shareTrelloActivity": true,
    "shareDocsActivity": false
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Cập nhật chính sách đồng thuận dữ liệu thành công",
    "data": {
      "teamId": 1,
      "userId": 2,
      "hasConsented": true,
      "consentedAt": "2026-10-24T22:15:00Z"
    }
  }
  ```

---

### 3.7. `DELETE /api/teams/{teamId}/consent` – Rút lại cam kết đồng thuận
* **Mục đích:** Thành viên thu hồi quyền truy cập và đồng bộ dữ liệu Trello.
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Đã rút lại sự đồng thuận. Hệ thống sẽ ngừng đồng bộ dữ liệu Trello mới."
  }
  ```

---

### 3.8. `POST /api/teams/{teamId}/sprints` – Thiết lập Sprint mới
* **Mục đích:** Trưởng nhóm tạo chu kỳ Sprint cho nhóm.
* **Request Body:**
  ```json
  {
    "name": "Sprint 1 – Phân tích nghiệp vụ & Nền tảng",
    "startDate": "2026-10-14",
    "endDate": "2026-10-20"
  }
  ```
* **Validation Rules:**
  - `name`: Bắt buộc, tối đa 100 ký tự.
  - `startDate`, `endDate`: Định dạng `YYYY-MM-DD`. `endDate` phải sau `startDate`.
* **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Khởi tạo Sprint thành công",
    "data": {
      "id": 1,
      "teamId": 1,
      "name": "Sprint 1 – Phân tích nghiệp vụ & Nền tảng",
      "startDate": "2026-10-14",
      "endDate": "2026-10-20",
      "status": "ACTIVE"
    }
  }
  ```

---

### 3.9. `PUT /api/sprints/{sprintId}/close` – Đóng Sprint (Trigger Chấm chéo M4)
* **Mục đích:** Trưởng nhóm chốt kết quả Sprint hiện tại. Khi gọi API này, hệ thống sẽ chốt điểm số và bắn sự kiện kích hoạt mở đợt chấm chéo đồng đẳng sang phân hệ M4.
* **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Đóng Sprint thành công. Đợt chấm chéo đồng đẳng đã được kích hoạt.",
    "data": {
      "sprintId": 1,
      "status": "COMPLETED",
      "closedAt": "2026-10-24T22:30:00Z",
      "peerReviewRoundId": 105
    }
  }
  ```
* **Mã lỗi:** `400 Bad Request` (`SPRINT_ALREADY_CLOSED`), `403 Forbidden` (`ONLY_LEADER_CAN_CLOSE_SPRINT`).

---

## 4. DANH MỤC MÃ LỖI NGHIỆP VỤ (BUSINESS ERROR CODES)

| Error Code | HTTP Status | Giải thích |
|---|---|---|
| `VALIDATION_FAILED` | 400 Bad Request | Dữ liệu đầu vào vi phạm quy tắc validation |
| `INVALID_INVITE_CODE` | 400 Bad Request | Mã mời không tồn tại hoặc đã hết hạn |
| `INVALID_DATE_RANGE` | 400 Bad Request | Ngày kết thúc sprint phải sau ngày bắt đầu |
| `UNAUTHORIZED` | 401 Unauthorized | Token JWT không hợp lệ hoặc đã hết hạn |
| `FORBIDDEN_ACTION` | 403 Forbidden | Người dùng không có quyền thực hiện thao tác này |
| `LEADER_REQUIRED` | 403 Forbidden | Thao tác chỉ dành riêng cho Trưởng nhóm đồ án |
| `TEAM_NOT_FOUND` | 404 Not Found | Không tìm thấy nhóm đồ án tương ứng với ID |
| `SPRINT_NOT_FOUND` | 404 Not Found | Không tìm thấy sprint tương ứng với ID |
| `MEMBER_ALREADY_EXISTS`| 409 Conflict | Thành viên đã tồn tại trong nhóm |
| `SPRINT_ALREADY_CLOSED`| 409 Conflict | Sprint đã ở trạng thái hoàn thành, không thể đóng lại |

---

## 5. TƯƠNG TÁC LIÊN PHÂN HỆ (INTER-MODULE DEPENDENCIES)

```
[ M1: Auth & JWT ] ----> (userId, token) ----> [ M2: Team & Sprint ]
                                                         |
                                 +-----------------------+-----------------------+
                                 |                                               |
                                 v                                               v
                     [ M3: Contribution ]                            [ M4: Peer Review ]
            (Cung cấp: teamId, sprintId,                    (Khi M2 đóng Sprint,
             danh sách member đã Consent)                    trigger mở ReviewRound)
```

1. **Với M1 (Vương – Auth & Trello):**
   - M2 phụ thuộc vào `User` entity và JWT filter của M1 để xác định danh tính người gọi.
   - Khi worker Trello của M1 đồng bộ, chỉ đồng bộ task của những `userId` có bản ghi `agreed = true` trong bảng `consents` của M2.
2. **Với M3 (Phúc – Contribution & ScoringEngine):**
   - M3 cần query danh sách thành viên tích cực từ `team_members` và thời hạn `start_date`, `end_date` từ `sprints` để gom cụm sự kiện `ActivityEvent`.
3. **Với M4 (Khang – Peer Review):**
   - Khi M2 đóng Sprint (`PUT /api/sprints/{id}/close`), hệ thống kích hoạt tự động `ReviewRound` trong module M4 với `sprint_id` tương ứng.
