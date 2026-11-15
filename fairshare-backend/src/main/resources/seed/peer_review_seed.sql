-- =============================================================================
-- BỘ SEED DỮ LIỆU KIỂM THỬ TÍNH NĂNG CHẤM CHÉO (PEER REVIEW)
-- Tự do thực thi trong HeidiSQL / DBeaver / MySQL Workbench
-- =============================================================================

-- 1. Đảm bảo 5 tài khoản thành viên (Mật khẩu: Demo@12345)
INSERT INTO users (id, email, password, full_name, created_at, updated_at) VALUES
(109, 'demo@fairshare.io', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Nguyễn Hoàng Nam (Trưởng nhóm)', NOW(), NOW()),
(110, 'trang.tran@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Trần Thu Trang (Frontend Dev)', NOW(), NOW()),
(111, 'bao.le@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Lê Quốc Bảo (Backend Dev)', NOW(), NOW()),
(112, 'duc.pham@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Phạm Minh Đức (DevOps)', NOW(), NOW()),
(113, 'vy.dang@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Đặng Thảo Vy (QA Engineer)', NOW(), NOW())
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- 2. Đảm bảo Team 1
INSERT INTO teams (id, name, course_name, description, invite_code, created_at, updated_at) VALUES
(1, 'EduConnect — Nền tảng Học tập & Trao đổi Sinh viên', 'Quản lý Dự án Công nghệ Thông tin', 'Hệ thống hỗ trợ học tập nhóm, quản lý tiến độ Kanban, đo lường đóng góp đa chiều và đánh giá chéo minh bạch.', 'FS-EDU-2026', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. Thành viên Team 1
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at) VALUES
(1, 1, 109, 'LEADER', NOW(), NOW()),
(2, 1, 110, 'MEMBER', NOW(), NOW()),
(3, 1, 111, 'MEMBER', NOW(), NOW()),
(4, 1, 112, 'MEMBER', NOW(), NOW()),
(5, 1, 113, 'MEMBER', NOW(), NOW())
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- 4. Sprints
INSERT INTO sprints (id, team_id, name, start_date, end_date, status, created_at, updated_at) VALUES
(1, 1, 'Sprint 1 - Thiết kế Kiến trúc & UI Kit', '2026-10-15', '2026-10-28', 'CLOSED', NOW(), NOW()),
(2, 1, 'Sprint 2 - Phát triển Tính năng & Tích hợp API', '2026-10-29', '2026-11-12', 'ACTIVE', NOW(), NOW()),
(3, 1, 'Sprint 3 - Hoàn thiện MVP & UI Chấm chéo', '2026-11-13', '2026-11-27', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- 5. Bảng & Cột Kanban
INSERT INTO boards (id, team_id, name, description, created_at, updated_at) VALUES
(1, 1, 'EduConnect Kanban Board', 'Bảng theo dõi tiến độ công việc và hoạt động của dự án EduConnect', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO board_columns (id, board_id, name, position, created_at, updated_at) VALUES
(1, 1, 'To Do', 0, NOW(), NOW()),
(2, 1, 'In Progress', 1, NOW(), NOW()),
(3, 1, 'Review', 2, NOW(), NOW()),
(4, 1, 'Done', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), position = VALUES(position);

-- 6. Thẻ hoàn thành (Done Cards)
INSERT INTO cards (id, board_id, column_id, title, description, assignee_id, story_points, difficulty_level, position, due_date, created_at, updated_at) VALUES
(107, 1, 4, 'Thiết kế wireframe Figma 12 màn hình người dùng', 'Hoàn thiện bản vẽ UI/UX chuẩn phong cách Linear, thiết kế Dark mode', 110, 5.0, 2, 0, '2026-11-05 18:00:00', NOW(), NOW()),
(108, 1, 4, 'Thiết kế CSDL MariaDB & viết Flyway migrations', 'Xây dựng 15 bảng cơ sở dữ liệu và tối ưu index phục vụ truy vấn đối soát', 111, 5.0, 3, 1, '2026-11-06 18:00:00', NOW(), NOW()),
(109, 1, 4, 'Khởi tạo pipeline CI/CD GitHub Actions', 'Thiết lập workflow build, test và scan bảo mật tự động trên GitHub PR', 112, 3.0, 2, 2, '2026-11-07 18:00:00', NOW(), NOW()),
(110, 1, 4, 'Xây dựng tài liệu đặc tả yêu cầu phần mềm SRS v1.0', 'Soạn thảo tài liệu đặc tả ca sử dụng, ma trận RACI và tiêu chí DoD', 113, 3.0, 1, 3, '2026-11-08 18:00:00', NOW(), NOW()),
(111, 1, 4, 'Triển khai kiến trúc dịch vụ Backend Spring Boot 3', 'Cấu hình khung dự án, tầng Controller, Service, DTO và Exception Handler', 109, 5.0, 3, 4, '2026-11-09 18:00:00', NOW(), NOW()),
(112, 1, 4, 'Xây dựng module Chấm chéo đồng đội Peer Review đa chiều', 'Giao diện đánh giá đa chiều với thanh trượt 1-5 sao và chế độ ẩn danh K-Anonymity', 110, 5.0, 3, 5, '2026-11-14 18:00:00', NOW(), NOW()),
(113, 1, 4, 'Tối ưu hóa hiệu năng API và bảo vệ ẩn danh', 'Tối ưu truy vấn SQL kết hợp thuật toán che giấu danh tính người đánh giá', 111, 3.0, 2, 6, '2026-11-15 18:00:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title), column_id = VALUES(column_id), assignee_id = VALUES(assignee_id);

-- 7. Các đợt chấm chéo
INSERT INTO review_rounds (id, team_id, sprint_id, name, status, min_submissions_required, start_date, end_date, created_at, updated_at) VALUES
(1, 1, 1, 'Đợt chấm chéo Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', 'CLOSED', 3, '2026-10-20 08:00:00', '2026-10-27 23:59:59', NOW(), NOW()),
(2, 1, 2, 'Đợt chấm chéo Sprint 2 - Phát triển Tính năng & Tích hợp API', 'OPEN', 3, '2026-11-03 08:00:00', '2026-11-17 23:59:59', NOW(), NOW()),
(3, 1, 3, 'Đợt chấm chéo Sprint 3 (Final) - Hoàn thiện MVP & UI Chấm chéo', 'OPEN', 3, '2026-11-13 08:00:00', '2026-11-27 23:59:59', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- 8. Phiếu đánh giá chi tiết
DELETE FROM review_submissions WHERE review_round_id IN (2, 3);

INSERT INTO review_submissions (review_round_id, reviewer_id, reviewee_id, criterion, score, feedback, card_id, likes_count, created_at, updated_at) VALUES
-- Đợt 2: Chấm cho 109 (Trưởng nhóm)
(2, 110, 109, 'QUALITY', 5, 'Trưởng nhóm định hướng kiến trúc rất tốt, phân chia công việc rõ ràng và hỗ trợ nhiệt tình trong suốt sprint.', 111, 8, '2026-11-10 10:30:00', NOW()),
(2, 110, 109, 'PUNCTUALITY', 5, 'Trưởng nhóm định hướng kiến trúc rất tốt, phân chia công việc rõ ràng và hỗ trợ nhiệt tình trong suốt sprint.', 111, 8, '2026-11-10 10:30:00', NOW()),
(2, 110, 109, 'COOPERATION', 5, 'Trưởng nhóm định hướng kiến trúc rất tốt, phân chia công việc rõ ràng và hỗ trợ nhiệt tình trong suốt sprint.', 111, 8, '2026-11-10 10:30:00', NOW()),

(2, 111, 109, 'QUALITY', 5, 'Code review cẩn thận, phát hiện sớm các issue concurrency và transaction trong service.', 108, 5, '2026-11-11 14:15:00', NOW()),
(2, 111, 109, 'PUNCTUALITY', 4, 'Code review cẩn thận, phát hiện sớm các issue concurrency và transaction trong service.', 108, 5, '2026-11-11 14:15:00', NOW()),
(2, 111, 109, 'COOPERATION', 5, 'Code review cẩn thận, phát hiện sớm các issue concurrency và transaction trong service.', 108, 5, '2026-11-11 14:15:00', NOW()),

(2, 112, 109, 'QUALITY', 4, 'Chủ động cấu hình Docker và pipeline CI/CD, giải quyết blocker hạ tầng rất nhanh chóng.', 109, 7, '2026-11-12 09:45:00', NOW()),
(2, 112, 109, 'PUNCTUALITY', 5, 'Chủ động cấu hình Docker và pipeline CI/CD, giải quyết blocker hạ tầng rất nhanh chóng.', 109, 7, '2026-11-12 09:45:00', NOW()),
(2, 112, 109, 'COOPERATION', 5, 'Chủ động cấu hình Docker và pipeline CI/CD, giải quyết blocker hạ tầng rất nhanh chóng.', 109, 7, '2026-11-12 09:45:00', NOW()),

(2, 113, 109, 'QUALITY', 5, 'Luôn sẵn sàng giải thích logic nghiệp vụ cho QA kiểm thử, tài liệu API mô tả rõ ràng.', 110, 3, '2026-11-12 16:20:00', NOW()),
(2, 113, 109, 'PUNCTUALITY', 5, 'Luôn sẵn sàng giải thích logic nghiệp vụ cho QA kiểm thử, tài liệu API mô tả rõ ràng.', 110, 3, '2026-11-12 16:20:00', NOW()),
(2, 113, 109, 'COOPERATION', 4, 'Luôn sẵn sàng giải thích logic nghiệp vụ cho QA kiểm thử, tài liệu API mô tả rõ ràng.', 110, 3, '2026-11-12 16:20:00', NOW()),

-- Đợt 2: Chấm cho 110 (Trần Thu Trang - Frontend)
(2, 109, 110, 'QUALITY', 5, 'Giao diện màn hình Chấm chéo và Dashboard làm theo chuẩn Figma rất mượt mà, responsive tốt trên mọi màn hình.', 107, 12, '2026-11-10 11:00:00', NOW()),
(2, 109, 110, 'PUNCTUALITY', 5, 'Giao diện màn hình Chấm chéo và Dashboard làm theo chuẩn Figma rất mượt mà, responsive tốt trên mọi màn hình.', 107, 12, '2026-11-10 11:00:00', NOW()),
(2, 109, 110, 'COOPERATION', 5, 'Giao diện màn hình Chấm chéo và Dashboard làm theo chuẩn Figma rất mượt mà, responsive tốt trên mọi màn hình.', 107, 12, '2026-11-10 11:00:00', NOW()),

(2, 111, 110, 'QUALITY', 5, 'Tích hợp API trơn tru, xử lý state và toast thông báo lỗi rất tinh tế, không làm vỡ giao diện.', 112, 6, '2026-11-11 15:30:00', NOW()),
(2, 111, 110, 'PUNCTUALITY', 4, 'Tích hợp API trơn tru, xử lý state và toast thông báo lỗi rất tinh tế, không làm vỡ giao diện.', 112, 6, '2026-11-11 15:30:00', NOW()),
(2, 111, 110, 'COOPERATION', 5, 'Tích hợp API trơn tru, xử lý state và toast thông báo lỗi rất tinh tế, không làm vỡ giao diện.', 112, 6, '2026-11-11 15:30:00', NOW()),

-- Đợt 2: Chấm cho 111 (Lê Quốc Bảo - Backend)
(2, 109, 111, 'QUALITY', 5, 'Thiết kế CSDL tối ưu, viết các stored procedure và view tính điểm đa chiều chuẩn xác.', 108, 9, '2026-11-10 11:30:00', NOW()),
(2, 109, 111, 'PUNCTUALITY', 5, 'Thiết kế CSDL tối ưu, viết các stored procedure và view tính điểm đa chiều chuẩn xác.', 108, 9, '2026-11-10 11:30:00', NOW()),
(2, 109, 111, 'COOPERATION', 5, 'Thiết kế CSDL tối ưu, viết các stored procedure và view tính điểm đa chiều chuẩn xác.', 108, 9, '2026-11-10 11:30:00', NOW()),

(2, 110, 111, 'QUALITY', 4, 'Viết API RESTful tài liệu Swagger chi tiết, response time dưới 100ms.', 113, 8, '2026-11-11 16:00:00', NOW()),
(2, 110, 111, 'PUNCTUALITY', 5, 'Viết API RESTful tài liệu Swagger chi tiết, response time dưới 100ms.', 113, 8, '2026-11-11 16:00:00', NOW()),
(2, 110, 111, 'COOPERATION', 4, 'Viết API RESTful tài liệu Swagger chi tiết, response time dưới 100ms.', 113, 8, '2026-11-11 16:00:00', NOW()),

-- Đợt 3: Chấm cho 109 (Trưởng nhóm)
(3, 110, 109, 'QUALITY', 5, 'Sprint cuối phối hợp chốt tính năng rất đúng tiến độ, quản lý rủi ro tốt.', 111, 4, '2026-11-14 09:00:00', NOW()),
(3, 110, 109, 'PUNCTUALITY', 5, 'Sprint cuối phối hợp chốt tính năng rất đúng tiến độ, quản lý rủi ro tốt.', 111, 4, '2026-11-14 09:00:00', NOW()),
(3, 110, 109, 'COOPERATION', 5, 'Sprint cuối phối hợp chốt tính năng rất đúng tiến độ, quản lý rủi ro tốt.', 111, 4, '2026-11-14 09:00:00', NOW()),

(3, 111, 109, 'QUALITY', 5, 'Đánh giá đồng đội công bằng, tạo động lực lớn cho toàn bộ anh em trong nhóm.', 113, 6, '2026-11-14 10:15:00', NOW()),
(3, 111, 109, 'PUNCTUALITY', 5, 'Đánh giá đồng đội công bằng, tạo động lực lớn cho toàn bộ anh em trong nhóm.', 113, 6, '2026-11-14 10:15:00', NOW()),
(3, 111, 109, 'COOPERATION', 5, 'Đánh giá đồng đội công bằng, tạo động lực lớn cho toàn bộ anh em trong nhóm.', 113, 6, '2026-11-14 10:15:00', NOW());
