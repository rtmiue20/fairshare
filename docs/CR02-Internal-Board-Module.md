# YÊU CẦU THAY ĐỔI (CHANGE REQUEST) – CR-02

**Mã CR:** CR-02  
**Dự án:** FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm  
**Ngày tạo:** 29/10/2026 (Sprint 3)  
**Người đề xuất:** Nguyễn Văn Minh Triều (M0 - PM hệ thống) & Nguyễn Phúc Vương (M1 - Backend/API)  
**Trạng thái:** CẦN PHÊ DUYỆT & HOÀN THÀNH

---

## 1. Bối cảnh & Lý do thay đổi
- Kế hoạch ban đầu sử dụng Trello REST API để đồng bộ danh sách bảng, cột, thẻ và hành động của thành viên.
- Qua quá trình spike kỹ thuật ở Sprint 2, Trello API bộc lộ các hạn chế:
  1. Phụ thuộc dịch vụ bên thứ ba và kết nối mạng ngoài.
  2. Rate limit nghiêm ngặt của Trello hạn chế tần suất đồng bộ thời gian thực.
  3. Khó khăn trong việc kiểm soát tính bất biến của dữ liệu và truy vết sự kiện chống gian lận (người dùng có thể xóa lịch sử hoặc sửa card ngoài hệ thống).
- **Quyết định:** Chuyển sang tự xây dựng phân hệ **Task Board nội bộ** (gồm bảng, cột và thẻ) thay thế Trello API.

---

## 2. Chi tiết phạm vi thay đổi

### 2.1. Cơ sở dữ liệu (Database)
- Bổ sung Flyway migration `V10__create_boards_and_cards.sql`:
  - `boards`: Lưu thông tin bảng công việc gắn với `teams`.
  - `board_columns`: Các cột trạng thái Kanban (`To Do`, `In Progress`, `Review`, `Done`...).
  - `cards`: Công việc chi tiết, người phụ trách (`assignee_id`), Story Points (`story_points`), hạn chót (`due_date`) và vị trí sắp xếp.
- Bổ sung `ActivitySource.BOARD` vào danh mục nguồn dữ liệu.

### 2.2. Backend (Spring Boot)
- Tạo package `com.fairshare.board`:
  - Entities: `Board`, `BoardColumn`, `Card`.
  - Repositories: `BoardRepository`, `BoardColumnRepository`, `CardRepository`.
  - Services: `BoardService` thực hiện toàn bộ nghiệp vụ CRUD bảng, cột, thẻ.
  - **Cơ chế ghi nhận sự kiện:** Khi tạo thẻ hoặc di chuyển thẻ giữa các cột, tự động ghi vào `activity_events` với nguồn `BOARD`, loại sự kiện `CARD_CREATED` hoặc `CARD_MOVED` / `CARD_COMPLETED`, ghi nhận độ trễ (`delay_days`) và đúng hạn (`is_on_time`).
  - Endpoints REST API `/api/boards`: Đầy đủ API tạo bảng, cột, thẻ và di chuyển thẻ.

### 2.3. Frontend (React + Vite)
- Thêm `BoardView.tsx`: Giao diện Kanban trực quan, hiện đại, cho phép thêm thẻ, phân công thành viên, gán Story Points và di chuyển thẻ giữa các cột.
- Thêm `board.api.ts`: API client kết nối trực tiếp với backend `/api/boards`.
- Cập nhật điều hướng tại `TeamDetailPage.tsx` và `router.tsx` (`/teams/:id/board`).

---

## 3. Đánh giá tác động & Quản lý rủi ro
- **Rủi ro R02 (Phụ thuộc API ngoài):** Đã được giải quyết triệt để do hệ thống làm chủ hoàn toàn dữ liệu.
- **Rủi ro R19 (Khối lượng công việc M1):** Đã phân rã và hoàn thành khung cơ bản trong Sprint 3; phần kéo thả nâng cao tiếp tục hoàn thiện ở Sprint 4.
- **Tính tương thích:** Dữ liệu sinh ra từ `Board` hoàn toàn tương thích với mô hình `ActivityEvent` và thuật toán `ScoringEngine` v1 của M3.
