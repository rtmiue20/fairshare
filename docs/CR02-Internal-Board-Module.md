# BIỂU MẪU YÊU CẦU THAY ĐỔI (CHANGE REQUEST FORM) – CR-02

| Trường thông tin | Nội dung chi tiết |
|---|---|
| **Mã yêu cầu thay đổi (Change Request ID)** | **CR-02** |
| **Dự án** | FairShare – Nền tảng đo lường & minh bạch hóa mức đóng góp đồ án nhóm |
| **Người đề xuất** | Nguyễn Văn Minh Triều – M0, PM hệ thống<br>Nguyễn Phúc Vương – M1, Backend/API |
| **Ngày đề xuất** | 29/10/2026 (Sprint 3) |
| **Loại thay đổi** | **Sửa đổi (Modify)** – thay thế cơ chế đồng bộ Trello bằng phân hệ Task Board nội bộ |
| **Trạng thái xử lý** | **Closed – đã phê duyệt, triển khai và kiểm tra đạt (04/11/2026)** |
| **Quyết định phê duyệt** | **Approved – Phê duyệt triển khai trong Sprint 3 (04/11/2026)** |
| **Người phê duyệt** | **Nguyễn Văn Minh Triều – Project Manager (M0), đại diện nhóm phát triển FairShare** |
| **Ngày ra quyết định** | 04/11/2026 |

---

## 1. Nội dung thay đổi & Lý do thay đổi

### 1.1. Nội dung thay đổi
* **Hiện tại:** Kế hoạch ban đầu sử dụng Trello REST API để đồng bộ danh sách bảng, cột, thẻ và hành động của thành viên.
* **Đề xuất sau thay đổi:** Tự xây dựng phân hệ **Task Board nội bộ** (gồm bảng, cột và thẻ) thay thế hoàn toàn Trello API.

### 1.2. Lý do thay đổi
* Qua spike kỹ thuật ở Sprint 2, Trello API bộc lộ các hạn chế nghiêm trọng:
  1. Phụ thuộc dịch vụ bên thứ ba và kết nối mạng ngoài.
  2. **Rate limit nghiêm ngặt** của Trello hạn chế tần suất đồng bộ thời gian thực.
  3. Khó kiểm soát **tính bất biến** của dữ liệu và truy vết sự kiện chống gian lận (người dùng có thể xóa lịch sử hoặc sửa card ngoài hệ thống).
* **Lợi ích dự kiến:** Hệ thống làm chủ hoàn toàn dữ liệu; loại bỏ triệt để rủi ro R02 (phụ thuộc API ngoài).

---

## 2. Yêu cầu, chức năng và tài liệu bị ảnh hưởng

* **Chức năng / module:**
  * Tích hợp Trello API (bị thay thế).
  * Phân hệ **Task Board nội bộ** (mới).
  * Cơ chế ghi nhận sự kiện hoạt động (`activity_events`).
  * `ScoringEngine v1` của M3 (chỉ cần đảm bảo tương thích dữ liệu).
* **Cơ sở dữ liệu:** Flyway migration `V10__create_boards_and_cards.sql`; bảng `boards`, `board_columns`, `cards`; bổ sung nguồn dữ liệu `ActivitySource.BOARD`.
* **Backend:** Package `com.fairshare.board`; REST API `/api/boards` và `/api/cards`.
* **Frontend:** `BoardView.tsx`, `board.api.ts`, cập nhật `TeamDetailPage.tsx` và `router.tsx` (`/teams/:id/board`).
* **Mã định danh liên quan:**
  * **Requirement ID:** `REQ-BOARD-01` đến `REQ-BOARD-07`.
  * **Product Backlog Item ID:** `PBI-23` (Task Board nội bộ), `PBI-24` (Kanban UI), `PBI-25` (Activity logging).
  * **WBS ID:** `3.2.1` (Database migration V10), `3.2.2` (Backend - package board), `3.2.3` (Frontend - BoardView).
  * **Use Case:** `UC-BOARD-01` (Tạo bảng), `UC-BOARD-02` (Thêm thẻ), `UC-BOARD-03` (Di chuyển thẻ).
  * **Figma:** Màn hình Kanban Board – Frame `[Board_v1]` trong file Figma FairShare.
  * **Thiết kế CSDL:** `docs/database-erd.md` (bảng `boards`, `board_columns`, `cards`).
  * **Kế hoạch kiểm thử:** `docs/qa/test-cases-sprint3.md` (`TC-BOARD-01`..`10`).

---

## 3. Tác động đến phạm vi & Tiêu chí nghiệm thu

### 3.1. Tác động đến phạm vi
* **Thêm:** Phân hệ Task Board nội bộ – CRUD bảng, cột (`To Do`, `In Progress`, `Review`, `Done`...) và thẻ (người phụ trách, Story Points, hạn chót, vị trí sắp xếp); giao diện Kanban; ghi nhận sự kiện `BOARD` tự động.
* **Loại bỏ:** Đồng bộ dữ liệu bảng, cột, thẻ qua Trello REST API.
* **Làm lại / hoàn thiện:** Chức năng kéo thả nâng cao tiếp tục hoàn thiện ở Sprint 4.

### 3.2. Tiêu chí nghiệm thu
1. API `/api/boards` trả về đúng cấu trúc JSON (`board` + `columns` + `cards`).
2. Tạo bảng mới tự động sinh đủ 4 cột mặc định: `To Do`, `In Progress`, `Review`, `Done`.
3. Di chuyển thẻ ghi `ActivityEvent` với `CARD_MOVED`, `is_on_time` và `delay_days` chính xác.
4. Hoàn thành thẻ (`Done`) ghi `ActivityEvent` `CARD_COMPLETED`.
5. Giao diện Kanban hiển thị đúng cột, thẻ, Story Points và nút di chuyển.
6. Toàn bộ unit test `BoardServiceTest` (3/3) và `BoardView.test.tsx` (2/2) **PASS**.

---

## 4. Tác động đến tiến độ, công sức & kỹ thuật

### 4.1. Tiến độ và công sức
* **Tiến độ:** Khung cơ bản đã hoàn thành trong Sprint 3; phần kéo thả nâng cao hoàn thiện ở Sprint 4.
  * Tăng thêm **+3 ngày công** trong Sprint 3 (29/10 – 03/11/2026).
  * Milestone `M1-Backend` (deadline 03/11) hoàn thành đúng hạn.
  * Tính năng kéo thả nâng cao dời sang Sprint 4 (Milestone `M1-Sprint4`).
* **Công sức:**
  * Phát sinh công việc xây dựng phân hệ Board (CSDL, Backend, Frontend) thay cho tích hợp Trello; rủi ro R19 (Khối lượng công việc M1) đã được phân rã.
  * Nhân sự chính: M1 (Backend/API), M0 (PM/Review).
  * **Tăng thêm:** +12 giờ công (M1 - Backend/API: 8h; M0 - PM/Review: 4h).
  * **Giảm:** -2h tích hợp Trello API không cần thực hiện nữa.
  * **Net tăng:** **+10 giờ công** trong Sprint 3.

### 4.2. Tác động kỹ thuật và rủi ro
* **Cơ sở dữ liệu:** Thêm 3 bảng mới qua Flyway migration `V10`; bổ sung nguồn dữ liệu `ActivitySource.BOARD`.
* **Backend/API:** Thêm các Entity, Repository, `BoardService` và endpoint `/api/boards`; ghi `activity_events` (`CARD_CREATED`, `CARD_MOVED`, `CARD_COMPLETED`) kèm `delay_days` và `is_on_time`.
* **Giao diện:** Thêm `BoardView.tsx`, `board.api.ts`; cập nhật điều hướng và router.
* **Tương thích:** Dữ liệu từ Board hoàn toàn tương thích với mô hình `ActivityEvent` và thuật toán `ScoringEngine v1` của M3.
* **Rủi ro:**
  * **R02 (Phụ thuộc API ngoài):** Đã được giải quyết triệt để.
  * **R19 (Khối lượng công việc M1):** Đã phân rã, phần kéo thả nâng cao tiếp tục ở Sprint 4.

---

## 5. Phương án thực hiện đề xuất

* **Cơ sở dữ liệu:** Bổ sung Flyway migration `V10__create_boards_and_cards.sql` gồm `boards` (gắn với `teams`), `board_columns`, `cards`; bổ sung `ActivitySource.BOARD`.
* **Backend (Spring Boot):** Tạo package `com.fairshare.board` gồm Entities (`Board`, `BoardColumn`, `Card`), Repositories (`BoardRepository`, `BoardColumnRepository`, `CardRepository`) và `BoardService` thực hiện toàn bộ nghiệp vụ CRUD. Khi tạo hoặc di chuyển thẻ, tự động ghi vào `activity_events` với nguồn `BOARD`. Cung cấp REST API `/api/boards` (tạo bảng, cột, thẻ và di chuyển thẻ).
* **Frontend (React + Vite):** Thêm `BoardView.tsx` (giao diện Kanban: thêm thẻ, phân công thành viên, gán Story Points, di chuyển thẻ) và `board.api.ts`; cập nhật `TeamDetailPage.tsx` và `router.tsx` (`/teams/:id/board`).
* **Kiểm soát tác động:** Giữ tương thích với `ActivityEvent` và `ScoringEngine v1`; hoàn thiện kéo thả nâng cao ở Sprint 4.

---

## 6. Kết quả đánh giá tác động & Phê duyệt

* **Rủi ro R02:** Đã được giải quyết triệt để do hệ thống làm chủ hoàn toàn dữ liệu.
* **Rủi ro R19:** Đã phân rã và hoàn thành khung cơ bản trong Sprint 3; phần kéo thả nâng cao tiếp tục ở Sprint 4.
* **Tính tương thích:** Dữ liệu từ Board tương thích với `ActivityEvent` và `ScoringEngine v1`.
* **Kiểm tra của PCG:** Đã kiểm tra ngày 04/11/2026 – hồ sơ đầy đủ, hợp lý và nhất quán với thiết kế hệ thống.
* **Minh chứng và liên kết tài liệu:**
  * Tài liệu nguồn: `docs/CR02-Internal-Board-Module.md`
  * Flyway migration: `V10__create_boards_and_cards.sql`
  * WBS cập nhật: `plan-PM.md` (phiên bản 04/11/2026)
  * Product Backlog: `PBI-23`, `PBI-24`, `PBI-25` chuyển sang trạng thái Done
  * Tài liệu cập nhật: `docs/sprint3.md` (Sprint Review), `README.md`
