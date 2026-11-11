-- =============================================================================
-- BỘ DỮ LIỆU MẪU CHUẨN HOÁ CHO TÀI KHOẢN DEMO (FAIRSHARE DEMO DATASET)
-- Dự án: EduConnect — Nền tảng Học tập & Trao đổi Sinh viên
-- =============================================================================

-- 1. Dọn dẹp dữ liệu rác cũ trong DB (Giữ lại tài khoản thực của người dùng test02)
DROP TRIGGER IF EXISTS trg_before_activity_events_delete;

DELETE FROM alerts WHERE team_id = 1 OR team_id = 2;
DELETE FROM activity_events WHERE team_id = 1 OR team_id = 2;
DELETE FROM cards WHERE board_id IN (1, 2);
DELETE FROM board_columns WHERE board_id IN (1, 2);
DELETE FROM boards WHERE id IN (1, 2);
DELETE FROM review_submissions WHERE review_round_id IN (SELECT id FROM review_rounds WHERE team_id IN (1, 2));
DELETE FROM review_rounds WHERE team_id IN (1, 2);
DELETE FROM manual_contributions WHERE team_id IN (1, 2);
DELETE FROM consents WHERE team_id IN (1, 2);
DELETE FROM team_members WHERE team_id IN (1, 2);
DELETE FROM sprints WHERE team_id IN (1, 2);
DELETE FROM teams WHERE id IN (1, 2);

-- Xoá các user rác cũ (chỉ giữ lại user thật 105, 108 và tạo bộ demo mới)
DELETE FROM users WHERE email IN (
  'phucngo@ueh.edu.vn', 'trieu@ueh.edu.vn', 'testphuc@ueh.edu.vn',
  'phuc.31241020074@st.ueh.edu.vn', 'student.fresh2026@ueh.edu.vn',
  'leader@fairshare.local', 'm1.vuong@fairshare.local', 'm2.thien@fairshare.local',
  'm3.phuc@fairshare.local', 'm4.khang@fairshare.local', 'm5.namanh@fairshare.local'
);

-- 2. Tạo 5 tài khoản thành viên nhóm Demo với mật khẩu chuẩn Demo@12345
INSERT INTO users (id, email, password, full_name) VALUES
(109, 'demo@fairshare.io', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Nguyễn Hoàng Nam (Trưởng nhóm Demo)')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password = VALUES(password);

INSERT INTO users (id, email, password, full_name) VALUES
(110, 'trang.tran@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Trần Thu Trang (Frontend & UI/UX)')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password = VALUES(password);

INSERT INTO users (id, email, password, full_name) VALUES
(111, 'bao.le@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Lê Quốc Bảo (Backend & Database)')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password = VALUES(password);

INSERT INTO users (id, email, password, full_name) VALUES
(112, 'duc.pham@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Phạm Minh Đức (DevOps & Cloud)')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password = VALUES(password);

INSERT INTO users (id, email, password, full_name) VALUES
(113, 'vy.dang@edu.vn', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Đặng Thảo Vy (QA & Technical Writer)')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password = VALUES(password);

-- 3. Tạo Dự án Demo (Team 1)
INSERT INTO teams (id, name, course_name, description, invite_code) VALUES
(1, 'EduConnect — Nền tảng Học tập & Trao đổi Sinh viên', 'Quản lý Dự án Công nghệ Thông tin', 'Hệ thống hỗ trợ học tập nhóm, quản lý tiến độ Kanban, đo lường đóng góp đa chiều và đánh giá chéo minh bạch.', 'FS-EDU-2026')
ON DUPLICATE KEY UPDATE name = VALUES(name), course_name = VALUES(course_name), description = VALUES(description), invite_code = VALUES(invite_code);

-- 4. Gán 5 thành viên vào Team 1
INSERT INTO team_members (id, team_id, user_id, role) VALUES
(1, 1, 109, 'LEADER'),
(2, 1, 110, 'MEMBER'),
(3, 1, 111, 'MEMBER'),
(4, 1, 112, 'MEMBER'),
(5, 1, 113, 'MEMBER')
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- Ghi nhận Consent Nghị định 13
INSERT INTO consents (team_id, user_id, agreed, agreed_at) VALUES
(1, 109, 1, '2026-10-15 08:00:00'),
(1, 110, 1, '2026-10-15 08:30:00'),
(1, 111, 1, '2026-10-15 09:00:00'),
(1, 112, 1, '2026-10-15 09:30:00'),
(1, 113, 1, '2026-10-15 10:00:00')
ON DUPLICATE KEY UPDATE agreed = VALUES(agreed);

-- 5. Tạo 3 Sprints cho Team 1
INSERT INTO sprints (id, team_id, name, start_date, end_date, status) VALUES
(1, 1, 'Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', '2026-10-15', '2026-10-28', 'CLOSED'),
(2, 1, 'Sprint 2 - Phát triển Tính năng & Tích hợp API', '2026-10-29', '2026-11-12', 'ACTIVE'),
(3, 1, 'Sprint 3 - Kiểm thử Tích hợp & Đóng gói', '2026-11-13', '2026-11-27', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- 6. Tạo Kanban Board & 4 Cột chuẩn cho Team 1
INSERT INTO boards (id, team_id, name, description) VALUES
(1, 1, 'EduConnect Kanban Board', 'Bảng theo dõi tiến độ công việc và hoạt động của dự án EduConnect')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO board_columns (id, board_id, name, position) VALUES
(1, 1, 'To Do', 0),
(2, 1, 'In Progress', 1),
(3, 1, 'Review', 2),
(4, 1, 'Done', 3)
ON DUPLICATE KEY UPDATE name = VALUES(name), position = VALUES(position);

-- 7. Tạo danh sách thẻ công việc (Cards) trải đều 4 cột
INSERT INTO cards (id, board_id, column_id, title, description, assignee_id, story_points, difficulty_level, position, due_date) VALUES
-- To Do (Cột 1)
(101, 1, 1, 'Tích hợp cổng thanh toán VNPay Sandbox', 'Kết nối API thanh toán học phí tài liệu và tạo webhook phản hồi IPN', 111, 3.0, 3, 0, '2026-11-15 18:00:00'),
(102, 1, 1, 'Tối ưu hóa ảnh tài liệu với Cloudinary CDN', 'Nén ảnh bài viết tự động và phân phối qua CDN giảm tải server', 112, 2.0, 2, 1, '2026-11-16 18:00:00'),

-- In Progress (Cột 2)
(103, 1, 2, 'Giao diện đọc tài liệu PDF và highlight nội dung', 'Xây dựng component viewer bằng PDF.js hỗ trợ đánh dấu trang và ghi chú', 110, 5.0, 3, 0, '2026-11-12 23:59:00'),
(104, 1, 2, 'Cấu hình Redis Cache cho danh mục môn học', 'Lưu cache danh sách môn học và tài liệu thịnh hành TTL 15 phút', 112, 3.0, 2, 1, '2026-11-13 18:00:00'),

-- Review (Cột 3)
(105, 1, 3, 'Đặc tả API phân quyền RBAC & middleware JWT', 'Hoàn tất phân quyền Leader, Member và viết unit tests cho Spring Security', 111, 3.0, 3, 0, '2026-11-11 20:00:00'),
(106, 1, 3, 'Kiểm thử tự động luồng đăng ký & gia nhập nhóm', 'Viết test suite Playwright kiểm tra luồng tạo mã mời và tham gia dự án', 113, 2.0, 2, 1, '2026-11-11 22:00:00'),

-- Done (Cột 4)
(107, 1, 4, 'Thiết kế wireframe Figma 12 màn hình người dùng', 'Hoàn thiện bản vẽ UI/UX chuẩn phong cách Linear, thiết kế Dark mode', 110, 5.0, 2, 0, '2026-11-05 18:00:00'),
(108, 1, 4, 'Thiết kế CSDL MariaDB & viết Flyway migrations', 'Xây dựng 15 bảng cơ sở dữ liệu và tối ưu index phục vụ truy vấn đối soát', 111, 5.0, 3, 1, '2026-11-06 18:00:00'),
(109, 1, 4, 'Khởi tạo pipeline CI/CD GitHub Actions', 'Thiết lập workflow build, test và scan bảo mật tự động trên GitHub PR', 112, 3.0, 2, 2, '2026-11-07 18:00:00'),
(110, 1, 4, 'Xây dựng tài liệu đặc tả yêu cầu phần mềm SRS v1.0', 'Soạn thảo tài liệu đặc tả ca sử dụng, ma trận RACI và tiêu chí DoD', 113, 3.0, 1, 3, '2026-11-08 18:00:00'),
(111, 1, 4, 'Triển khai kiến trúc dịch vụ Backend Spring Boot 3', 'Cấu hình khung dự án, tầng Controller, Service, DTO và Exception Handler', 109, 5.0, 3, 4, '2026-11-09 18:00:00')
ON DUPLICATE KEY UPDATE title = VALUES(title), column_id = VALUES(column_id), assignee_id = VALUES(assignee_id), story_points = VALUES(story_points);

-- 8. Tạo ActivityEvents minh chứng tính điểm đóng góp đa chiều cho Sprint 2
INSERT INTO activity_events (team_id, sprint_id, user_id, source, event_type, details, occurred_at, calculated_score, story_points, difficulty_level, delay_days, is_on_time) VALUES
(1, 2, 109, 'BOARD', 'CARD_COMPLETED', 'Triển khai kiến trúc dịch vụ Backend Spring Boot 3', '2026-11-09 16:30:00', 5.0, 5.0, 3, 0.0, 1),
(1, 2, 109, 'GIT', 'GIT_COMMIT', 'feat(core): setup multi-tier security filter chain and jwt interceptor', '2026-11-09 17:00:00', 4.0, 4.0, 2, 0.0, 1),
(1, 2, 109, 'BOARD', 'COMMENT_HELPFUL', 'Code review và giải đáp thắc mắc API cho team', '2026-11-10 10:00:00', 1.0, 1.0, 1, 0.0, 1),

(1, 2, 110, 'BOARD', 'CARD_COMPLETED', 'Thiết kế wireframe Figma 12 màn hình người dùng', '2026-11-05 17:00:00', 5.0, 5.0, 2, 0.0, 1),
(1, 2, 110, 'GIT', 'GIT_COMMIT', 'feat(ui): add PDF document reader component with high-contrast theme', '2026-11-08 14:00:00', 4.5, 4.0, 2, 0.0, 1),
(1, 2, 110, 'BOARD', 'CARD_MOVED', 'Cập nhật tiến độ giao diện đọc tài liệu PDF', '2026-11-10 11:00:00', 1.5, 1.0, 1, 0.0, 1),

(1, 2, 111, 'BOARD', 'CARD_COMPLETED', 'Thiết kế CSDL MariaDB & viết Flyway migrations', '2026-11-06 17:30:00', 5.0, 5.0, 3, 0.0, 1),
(1, 2, 111, 'GIT', 'GIT_COMMIT', 'feat(db): add indexes on activity_events and scoring view procedures', '2026-11-07 15:00:00', 4.0, 4.0, 2, 0.0, 1),
(1, 2, 111, 'BOARD', 'COMMENT_HELPFUL', 'Hướng dẫn team migrate cấu trúc bảng mới', '2026-11-09 09:30:00', 1.0, 1.0, 1, 0.0, 1),

(1, 2, 112, 'BOARD', 'CARD_COMPLETED', 'Khởi tạo pipeline CI/CD GitHub Actions', '2026-11-07 16:00:00', 3.0, 3.0, 2, 0.0, 1),
(1, 2, 112, 'GIT', 'GIT_COMMIT', 'ci: configure automated vitest and maven test runners with cache', '2026-11-08 11:00:00', 3.5, 3.0, 2, 0.0, 1),
(1, 2, 112, 'BOARD', 'CARD_MOVED', 'Cấu hình xong cụm Redis Cache môi trường Staging', '2026-11-10 16:00:00', 1.5, 1.0, 1, 0.0, 1),

(1, 2, 113, 'BOARD', 'CARD_COMPLETED', 'Xây dựng tài liệu đặc tả yêu cầu phần mềm SRS v1.0', '2026-11-08 17:00:00', 3.0, 3.0, 1, 0.0, 1),
(1, 2, 113, 'GIT', 'GIT_COMMIT', 'test(e2e): implement automated registration and role access test suite', '2026-11-09 15:30:00', 3.0, 3.0, 2, 0.0, 1),
(1, 2, 113, 'BOARD', 'COMMENT_HELPFUL', 'Ghi chú kiểm thử chất lượng và báo cáo bug nhỏ', '2026-11-10 14:00:00', 1.0, 1.0, 1, 0.0, 1);

-- 9. Tạo Cảnh báo mẫu cho Team 1
INSERT INTO alerts (id, team_id, user_id, alert_type, severity, message, resolved, created_at) VALUES
(1, 1, 109, 'MILESTONE_PROGRESS', 'INFO', 'Tiến độ Sprint 2 đang đạt 65%, 5/7 thẻ đã hoàn thành hoặc đang review.', 0, '2026-11-10 09:00:00'),
(2, 1, 109, 'ON_TIME_COMPLETION', 'INFO', '100% các thẻ trong đợt được hoàn thành đúng hạn quy định.', 0, '2026-11-10 15:00:00')
ON DUPLICATE KEY UPDATE message = VALUES(message);

-- 10. Tạo Đợt Chấm chéo (Peer Review) cho Sprint 1 và Sprint 2
INSERT INTO review_rounds (id, team_id, sprint_id, name, status, min_submissions_required, start_date, end_date, created_at) VALUES
(1, 1, 1, 'Đánh giá chéo Sprint 1 - Thiết kế Hệ thống & Khung Ứng dụng', 'CLOSED', 3, '2026-10-20 08:00:00', '2026-10-27 23:59:59', '2026-10-20 08:00:00'),
(2, 1, 2, 'Đánh giá chéo Sprint 2 - Phát triển Tính năng & Tích hợp API', 'OPEN', 3, '2026-11-03 08:00:00', '2026-11-17 23:59:59', '2026-11-03 08:00:00')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

-- 10b. Đánh giá chéo mẫu cho Sprint 1 (Đã hoàn thành và đủ điều kiện ẩn danh Nghị định 13)
INSERT INTO review_submissions (review_round_id, reviewer_id, reviewee_id, criterion, score, feedback) VALUES
(1, 110, 109, 'QUALITY', 5, 'Trưởng nhóm định hướng kiến trúc rất tốt, phân chia công việc rõ ràng và hỗ trợ nhiệt tình.'),
(1, 110, 109, 'PUNCTUALITY', 5, 'Trưởng nhóm định hướng kiến trúc rất tốt, phân chia công việc rõ ràng và hỗ trợ nhiệt tình.'),
(1, 110, 109, 'COOPERATION', 5, 'Trưởng nhóm định hướng kiến trúc rất tốt, phân chia công việc rõ ràng và hỗ trợ nhiệt tình.'),
(1, 111, 109, 'QUALITY', 4, 'Code review cẩn thận, giúp nhóm kịp thời phát hiện lỗi transaction database.'),
(1, 111, 109, 'PUNCTUALITY', 5, 'Code review cẩn thận, giúp nhóm kịp thời phát hiện lỗi transaction database.'),
(1, 111, 109, 'COOPERATION', 5, 'Code review cẩn thận, giúp nhóm kịp thời phát hiện lỗi transaction database.'),
(1, 112, 109, 'QUALITY', 5, 'Chủ động phối hợp cấu hình Docker và pipeline CI/CD, tinh thần trách nhiệm cao.'),
(1, 112, 109, 'PUNCTUALITY', 4, 'Chủ động phối hợp cấu hình Docker và pipeline CI/CD, tinh thần trách nhiệm cao.'),
(1, 112, 109, 'COOPERATION', 5, 'Chủ động phối hợp cấu hình Docker và pipeline CI/CD, tinh thần trách nhiệm cao.'),
(1, 109, 110, 'QUALITY', 5, 'Giao diện thiết kế theo Design System rất chỉn chu, responsive tốt trên mobile.'),
(1, 109, 110, 'PUNCTUALITY', 5, 'Giao diện thiết kế theo Design System rất chỉn chu, responsive tốt trên mobile.'),
(1, 109, 110, 'COOPERATION', 5, 'Giao diện thiết kế theo Design System rất chỉn chu, responsive tốt trên mobile.'),
(1, 111, 110, 'QUALITY', 4, 'Tích hợp API nhanh chóng, phối hợp ăn ý với nhóm backend khi xử lý lỗi state.'),
(1, 111, 110, 'PUNCTUALITY', 4, 'Tích hợp API nhanh chóng, phối hợp ăn ý với nhóm backend khi xử lý lỗi state.'),
(1, 111, 110, 'COOPERATION', 5, 'Tích hợp API nhanh chóng, phối hợp ăn ý với nhóm backend khi xử lý lỗi state.'),
(1, 113, 110, 'QUALITY', 5, 'Sửa lỗi UI phát hiện trong lúc test rất nhanh nhẹn và đúng deadline.'),
(1, 113, 110, 'PUNCTUALITY', 5, 'Sửa lỗi UI phát hiện trong lúc test rất nhanh nhẹn và đúng deadline.'),
(1, 113, 110, 'COOPERATION', 5, 'Sửa lỗi UI phát hiện trong lúc test rất nhanh nhẹn và đúng deadline.')
ON DUPLICATE KEY UPDATE score=VALUES(score);

-- 11. Tạo Đóng góp thủ công chờ duyệt (Pending Manual Contributions)
INSERT INTO manual_contributions (id, team_id, sprint_id, user_id, task_name, evidence_link, story_points, status, created_at, updated_at) VALUES
(1, 1, 2, 110, 'Thiết kế bộ UI Kit & Design System Figma cho phân hệ Dashboard', 'https://figma.com/file/educonnect-ui-system', 3.0, 'PENDING', '2026-11-09 10:00:00', '2026-11-09 10:00:00'),
(2, 1, 2, 111, 'Xây dựng tài liệu kiến trúc CSDL & sơ đồ ERD mở rộng', 'https://docs.google.com/document/d/educonnect-erd-specs', 2.5, 'PENDING', '2026-11-08 15:30:00', '2026-11-08 15:30:00')
ON DUPLICATE KEY UPDATE task_name = VALUES(task_name), status = VALUES(status);

-- 12. Khôi phục trigger tính bất biến cho activity_events
DELIMITER $$
CREATE TRIGGER trg_before_activity_events_delete
BEFORE DELETE ON activity_events
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ActivityEvent log is immutable: DELETE is not allowed on activity_events';
END$$
DELIMITER ;

